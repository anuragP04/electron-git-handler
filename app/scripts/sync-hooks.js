// Copies the hook payload (pre-commit, hook.js, config.default.json) from the
// repo root into app/resources/hooks, so the Electron app bundles its own
// copy instead of reaching outside the app directory (required once this is
// packaged as a standalone .app). Source of truth stays at the repo root.
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const DEST = path.join(__dirname, "..", "resources", "hooks");

const FILES = ["pre-commit", "hook.js", "config.default.json"];

fs.mkdirSync(DEST, { recursive: true });

for (const file of FILES) {
  fs.copyFileSync(path.join(ROOT, file), path.join(DEST, file));
}

fs.chmodSync(path.join(DEST, "pre-commit"), 0o755);

console.log(`Synced ${FILES.join(", ")} into ${DEST}`);
