# Phase 17 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Fresh manual smoke run in copied local fixture contexts for ROADMAP Phase 17 using the built CLI.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Scenario 1: staggered repo archive should not force top-level done in a fresh copied fixture:

```bash
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change manual-phase17-staggered --targets app,api
# mark workspace coordination tasks 2/2 complete
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase17-staggered --repo app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase17-staggered --repo api
# mark repos/app/openspec/changes/manual-phase17-staggered/tasks.md as 2/2 complete
# mark repos/api/openspec/changes/manual-phase17-staggered/tasks.md as 1/2 complete
cd <tmp>/repos/app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive manual-phase17-staggered --yes --skip-specs --no-validate
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase17-staggered --json
```

- Scenario 2: `soft-done` should appear before explicit workspace archive, and `hard-done` only after it, in a second fresh copied fixture:

```bash
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change manual-phase17-harddone --targets app,api
# mark workspace coordination tasks 2/2 complete
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase17-harddone --repo app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change manual-phase17-harddone --repo api
# mark both repo-local task files as 2/2 complete
cd <tmp>/repos/app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive manual-phase17-harddone --yes --skip-specs --no-validate
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase17-harddone --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive manual-phase17-harddone --workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change manual-phase17-harddone --json
grep 'workspaceArchivedAt' <tmp>/workspace/changes/manual-phase17-harddone/.openspec.yaml
ls -1 <tmp>/repos/app/openspec/changes/archive | grep 'manual-phase17-harddone'
```

- Scenario 3: standalone repo-local archive should remain unchanged outside workspace flows:

```bash
mkdir -p <tmp>/openspec/changes/archive <tmp>/openspec/specs <tmp>/openspec/changes/repo-local-regression
# mark openspec/changes/repo-local-regression/tasks.md as 1/1 complete
cd <tmp>
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js archive repo-local-regression --yes --skip-specs --no-validate
ls -1 <tmp>/openspec/changes/archive | grep 'repo-local-regression'
test ! -d <tmp>/openspec/changes/repo-local-regression
```

## Results

- `pnpm run build` passed.
- Scenario 1 matched `17.4`:
  - `status --change manual-phase17-staggered --json` parsed cleanly
  - overall workspace state was `in-progress`
  - targets rendered as `api: in-progress` and `app: archived`
  - repo-local archive did not force workspace `soft-done` or `hard-done`
- Scenario 2 matched `17.5`:
  - before the explicit workspace archive, `status --change manual-phase17-harddone --json` parsed cleanly and overall state was `soft-done`
  - `openspec archive manual-phase17-harddone --workspace` printed `Workspace change 'manual-phase17-harddone' marked hard-done ...`
  - after the explicit workspace archive, `status --change manual-phase17-harddone --json` parsed cleanly and overall state became `hard-done`
  - `workspace/changes/manual-phase17-harddone/.openspec.yaml` contained `workspaceArchivedAt`
  - the repo-local archived copy remained under `repos/app/openspec/changes/archive/`
- Scenario 3 matched `17.6`:
  - standalone `openspec archive repo-local-regression --yes --skip-specs --no-validate` succeeded outside any workspace root
  - the archived copy was created under `openspec/changes/archive/2026-04-17-repo-local-regression`
  - the active repo-local change directory was removed after archive

## Fixes applied

- No product code changes were required during this manual-test pass.
- Refreshed this note to record the full fresh-context manual smoke for all three Phase 17 acceptance boundaries, including the standalone repo-local regression case that was missing from the earlier note.

## Residual risks

- No additional Phase 17 residual risks were found in this manual smoke pass.
- The phase remains limited to workspace completion/archive semantics; no later roadmap work was started from this pass.
