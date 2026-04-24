# Phase 04 Manual Test

Manual smoke re-run with the built CLI in fresh isolated XDG state on 2026-04-17 for ROADMAP Phase 04, cycle 1.

## Scenarios run

- Built the current CLI with `pnpm run build`.
- Created a managed workspace with `openspec workspace create phase04-manual-cycle1 --json`.
- Created three real repo fixtures with repo-local `openspec/changes` state: `app`, `api`, and `docs`.
- Registered all three repos through the real CLI with:
  - `openspec workspace add-repo app <path> --json`
  - `openspec workspace add-repo api <path> --json`
  - `openspec workspace add-repo docs <path> --json`
- Ran `openspec workspace doctor --json` and confirmed a clean pass with:
  - `registeredAliasCount: 3`
  - `localAliasCount: 3`
  - `issues: []`
  - `status: "ok"`
- Edited `.openspec/local.yaml` to replace the `api` path with a relative non-canonical path and reran `openspec workspace doctor --json`.
- Confirmed the drift run returned exit code `1` with a `non-canonical-path` issue for alias `api`.
- Removed `docs/openspec/` from a registered repo and reran `openspec workspace doctor --json`.
- Confirmed the doctor run returned exit code `1` with a `missing-openspec-state` issue for alias `docs`.
- Edited `.openspec/local.yaml` to replace the `app` path with a missing repo root and reran `openspec workspace doctor --json`.
- Confirmed the stale run returned exit code `1` with a `missing-repo-path` issue for alias `app`.
- Repaired `.openspec/local.yaml` by restoring the canonical absolute repo path and restored `docs/openspec/`, then reran `openspec workspace doctor --json`.
- Compared `.openspec/workspace.yaml` before and after the local overlay edits to confirm committed metadata stayed unchanged.

## Results

- All manual smoke scenarios passed.
- Multiple repo additions remained readable and doctor-clean in one workspace.
- Doctor detected alias/path drift, missing repo-local `openspec/`, and missing repo roots with the expected non-zero exit behavior.
- Repairing the stale `local.yaml` entry restored doctor success.
- `.openspec/workspace.yaml` remained unchanged across local path mutations, so committed metadata stayed stable while only the local overlay changed.

## Fixes applied

- No additional product fixes were required during this manual smoke pass.

## Residual risks

- No user-visible Phase 04 issues were found in this manual smoke run.
