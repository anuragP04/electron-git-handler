// Pure file/git logic for installing, uninstalling, and reading state for the
// global git hook. Kept free of Electron APIs so it can run (and be tested)
// under plain Node — main.js wires this up to IPC handlers.
const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

const RESOURCES_DIR = path.join(__dirname, "..", "resources", "hooks");

function paths(hooksDir = path.join(os.homedir(), ".git-hooks-global")) {
  return {
    hooksDir,
    logsDir: path.join(hooksDir, "logs"),
    logFile: path.join(hooksDir, "logs", "commits.jsonl"),
    configFile: path.join(hooksDir, "config.json"),
  };
}

function isInstalled(hooksDir) {
  return fs.existsSync(path.join(paths(hooksDir).hooksDir, "pre-commit"));
}

function getCoreHooksPath() {
  try {
    return execFileSync("git", ["config", "--global", "core.hooksPath"], {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function getStatus(hooksDir) {
  const { hooksDir: dir } = paths(hooksDir);
  const coreHooksPath = getCoreHooksPath();
  return {
    installed: isInstalled(dir),
    hooksDir: dir,
    coreHooksPath,
    active: coreHooksPath === dir,
  };
}

function performInstall(hooksDir) {
  const p = paths(hooksDir);
  fs.mkdirSync(p.hooksDir, { recursive: true });
  fs.mkdirSync(p.logsDir, { recursive: true });

  fs.copyFileSync(path.join(RESOURCES_DIR, "pre-commit"), path.join(p.hooksDir, "pre-commit"));
  fs.copyFileSync(path.join(RESOURCES_DIR, "hook.js"), path.join(p.hooksDir, "hook.js"));
  fs.chmodSync(path.join(p.hooksDir, "pre-commit"), 0o755);

  if (!fs.existsSync(p.configFile)) {
    fs.copyFileSync(path.join(RESOURCES_DIR, "config.default.json"), p.configFile);
  }

  execFileSync("git", ["config", "--global", "core.hooksPath", p.hooksDir]);

  return getStatus(hooksDir);
}

function performUninstall(hooksDir, deleteLogs) {
  const p = paths(hooksDir);

  try {
    execFileSync("git", ["config", "--global", "--unset", "core.hooksPath"]);
  } catch {
    // Already unset — fine.
  }

  for (const file of ["pre-commit", "hook.js", "config.json"]) {
    fs.rmSync(path.join(p.hooksDir, file), { force: true });
  }

  if (deleteLogs) {
    fs.rmSync(p.logsDir, { recursive: true, force: true });
  }

  return getStatus(hooksDir);
}

function readConfig(hooksDir) {
  const p = paths(hooksDir);
  try {
    return JSON.parse(fs.readFileSync(p.configFile, "utf8"));
  } catch {
    return JSON.parse(fs.readFileSync(path.join(RESOURCES_DIR, "config.default.json"), "utf8"));
  }
}

function writeConfig(hooksDir, config) {
  const p = paths(hooksDir);
  fs.mkdirSync(p.hooksDir, { recursive: true });
  fs.writeFileSync(p.configFile, JSON.stringify(config, null, 2));
}

function readHistory(hooksDir, limit = 200) {
  const p = paths(hooksDir);
  if (!fs.existsSync(p.logFile)) return [];

  const records = fs
    .readFileSync(p.logFile, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return records.slice(-limit).reverse();
}

module.exports = {
  RESOURCES_DIR,
  paths,
  isInstalled,
  getCoreHooksPath,
  getStatus,
  performInstall,
  performUninstall,
  readConfig,
  writeConfig,
  readHistory,
};
