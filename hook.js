#!/usr/bin/env node
// Actual pre-commit check logic, invoked by the `pre-commit` bash entry point.
// Runs checks, prints to the terminal same as before, and also writes a
// structured record of the run to logs/commits.jsonl so the Electron app
// can show commit history/detail locally.
const fs = require("fs");
const path = require("path");
const os = require("os");
const { execSync } = require("child_process");

const HOOKS_DIR = path.join(os.homedir(), ".git-hooks-global");
const LOG_FILE = path.join(HOOKS_DIR, "logs", "commits.jsonl");
const CONFIG_FILE = path.join(HOOKS_DIR, "config.json");

const DEFAULT_CONFIG = {
  version: 1,
  defaultBlocking: true,
  chainRepoLocalHook: false,
  checks: { placeholder: { enabled: true, blocking: false } },
  repoOverrides: {},
};

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

const repoPath = process.argv[2] || process.cwd();

function safeExec(cmd) {
  try {
    return execSync(cmd, { cwd: repoPath, stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

const branch = safeExec("git rev-parse --abbrev-ref HEAD") || "unknown";
const repoRoot = safeExec("git rev-parse --show-toplevel") || repoPath;

const config = loadConfig();
const repoOverride = config.repoOverrides?.[repoRoot]?.checks || {};

function checkSettings(name) {
  return { ...config.checks?.[name], ...repoOverride[name] };
}

// Available checks. Real checks (secrets scanning, etc.) are still an open
// decision, see planning/decisions.md open question #1 — only a placeholder
// exists so far, but each check is gated by config so future checks can be
// enabled/disabled and set blocking/warn-only per-repo without code changes.
const CHECK_DEFS = [{ name: "placeholder", run: () => ({ status: "pass", message: "anurag patel" }) }];

const checks = [];
let shouldBlock = false;

for (const def of CHECK_DEFS) {
  const settings = checkSettings(def.name);
  if (settings.enabled === false) continue;

  const result = def.run();
  const blocking = settings.blocking ?? config.defaultBlocking;
  checks.push({ name: def.name, status: result.status, message: result.message, blocking });

  if (result.status !== "pass" && blocking) shouldBlock = true;
}

for (const check of checks) {
  console.log(check.message);
}

const record = {
  timestamp: new Date().toISOString(),
  repo: repoRoot,
  branch,
  checks,
  status: shouldBlock ? "fail" : "pass",
};

try {
  fs.mkdirSync(path.dirname(LOG_FILE), { recursive: true });
  fs.appendFileSync(LOG_FILE, JSON.stringify(record) + "\n");
} catch (err) {
  console.error(`[git-handler-hook] failed to write log: ${err.message}`);
}

process.exit(shouldBlock ? 1 : 0);
