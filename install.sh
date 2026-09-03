#!/usr/bin/env bash
# Installs a global git hooks directory that applies to ALL repos on this machine.
set -euo pipefail

HOOKS_DIR="$HOME/.git-hooks-global"
mkdir -p "$HOOKS_DIR"

cp "$(dirname "$0")/pre-commit" "$HOOKS_DIR/pre-commit"
cp "$(dirname "$0")/hook.js" "$HOOKS_DIR/hook.js"
chmod +x "$HOOKS_DIR/pre-commit"

# Only seed config.json on first install — never overwrite a user's existing settings.
if [ ! -f "$HOOKS_DIR/config.json" ]; then
  cp "$(dirname "$0")/config.default.json" "$HOOKS_DIR/config.json"
fi

git config --global core.hooksPath "$HOOKS_DIR"

echo "Installed global git hooks at: $HOOKS_DIR"
echo "git config --global core.hooksPath set to: $(git config --global core.hooksPath)"
echo ""
echo "This will now run on 'git commit' in every repo on this machine."
echo ""
echo "NOTE: if any individual repo also has its own .git/hooks/pre-commit,"
echo "that repo's local hook will be ignored while core.hooksPath is set globally"
echo "(core.hooksPath fully replaces the default .git/hooks lookup)."

if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "WARNING: node not found on PATH. The hook's check logic runs via Node;"
  echo "without it, commits will proceed but checks will be skipped."
fi
