# Global Git Pre-Commit Hook

A system-level `pre-commit` hook that runs automatically on **every `git commit`, in every repo** on this machine — no per-repo setup, nothing to add to any codebase.

## How it works

Git normally looks for hooks inside each repo's own `.git/hooks/` folder. This setup instead points git at **one shared hooks folder** for your whole machine, using:

```
git config --global core.hooksPath ~/.git-hooks-global
```

Once that's set, `git commit` (in any repo) will always execute `~/.git-hooks-global/pre-commit` before completing the commit.

## Files

| File | Purpose |
|---|---|
| `pre-commit` | The hook script itself. Currently prints `anurag` to the console. |
| `install.sh` | One-time installer — copies the hook into place and sets the global git config. |

## Install

```bash
bash install.sh
```

This will:
1. Create `~/.git-hooks-global/`
2. Copy `pre-commit` into it and make it executable
3. Set `core.hooksPath` globally to that folder

## Verify

```bash
git config --global core.hooksPath
```

Should print:
```
/home/<you>/.git-hooks-global
```

Then, in **any** git repo:

```bash
git commit -m "test"
```

Console output should include:
```
anurag
```

## Uninstall / disable

```bash
git config --global --unset core.hooksPath
```

This reverts git to using each repo's own local `.git/hooks/` folder as normal.

## Important caveat

`core.hooksPath` fully replaces git's default hook lookup. If any repo already has its own local `.git/hooks/pre-commit`, it will be **ignored** while this global path is active — git only checks one location, not both. Let me know if you want the global hook updated to also chain-call a repo's local hook when one exists.

## Current behavior

The hook currently does **not** block commits — it just prints and exits `0`. Blocking logic and real security checks (secrets scanning, sensitive file detection, etc.) can be added into `pre-commit` later; just re-run `install.sh` (or manually re-copy the file) to update the installed version.
