# Decisions Log: Global Git Hook Manager

Running list of decisions made, with the reasoning and status. See [plan.md](plan.md) for architecture and [checklist.md](checklist.md) for the build-out.

## Settled decisions

| # | Decision | Reasoning | Status |
|---|---|---|---|
| 1 | No per-repo files — nothing added into any individual repo's codebase | User explicitly rejected the per-repo `.git/hooks/pre-commit` approach; wants a machine-wide, repo-agnostic setup | Settled |
| 2 | Mechanism: `git config --global core.hooksPath ~/.git-hooks-global` | Points git at one shared hooks folder for every repo on the machine instead of each repo's own `.git/hooks/` | Settled |
| 3 | Real checks must block the commit (non-zero exit) on failure | Decided early, before the pivot to global hooks; still applies once real checks are added | Settled |
| 4 | Current placeholder just prints `"anurag"` and exits 0 | Stub to confirm the global-hook mechanism works before adding real logic | Settled |
| 5 | Wrap everything in a Mac Electron app | User wants a GUI to manage checks, see commit history in detail locally, and install/uninstall without manual scripts | Settled |
| 6 | Electron app does first-launch setup in JS instead of a `.pkg` postinstall script | A plain `.dmg` can't auto-run scripts; a `.pkg` with postinstall scripting is more fragile to build/sign/notarize. First-launch setup in-app gives the same "install and you're set up" feel with far less packaging complexity | Settled (revisit if user wants a true `.pkg` installer later) |
| 7 | Hook and Electron app are decoupled, connected only via files on disk (`config.json` + log store) | The hook must keep working via plain `git commit` even if the app isn't running. Simpler and more robust than live IPC to a possibly-not-running app | Settled |
| 8 | App has an always-visible Uninstall button that removes the hook and unsets `core.hooksPath` | Explicit user request | Settled |
| 9 | Terminal output on commit must also be listed/detailed in the app locally | Explicit user request — hook writes structured records (not just prints) so the app can render history | Settled |
| 10 | Planning docs (`plan.md`, `checklist.md`, `decisions.md`) live together in a `planning/` folder | Explicit user request to group everything | Settled |

## Deferred / not yet decided

| # | Question | Notes | Status |
|---|---|---|---|
| 1 | Scope of actual security checks (secrets scanning, sensitive file detection, dependency vuln checks, etc.) | User explicitly deferred this early on ("we will discuss that later") — do not assume scope | Open |
| 2 | Log store format: JSON lines file vs. SQLite | JSONL is simpler to start; SQLite makes filter/search in the UI easier later. No decision made yet | Open |
| 3 | Does Uninstall delete history logs, or keep them? | Leaning toward asking the user at uninstall time via a checkbox, but not confirmed | Open |
| 4 | Hook script language: stay bash, or move to Node? | Node would share logic/types with the Electron app more easily; bash has zero runtime dependency and is always available | Open |
| 5 | Chain-call repo-local `.git/hooks/pre-commit` if one exists, to avoid silently overriding it | Known caveat of `core.hooksPath` fully replacing default hook lookup — flagged early, not yet built. Likely becomes a config toggle in the app rather than a silent default | Open |
| 6 | Additional hook types beyond `pre-commit` (e.g. `pre-push`) | Not yet requested, worth asking once core flow is in place | Open |

## Known caveats (not decisions, but must stay visible)
- `core.hooksPath` fully replaces git's default per-repo hook lookup — any repo with its own local `.git/hooks/pre-commit` is silently ignored while the global path is active. Git only checks one location, not both.
