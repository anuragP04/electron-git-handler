# Decisions Log: Global Git Hook Manager

Running list of decisions made, with the reasoning and status. See [plan.md](plan.md) for architecture and [checklist.md](checklist.md) for the build-out.

## Settled decisions

| # | Decision | Reasoning | Status |
|---|---|---|---|
| 1 | No per-repo files — nothing added into any individual repo's codebase | User explicitly rejected the per-repo `.git/hooks/pre-commit` approach; wants a machine-wide, repo-agnostic setup | Settled |
| 2 | Mechanism: `git config --global core.hooksPath ~/.git-hooks-global` | Points git at one shared hooks folder for every repo on the machine instead of each repo's own `.git/hooks/` | Settled |
| 3 | Real checks must block the commit (non-zero exit) on failure | Decided early, before the pivot to global hooks; still applies once real checks are added | Settled |
| 4 | Current placeholder just prints `"anurag patel"` and exits 0 | Stub to confirm the global-hook mechanism works before adding real logic | Settled |
| 5 | Wrap everything in a Mac Electron app | User wants a GUI to manage checks, see commit history in detail locally, and install/uninstall without manual scripts | Settled |
| 6 | Electron app does first-launch setup in JS instead of a `.pkg` postinstall script | A plain `.dmg` can't auto-run scripts; a `.pkg` with postinstall scripting is more fragile to build/sign/notarize. First-launch setup in-app gives the same "install and you're set up" feel with far less packaging complexity | Settled (revisit if user wants a true `.pkg` installer later) |
| 7 | Hook and Electron app are decoupled, connected only via files on disk (`config.json` + log store) | The hook must keep working via plain `git commit` even if the app isn't running. Simpler and more robust than live IPC to a possibly-not-running app | Settled |
| 8 | App has an always-visible Uninstall button that removes the hook and unsets `core.hooksPath` | Explicit user request | Settled |
| 9 | Terminal output on commit must also be listed/detailed in the app locally | Explicit user request — hook writes structured records (not just prints) so the app can render history | Settled |
| 10 | Planning docs (`plan.md`, `checklist.md`, `decisions.md`) live together in a `planning/` folder | Explicit user request to group everything | Settled |
| 11 | Hook script language: hybrid — bash entry point, Node for logic | `pre-commit` stays a plain bash file (git only ever looks for that exact filename and it must be directly executable — no way around that), but it's now a thin wrapper that execs `hook.js` (Node) for the actual check logic and structured logging. Gets Node's easier JSON/config handling without giving up the always-executable entry point. Falls back to a graceful skip (exit 0, warning to stderr) if `node` isn't on PATH | Settled |
| 12 | Log store format: JSON lines file | Went with JSONL (`~/.git-hooks-global/logs/commits.jsonl`) to start — simplest to implement and read; can migrate to SQLite later if the Electron app's history view needs richer filter/search than a JSONL scan can give | Settled |
| 13 | Uninstall asks via a checkbox in the native confirm dialog whether to also delete history logs | Resolves open question #2 below. Electron's `dialog.showMessageBox` supports a `checkboxLabel`/`checkboxChecked` option natively, so this didn't need a custom UI — default is unchecked (logs preserved) | Settled |
| 14 | `chainRepoLocalHook` is a real, working feature, not just a config placeholder | Resolves open question #3 below. When enabled (globally or effectively per-repo via the toggle), `hook.js` checks for an executable `<repoRoot>/.git/hooks/pre-commit` and runs it via `spawnSync` with inherited stdio, forwarding its exit code as a blocking check. Verified with a real repo-local hook in three states: chaining off (skipped), on + local hook passes, on + local hook fails (blocks the commit) | Settled |
| 15 | Electron app's install/uninstall/config/history logic lives in a plain Node module (`app/lib/hookManager.js`), separate from `main.js`'s Electron-specific wiring (`app`, `BrowserWindow`, `ipcMain`, `dialog`) | This sandbox can't render Electron's GUI (`ELECTRON_RUN_AS_NODE=1` forces plain-Node mode), so the only way to actually verify install/uninstall/config/history logic — rather than just syntax-check it — was to make it callable under plain Node directly. Also just a cleaner separation of concerns | Settled |
| 16 | Hook payload (`pre-commit`, `hook.js`, `config.default.json`) is bundled into `app/resources/hooks/`, synced from the repo-root copies via `npm run sync-hooks` (also runs automatically before `start`/`dist`) | The packaged `.app` can't reach outside its own bundle at runtime, so the Electron app needs its own copy rather than reading `../pre-commit` relative to the repo. Repo-root files stay the single source of truth for editing; the resources copy is generated, not hand-edited | Settled |

## Deferred / not yet decided

| # | Question | Notes | Status |
|---|---|---|---|
| 1 | Scope of actual security checks (secrets scanning, sensitive file detection, dependency vuln checks, etc.) | User explicitly deferred this early on ("we will discuss that later") — do not assume scope | Open |
| 2 | Additional hook types beyond `pre-commit` (e.g. `pre-push`) | Not yet requested, worth asking once core flow is in place | Open |
| 3 | Distribution signing — waiting on a valid Apple Developer "Developer ID Application" certificate + notarization credentials | This machine only has an **expired** "Apple Development" certificate (fine for local testing, not for distribution). `electron-builder` correctly detected it and skipped signing rather than failing. A real distributable `.dmg` is blocked on the user obtaining valid credentials from their Apple Developer account | Open — blocked on user, not a design question |

## Known caveats (resolved or no longer applicable)
- ~~`core.hooksPath` fully replaces git's default per-repo hook lookup — any repo with its own local `.git/hooks/pre-commit` is silently ignored while the global path is active.~~ **Resolved** by decision #14 (`chainRepoLocalHook`) — when the app's Settings toggle is on, the global hook detects and chain-calls a repo-local hook if one exists, instead of silently skipping it.
