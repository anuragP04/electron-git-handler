# Project Context: Global Git Pre-Commit Security Hook

## Goal
Build a **system-level** git security check — not something added into any individual repo's codebase. It must trigger automatically whenever `git commit` is run, in **any** repo on the machine, and currently just needs to print output to the console (no blocking yet beyond the placeholder).

## Key decisions made so far
1. **No per-repo files.** Rejected the initial approach of a `.git/hooks/pre-commit` file placed inside a single repo. The user explicitly wants nothing living in any repo's code.
2. **Mechanism: global git hooks path.** Using `git config --global core.hooksPath ~/.git-hooks-global` so git looks in one shared folder for hooks across every repo on the machine, instead of each repo's own `.git/hooks/`.
3. **Blocking behavior:** eventual real checks should **block the commit** (exit non-zero) if issues are found — this was decided early on before the pivot to global hooks, and still applies once real checks are added.
4. **Current placeholder behavior:** the hook just runs `echo "anurag"` and exits 0 — no real security logic yet. This was intentionally left as a stub to confirm the global-hook mechanism works before adding real checks.
5. **Security check content (secrets scanning, sensitive file detection, dependency vuln checks, etc.) has NOT been finalized yet** — the user deferred this decision ("we will discuss that later"). Do not assume scope for this; ask before implementing.

## Current file layout
```
~/.git-hooks-global/
  └── pre-commit        # the hook script itself
```
Set up via:
```bash
git config --global core.hooksPath ~/.git-hooks-global
```

## Files already produced
- `pre-commit` — the hook script (currently: prints "anurag", exits 0)
- `install.sh` — copies `pre-commit` into `~/.git-hooks-global/` and sets `core.hooksPath` globally
- `README.md` — usage docs, verify/uninstall steps, and a known caveat (see below)

## Known caveat / open issue
`core.hooksPath` **fully replaces** git's default per-repo hook lookup. If any individual repo already has its own local `.git/hooks/pre-commit`, it will be silently ignored while the global path is active — git only checks one location, not both. This has been flagged to the user but **not yet resolved**. A possible fix: have the global hook detect and chain-call a repo-local hook if one exists, so nothing is silently skipped. Not yet implemented — check with the user before building this.

## What's still open / next steps
- Decide and implement the actual security check(s) to run on each commit (secrets/credentials scanning was the original suggestion; user deferred the decision).
- Decide whether to preserve/chain repo-local hooks (see caveat above).
- Once real checks are added, confirm blocking behavior (exit 1 on failure) is wired in — was true for the original single-repo design, needs re-confirming for the global version.
- Consider whether other hook types (e.g. `pre-push`) are wanted, or just `pre-commit`.

## Constraints to respect
- Nothing should be added to individual repos — the whole point is a machine-wide, repo-agnostic setup.
- Console output only for now — no logging to file, no notifications, unless asked.
- Don't assume scope of "security check" beyond what's explicitly confirmed by the user.
