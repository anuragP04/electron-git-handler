#!/usr/bin/env bash
# Installs a global git hooks directory that applies to ALL repos on this machine.
set -euo pipefail

HOOKS_DIR="$HOME/.git-hooks-global"
mkdir -p "$HOOKS_DIR"

cp "$(dirname "$0")/pre-commit" "$HOOKS_DIR/pre-commit"
chmod +x "$HOOKS_DIR/pre-commit"

git config --global core.hooksPath "$HOOKS_DIR"

echo "Installed global git hooks at: $HOOKS_DIR"
echo "git config --global core.hooksPath set to: $(git config --global core.hooksPath)"
echo ""
echo "This will now run on 'git commit' in every repo on this machine."
echo ""
echo "NOTE: if any individual repo also has its own .git/hooks/pre-commit,"
echo "that repo's local hook will be ignored while core.hooksPath is set globally"
echo "(core.hooksPath fully replaces the default .git/hooks lookup)."
