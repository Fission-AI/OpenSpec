# Phase 18 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Manual smoke run in a fresh local context for ROADMAP Phase 18 only.

## Scenarios run

- Built the current CLI with `pnpm run build`.
- Created a fresh temp root and copied:
  - `test/fixtures/workspace-poc/happy-path/workspace` to `<tmp>/workspace`
  - `test/fixtures/workspace-poc/happy-path/repos` to `<tmp>/repos`
- Inspected the copied workspace metadata to confirm the current shipped identity model:

```bash
cd <tmp>/workspace
sed -n '1,120p' .openspec/workspace.yaml
sed -n '1,120p' .openspec/local.yaml
```

- Ran the real CLI from the copied workspace with telemetry disabled:

```bash
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change shared-refresh --targets app,api
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change shared-refresh --repo app --json
test -d <tmp>/repos/app/openspec/changes/shared-refresh
test ! -d <tmp>/repos/api/openspec/changes/shared-refresh
sed -n '1,120p' <tmp>/repos/app/openspec/changes/shared-refresh/.openspec.materialization.yaml
```

- Inspected the generated workspace target layout to confirm alias-named target directories were still the active scaffold:

```bash
find <tmp>/workspace/changes/shared-refresh/targets -maxdepth 2 -type f | sort
```

## Results

- `pnpm run build` passed.
- The copied `workspace.yaml` still used alias-keyed committed repo entries:
  - `repos.app`
  - `repos.api`
  - `repos.docs`
- The copied `local.yaml` still used alias-keyed local path bindings under `repoPaths`.
- `new change shared-refresh --targets app,api` succeeded and created the workspace change using alias targets.
- `apply --change shared-refresh --repo app --json` succeeded and returned the current user-visible contract surface:
  - top-level fields: `workspaceRoot`, `workspaceName`, `change`, `target`, `materializedAt`, `authority`
  - `change.id: shared-refresh`
  - `target.alias: app`
  - `target.changePath: <tmp>/repos/app/openspec/changes/shared-refresh`
- Only `repos/app` gained the materialized repo-local change; `repos/api` remained untouched.
- The generated workspace draft still used alias-named target directories:
  - `changes/shared-refresh/targets/app/tasks.md`
  - `changes/shared-refresh/targets/api/tasks.md`
- The materialization sidecar still contained the live v0 fields:
  - `source: workspace`
  - `workspaceName: happy-path`
  - `targetAlias: app`
  - `materializedAt: <iso-timestamp>`
- The manual smoke therefore matched the Phase 18 decision exactly:
  - alias-based workspace identity is still the shipped contract
  - the same change ID is still reused at materialization time
  - the repo-local trace is still the compatibility surface a future stable-ID migration must preserve additively

## Fixes applied

- No product or test code fixes were required from this manual pass.
- Refreshed this note to capture the exact current `apply --json` response shape and alias-target layout from the fresh smoke run.

## Residual risks

- None found within the scope of Phase 18.
- Future stable-ID and promotion work should preserve the exercised alias-and-trace contract until a dedicated migration step exists.
