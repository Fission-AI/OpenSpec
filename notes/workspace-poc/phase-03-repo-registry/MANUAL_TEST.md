# Phase 03 Manual Test

Manual test stage re-run in fresh isolated XDG state on 2026-04-17 for ROADMAP Phase 03, cycle 1.

## Scenarios run

- Built the current CLI with `pnpm run build`.
- Created a managed workspace with `openspec workspace create phase03-manual --json`.
- Registered a repo with `openspec workspace add-repo app <symlink-path> --json`.
- Confirmed the persisted split:
  - `.openspec/workspace.yaml` stored only the committed alias entry `app: {}`
  - `.openspec/local.yaml` stored only the canonical absolute repo path
  - no absolute repo path leaked into `.openspec/workspace.yaml`
- Exercised `workspace add-repo` failure cases from the real CLI:
  - duplicate alias registration
  - missing repo path
  - repo path without repo-local `openspec/`
- Ran `openspec workspace doctor --json` on a healthy workspace and confirmed a clean pass.
- Corrupted fresh workspace metadata to simulate doctor-only recovery scenarios, then ran `openspec workspace doctor --json` and confirmed:
  - `missing-local-path` for a committed alias missing from `.openspec/local.yaml`
  - `non-canonical-path` for a symlinked local overlay path
  - `extra-local-alias` for a local-only alias not present in committed metadata
  - non-zero exit and no mutation of `.openspec/workspace.yaml` or `.openspec/local.yaml`
- Removed a previously registered repo directory, reran `openspec workspace doctor --json`, and confirmed `missing-repo-path` with no overlay mutation.
- Removed `openspec/` from a previously registered repo, reran `openspec workspace doctor --json`, and confirmed `missing-openspec-state`.

## Results

- All manual smoke scenarios passed against the current built CLI.
- `workspace add-repo` still persists committed alias metadata separately from local absolute paths.
- Canonicalization still resolves symlink inputs before persistence.
- `workspace doctor` reports healthy state correctly, reports stale or broken registry state with the expected issue codes, exits non-zero on problems, and does not rewrite workspace files during diagnostics.

## Fixes applied

- No product fixes were required from this manual-test pass.
- Updated this manual-test note to reflect the fresh-context run and expanded doctor scenarios.

## Residual risks

- No residual Phase 03 functional issues were found during manual testing.
- Dedicated automated regression coverage for these flows is still expected in Phase 04.
