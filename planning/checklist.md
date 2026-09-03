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
- [x] On launch: create `~/.git-hooks-global/` if missing, only when not already installed (idempotent — checked via `hookManager.isInstalled()`)
- [x] Copy `pre-commit` + `hook.js` from `app/resources/hooks/` (bundled payload, synced from repo root via `npm run sync-hooks`) into `~/.git-hooks-global/`, `chmod +x` on `pre-commit`
- [x] Write default `config.json` — only if missing, never overwrites existing user settings
- [x] Run `git config --global core.hooksPath ~/.git-hooks-global`
- [x] Status badge in the UI header reflects install state (`Installed` / `Not active`) via `hook:getStatus`
- [x] Core logic (`app/lib/hookManager.js`) tested directly under plain Node against the real hooks dir: install, idempotent re-install, uninstall, re-install — see verification below

## Phase 5 — History / detail view
- [x] Renderer reads the log store via `history:get` IPC (main process parses `commits.jsonl`)
- [x] List view: table with time, repo (basename), branch, pass/fail/blocked pill — most recent first
- [x] Detail view: click a row to open a modal with the full structured record (all checks, messages, blocking flags)
- [x] Live refresh: main process `fs.watch`es the logs directory (debounced) and pushes `history:updated` over IPC; renderer re-fetches automatically — verified via real commits made from the terminal while testing
- [x] Verified end-to-end via `hookManager.readHistory()` against real commits (see Phase 4 verification)

## Phase 6 — Settings / management UI
- [x] Toggle individual checks on/off (`.check-enabled` checkboxes per check)
- [x] Toggle blocking vs. warn-only (`.check-blocking` per check, plus a global `defaultBlocking` fallback)
- [x] Per-repo overrides UI — add a repo path, per-check "disable here" checkboxes, remove a repo override entirely
- [x] Toggle chain-repo-local-hook behavior — wired all the way through: UI toggle → `config.json` → `hook.js` actually chain-calls the repo's local `.git/hooks/pre-commit` when present and executable, forwarding its exit code as a blocking check. **This resolves the long-standing caveat** in plan.md/decisions.md open question #3 — no longer just a flagged risk.
- [x] Save changes back to `config.json` via `config:set` IPC
- [x] Verified via `hookManager` directly: write config → read back matches; verified `chainRepoLocalHook` end-to-end with a real repo-local hook in three states (off / on+pass / on+fail-blocks-commit) — all behaved correctly

## Phase 7 — Uninstall button
- [x] Uninstall button always visible (top of app header)
- [x] Confirmation dialog before proceeding — native `dialog.showMessageBox` (Cancel/Uninstall), including a checkbox for "Also delete commit history" (resolves open question #2 in decisions.md: user is asked at uninstall time, as planned)
- [x] Runs `git config --global --unset core.hooksPath`
- [x] Removes `~/.git-hooks-global/{pre-commit,hook.js,config.json}`
- [x] Logs deleted only if the checkbox was checked, otherwise preserved
- [x] Status badge updates in the UI after uninstall completes
- [x] Verified via `hookManager.performUninstall()` directly: hook files removed, `core.hooksPath` unset, a subsequent commit no longer triggers the hook, logs preserved when `deleteLogs: false`

## Phase 8 — Packaging & distribution
- [x] `electron-builder` configured in `app/package.json` (`build` block: appId, productName, mac target `dmg`, `files` list including `resources/**/*`)
- [x] Sanity-built with `electron-builder --mac --dir` (unpacked, unsigned) — succeeded; confirmed via `asar list` that `main.js`, `preload.js`, `lib/hookManager.js`, `renderer/`, and `resources/hooks/*` are all correctly bundled into `app.asar`
- [x] Bumped `electron-builder` to `^26.15.3` to clear the vulnerable range flagged by `npm audit` (down to one remaining dev-time-only `extract-zip` advisory in the Electron-download step, not shipped in the app — same as the Electron dependency itself)
- [ ] **Code signing / notarization — blocked.** This machine has an "Apple Development: Anurag Patel" certificate but it's **expired**, so `electron-builder` correctly skipped signing. A real distributable `.dmg` needs a valid **Developer ID Application** certificate (not just an Apple Development one — that's for local testing, not distribution) from your Apple Developer account, plus notarization credentials (Apple ID + app-specific password, or API key) supplied to `electron-builder` via env vars. Nothing more to do here until that's sorted on your end.
- [ ] **Not run: actual `.dmg` build, fresh-machine install/uninstall verification.** Only the unsigned `--dir` build was sanity-checked in this sandbox (no display available to launch/screenshot it). Needs to happen on your real Mac once you're ready to distribute.

## Phase 9 — Actual security check logic (partially decided)
- [x] `npm-audit` and `npm-doctor` added as real checks, per explicit user request — both run only when the repo has a `package.json` (skip cleanly otherwise), both `enabled: true` / `blocking: false` by default in `config.default.json`
- [x] Verified: non-npm repo skips both instantly with no npm invocation; npm repo actually runs both and logs full output
- [x] Fixed a status-reporting gap this surfaced: a check can now be `pass` / `fail` / `skip`, and the commit record's overall status is `blocked` (a blocking check failed, commit stopped) vs. `fail` (a check failed but wasn't blocking, commit went through) vs. `pass` — previously a non-blocking failure was mislabeled `pass` in the log/history UI
- [ ] **Real-world caveat surfaced by testing, needs a call:** `npm doctor` took ~18s on a trivial commit (it verifies the entire local npm cache, ~13k tarballs) and reported "fail" purely because this machine's npm/Node versions differ from npm's latest recommendation — unrelated to the actual commit content. Left enabled + non-blocking per what was asked, but worth deciding whether to disable it by default, swap it for something cheaper, or accept the latency.
- [x] `HOOK_SKIP` env var added to skip specific checks (`HOOK_SKIP=npm-audit,npm-doctor`) or everything (`HOOK_SKIP=all`) for one commit, without bypassing the hook entirely — each skip still gets logged with status `"skip"`, unlike `git commit --no-verify` which leaves no record. Verified both named and `all` skip modes against real commits.
- [x] Fixed a UI bug found during review: the Commit Detail modal appeared open on app launch and wouldn't close, due to a CSS specificity conflict between `.modal { display: flex }` and the `[hidden]` attribute — fixed in `app/renderer/styles.css`
- [ ] Broader scope (secrets scanning, sensitive file detection, etc.) — still **not decided**, do not assume
- [ ] Decide on additional hook types beyond `pre-commit` (e.g. `pre-push`)
