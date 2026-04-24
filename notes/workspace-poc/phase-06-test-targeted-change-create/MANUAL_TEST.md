# Phase 06 Manual Test

Manual pass date: 2026-04-17
Phase cycle: 1
Stage: `manual-test`

## Scenarios run

- Reused the current built CLI from `pnpm run build`.
- Created a fresh isolated workspace by copying the `happy-path` workspace fixture and repo fixtures into a temporary directory.
- Rewrote `.openspec/local.yaml` in the copied workspace so `app`, `api`, and `docs` pointed to canonical absolute repo paths inside the temporary fixture root.
  On this macOS host, that canonicalization resolved the temp repo roots under `/private/var/...`.
- Created repo-local `openspec/changes/` directories in all three attached repos so `workspace doctor` exercised a healthy registered workspace.
- Ran `OPEN_SPEC_TELEMETRY_DISABLED=1 node bin/openspec.js --no-color new change phase06-manual --targets app,api` from the workspace root.
- Ran `OPEN_SPEC_TELEMETRY_DISABLED=1 node bin/openspec.js --no-color status --change phase06-manual --json`.
- Ran `OPEN_SPEC_TELEMETRY_DISABLED=1 node bin/openspec.js --no-color workspace doctor --json`.
- Ran `OPEN_SPEC_TELEMETRY_DISABLED=1 node bin/openspec.js --no-color new change phase06-bad --targets app,missing`.
- Checked that no repo-local `openspec/changes/phase06-manual` or `openspec/changes/phase06-bad` directories existed in `app`, `api`, or `docs`.

## Results

- `new change phase06-manual --targets app,api` exited `0` and created `changes/phase06-manual/` in the workspace root.
- The resulting workspace change kept the expected central planning topology:
  - `.openspec.yaml`
  - `proposal.md`
  - `design.md`
  - `tasks/coordination.md`
  - `targets/app/{tasks.md,specs/}`
  - `targets/api/{tasks.md,specs/}`
- `status --change phase06-manual --json` exited `0` and returned parseable JSON for the workspace change.
- The status JSON reported:
  - `proposal: done`
  - `design: done`
  - `specs: ready`
  - `tasks: blocked` by `specs`
- `workspace doctor --json` exited `0` and returned `status: "ok"` with `issues: []`.
- `new change phase06-bad --targets app,missing` exited `1` with `Unknown target alias: missing. Registered aliases: api, app, docs`.
- No repo-local change directories were created in any attached repo for either the successful or rejected create attempt.

## Fixes applied

- No product fixes were required during this manual-test pass.
- The temporary workspace overlay was canonicalized before running `workspace doctor --json` so the copied fixture matched the CLI's expected path form on this macOS host.

## Residual risks

- None found within the Phase 06 scope.
