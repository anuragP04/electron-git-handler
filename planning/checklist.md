# Checklist: Global Git Hook Manager (Electron App)

Phase-wise build checklist. See [plan.md](plan.md) for architecture/rationale and [decisions.md](decisions.md) for the reasoning behind each call.

## Phase 0 — Existing stub (done)
- [x] `pre-commit` script that prints `"anurag"` and exits 0
- [x] `install.sh` — copies hook, sets `core.hooksPath` globally
- [x] `README.md` — usage docs

## Phase 1 — Structured hook output
- [x] Decide hook language: hybrid — `pre-commit` stays bash (git only ever looks for that filename, must be directly executable), delegates to `hook.js` (Node) for actual logic
- [x] Hook writes one structured record per run to a local log store (repo path, branch, timestamp, checks run, pass/fail, exit code, full stdout/stderr)
- [x] Decide log store format: JSON lines file (`~/.git-hooks-global/logs/commits.jsonl`) — can migrate to SQLite later if querying JSONL becomes limiting
- [x] Hook still prints to terminal as before (structured logging is additive, not a replacement)
- [x] `install.sh` copies both `pre-commit` and `hook.js`, warns if `node` isn't on PATH
- [x] Verified end-to-end: fresh repo, first commit (no HEAD yet) and second commit both log correctly with no stray stderr output

## Phase 2 — Config file
- [x] Define `config.json` schema (`checks.<name>.enabled/blocking`, `defaultBlocking`, `repoOverrides.<repoRoot>.checks.<name>`, `chainRepoLocalHook` toggle reserved for later)
- [x] Hook reads `config.json` before running checks, merges global → per-repo override per check
- [x] Default config lives at `config.default.json` in the repo; `install.sh` seeds it to `~/.git-hooks-global/config.json` only on first install (never overwrites existing user settings on reinstall)
- [x] Verified: disabling a check skips it and its terminal output; a blocking check that fails exits 1 and actually blocks the commit; a non-blocking failure would log `fail` but not block (placeholder check is currently non-blocking by default since it can't meaningfully fail yet)

## Phase 3 — Electron app scaffold
- [x] Set up Electron project in `app/` (`package.json`, `main.js`, `preload.js`, `renderer/`)
- [x] Basic window/menu shell for Mac (native app menu incl. About/Hide/Quit, Edit, View; contextIsolation on, nodeIntegration off)
- [x] Renderer shell with header (title + disabled Uninstall button placeholder) and nav tabs (History/Settings placeholders) for later phases to fill in
- [x] `npm install` clean, no known-vulnerable Electron version (bumped past the CVE range to 38.8.6)
- [x] Syntax-checked all source files (`node --check`, JSON/HTML parse)
- [ ] **Not yet verified visually** — this sandbox forces `ELECTRON_RUN_AS_NODE=1` so the actual window can't be rendered/screenshotted here. Needs `cd app && npm install && npm start` run on an actual Mac to confirm the window/menu really show up.

## Phase 4 — First-launch install flow
- [ ] On first launch: create `~/.git-hooks-global/` if missing
- [ ] Copy/write `pre-commit` into it, `chmod +x`
- [ ] Write default `config.json`
- [ ] Run `git config --global core.hooksPath ~/.git-hooks-global`
- [ ] Show install confirmation/status in the UI

## Phase 5 — History / detail view
- [ ] Read log store (JSONL/SQLite) in the renderer
- [ ] List view: one row per commit run (repo, branch, timestamp, pass/fail)
- [ ] Detail view: full output per commit, matching what printed in the terminal
- [ ] Live/refresh when a new commit happens (file watch or polling)

## Phase 6 — Settings / management UI
- [ ] Toggle individual checks on/off
- [ ] Toggle blocking vs. warn-only
- [ ] Per-repo overrides UI
- [ ] Toggle chain-repo-local-hook behavior (see known caveat in plan.md)
- [ ] Save changes back to `config.json`

## Phase 7 — Uninstall button
- [ ] Uninstall button always visible (top of app, per user request)
- [ ] Confirmation dialog before proceeding (destructive, machine-wide action)
- [ ] Run `git config --global --unset core.hooksPath`
- [ ] Remove `~/.git-hooks-global/` hook + config
- [ ] Decide + implement: prompt to keep or delete history logs (see open question in plan.md)
- [ ] Show uninstall confirmation in the UI

## Phase 8 — Packaging & distribution
- [ ] Package as `.dmg` via electron-builder
- [ ] Code signing / notarization for Mac
- [ ] Verify fresh-machine install flow end-to-end (dmg → drag to Applications → launch → hook installed)
- [ ] Verify uninstall end-to-end (button → hook removed → `git commit` in any repo no longer triggers it)

## Phase 9 — Actual security check logic (deferred, blocked on user decision)
- [ ] Decide scope of real checks (secrets scanning, sensitive file detection, dependency vuln checks, etc.) — **not yet decided, do not assume**
- [ ] Implement chosen checks
- [ ] Confirm blocking behavior (non-zero exit on failure) is wired end-to-end
- [ ] Decide on additional hook types beyond `pre-commit` (e.g. `pre-push`)
