# Checklist: Global Git Hook Manager (Electron App)

Phase-wise build checklist. See [plan.md](plan.md) for architecture/rationale and [decisions.md](decisions.md) for the reasoning behind each call.

## Phase 0 — Existing stub (done)
- [x] `pre-commit` script that prints `"anurag"` and exits 0
- [x] `install.sh` — copies hook, sets `core.hooksPath` globally
- [x] `README.md` — usage docs

## Phase 1 — Structured hook output
- [ ] Decide hook language: stay bash, or move to Node (see open question in plan.md)
- [ ] Hook writes one structured record per run to a local log store (repo path, branch, timestamp, checks run, pass/fail, exit code, full stdout/stderr)
- [ ] Decide log store format: JSON lines file vs. SQLite
- [ ] Hook still prints to terminal as before (structured logging is additive, not a replacement)

## Phase 2 — Config file
- [ ] Define `config.json` schema (enabled checks, blocking vs. warn-only, per-repo overrides, chain-repo-local-hook toggle)
- [ ] Hook reads `config.json` before running checks
- [ ] Default `config.json` written on first install

## Phase 3 — Electron app scaffold
- [ ] Set up Electron project (main + renderer)
- [ ] Basic window/menu shell for Mac

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
