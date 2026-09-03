# Plan: Global Git Hook Manager (Electron App)

## Goal
Turn the existing global git pre-commit hook (currently a stub) into a full system with:
1. A **machine-wide git hook** that runs on every `git commit`, in every repo, with no per-repo setup.
2. A **native Mac Electron app** that:
   - Installs the hook on first launch (no manual `install.sh` step for the end user).
   - Lets the user **manage multiple things** (which checks run, blocking vs. warn-only, per-repo overrides, etc.).
   - Shows a **detailed local history** of everything that happened on each commit — not just what scrolled by in the terminal.
   - Has an **Uninstall button** that fully removes the hook and reverts git config.

## Architecture

```
~/.git-hooks-global/
  ├── pre-commit          # the hook script (bash or node)
  ├── config.json         # which checks are enabled, blocking vs warn-only, per-repo overrides
  └── logs/
      └── commits.jsonl    # or a SQLite file — one structured record per commit run

Electron App (Mac)
  ├── Main process        # first-run setup, uninstall logic, fs access, git config commands
  ├── Renderer / UI
  │     ├── History view   # reads logs/commits.jsonl (or sqlite), lists + detail per commit
  │     ├── Settings view  # toggles checks on/off, edits config.json
  │     └── Uninstall button (top-level, always visible)
```

### How the pieces talk to each other
- The hook and the app are **decoupled** — the app does not need to be running for `git commit` to work. The hook always runs standalone and just writes to `config.json`/`logs/` on disk.
- The **hook reads `config.json`** before running checks, to know what's enabled/disabled and whether to block on failure.
- The **hook writes one structured entry per commit run** to the log store: timestamp, repo path, branch, which checks ran, pass/fail per check, exit code, full captured stdout/stderr.
- The **Electron app reads the log store** to render history (list + click-through detail, matching what would have printed in the terminal) and reads/writes `config.json` for the settings UI.

### Install flow (first launch, no separate installer script)
On first launch, the Electron app (in its main process, using Node's `fs`/`child_process` — not relying on `.pkg` postinstall scripting):
1. Creates `~/.git-hooks-global/` if missing.
2. Writes/copies the `pre-commit` script into it, `chmod +x`.
3. Writes a default `config.json`.
4. Runs `git config --global core.hooksPath ~/.git-hooks-global`.

**Why not a `.pkg` installer with a postinstall script:** a plain `.dmg` (drag-to-Applications) can't run a script automatically — getting true "install on install" would mean building a signed/notarized `.pkg` with a postinstall script, which is more fragile to build and maintain. Doing setup on first launch, inside the app itself, achieves the same "install it and you're set up" feel with far less packaging complexity. (Flagged as a decision — revisit if the user wants a true `.pkg` installer later.)

### Uninstall flow (button in the app)
On clicking **Uninstall** in the app:
1. Run `git config --global --unset core.hooksPath` (reverts every repo on the machine to its own local `.git/hooks/`, if any).
2. Remove `~/.git-hooks-global/` (hook script, config, logs) — or optionally just the hook script while asking whether to keep history logs.
3. Confirm success in the UI (and probably a confirmation dialog before doing it, since this is a destructive/system-wide action).

**Open question:** should uninstall wipe the commit history logs too, or preserve them (e.g. in case the user reinstalls later, or wants to keep records)? Needs a decision before building — leaning toward asking the user at uninstall time via a checkbox ("also delete history").

## Key decisions carried over from earlier discussion
- Nothing gets added into individual repos — stays machine-wide via `core.hooksPath`.
- Real checks (once decided) must **block the commit** (non-zero exit) on failure.
- Content of the actual security checks (secrets scanning, sensitive file detection, dependency vuln checks, etc.) is **still not finalized** — deferred by the user, do not assume scope.
- Known caveat: `core.hooksPath` fully replaces git's default hook lookup, so any repo with its own local `.git/hooks/pre-commit` gets silently skipped. A possible fix (global hook chain-calls a repo-local hook if present) was flagged but not built — should be a config-managed option in the new app ("chain repo-local hooks: on/off") rather than a silent default.

## Open questions still to resolve
1. What are the actual checks the hook should run? (deferred earlier, still undecided)
2. JSON lines log file vs. SQLite for history storage — SQLite gives easier filter/search in the UI later, JSONL is simpler to start. Leaning JSONL first, can migrate.
3. Does uninstall delete history logs, or keep them?
4. Should hook script itself become Node (easier to share logic/types with the Electron app) or stay bash (zero runtime dependency, always available)?
5. Any hook types beyond `pre-commit` wanted (e.g. `pre-push`)?
