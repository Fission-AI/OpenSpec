# Phase 16 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual smoke run in copied local fixture contexts for ROADMAP Phase 16 using the built CLI.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Scenario 1: early top-level workspace archive rejection in a fresh copied fixture:

```bash
cd <tmp-1>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change manual-phase16-early --targets app,api
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase16-early --repo app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive manual-phase16-early --workspace
```

- Scenario 2: repo-local archive first, then explicit workspace archive, in a second fresh copied fixture:

```bash
cd <tmp-2>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change manual-phase16 --targets app,api
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase16 --repo app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase16 --repo api
# mark workspace coordination plus both repo-local task files as 2/2 complete
cd <tmp-2>/repos/app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive manual-phase16 --yes --skip-specs --no-validate
cd <tmp-2>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase16 --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase16
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive manual-phase16 --workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase16 --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase16
```

- Parsed the raw JSON status output before and after the explicit workspace archive.
- Inspected the copied workspace metadata and repo-local archive directories on disk after Scenario 2.

## Results

- `pnpm run build` passed.
- Scenario 1 behaved as required for `16.6`:
  - `openspec archive manual-phase16-early --workspace` exited non-zero
  - the CLI reported `Workspace change 'manual-phase16-early' is 'in-progress'. Reach 'soft-done' before running 'openspec archive manual-phase16-early --workspace'.`
  - workspace hard-done was not implied or backfilled
- Scenario 2 behaved as required for `16.5`, `16.7`, and `16.8`:
  - before the explicit workspace archive, JSON status parsed cleanly and overall state was `soft-done`
  - before the explicit workspace archive, targets rendered as `api: complete` and `app: archived`
  - before the explicit workspace archive, `workspace/changes/manual-phase16/.openspec.yaml` did not contain `workspaceArchivedAt`
  - after `openspec archive manual-phase16 --workspace`, JSON status parsed cleanly and overall state became `hard-done`
  - after the explicit workspace archive, target states stayed `api: complete` and `app: archived`
  - after the explicit workspace archive, `workspace/changes/manual-phase16/.openspec.yaml` contained `workspaceArchivedAt`
- The filesystem boundaries stayed correct in Scenario 2:
  - the workspace change still existed under `workspace/changes/manual-phase16/`
  - the repo-local active `app` change no longer existed under `repos/app/openspec/changes/manual-phase16/`
  - the repo-local archived copy existed under `repos/app/openspec/changes/archive/2026-04-17-manual-phase16/`

## Fixes applied

- No product code changes were required during this manual-test pass.
- Refreshed this note to capture both observed manual paths:
  - early `--workspace` archive rejection
  - repo-local archive first, explicit workspace archive second

## Residual risks

- No additional Phase 16 residual risks were found in this manual smoke.
- The broader command and CLI coverage expansion remains Phase 17 work.
