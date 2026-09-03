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
| `pre-commit` | Bash entry point git actually invokes (git only ever looks for this exact filename). Hands off to `hook.js`. |
| `hook.js` | Node script with the real check logic — runs checks per `config.json`, prints to the terminal, and writes a structured record to `~/.git-hooks-global/logs/commits.jsonl`. |
| `config.default.json` | Default settings, seeded to `~/.git-hooks-global/config.json` on first install only. |
| `install.sh` | One-time installer — copies the hook + config into place and sets the global git config. |
| `app/` | The Electron app (in progress) — GUI for install/uninstall, settings, and commit history. See `planning/`. |

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
anurag patel
```

(Requires `node` on PATH — if it's missing, the hook logs a warning and skips checks rather than blocking the commit.)

## Uninstall / disable

```bash
git config --global --unset core.hooksPath
```

This reverts git to using each repo's own local `.git/hooks/` folder as normal.

## Important caveat

`core.hooksPath` fully replaces git's default hook lookup. If any repo already has its own local `.git/hooks/pre-commit`, it will be **ignored** while this global path is active — git only checks one location, not both. Let me know if you want the global hook updated to also chain-call a repo's local hook when one exists.

## Current behavior

Each check is controlled via `~/.git-hooks-global/config.json` (`enabled`, `blocking` per check, plus per-repo overrides under `repoOverrides`). Only a placeholder check exists so far, and it's non-blocking by default since it can't meaningfully fail yet. Real security checks (secrets scanning, sensitive file detection, etc.) are still undecided — see `planning/decisions.md`. Once added, set a check's `blocking` to `true` (globally or per-repo) to make it actually fail the commit.

## Electron app (in progress)

A GUI for managing all of this — install/uninstall, toggling checks, and browsing commit history in detail — lives in `app/`. To run it locally:

```bash
cd app
npm install
npm start
```

See `planning/plan.md`, `planning/checklist.md`, and `planning/decisions.md` for the full design and current build status.
