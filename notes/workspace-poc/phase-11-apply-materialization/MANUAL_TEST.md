# Phase 11 Manual Test

Manual smoke re-run in a fresh local context on 2026-04-17 (Australia/Sydney) for ROADMAP Phase 11, cycle 1.

## Scenarios run

- Rebuilt the CLI with `pnpm run build`.
- Re-ran the focused Phase 11 regression slice to confirm the current tree before the manual smoke:
  - `pnpm vitest run test/core/workspace/apply.test.ts test/core/workspace/change-create.test.ts test/core/workspace/open.test.ts test/commands/workspace/open.test.ts test/cli-e2e/workspace/workspace-apply-cli.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts test/cli-e2e/workspace/workspace-open-cli.test.ts`
- Created a fresh temp root and copied:
  - `test/fixtures/workspace-poc/happy-path/workspace` to `<tmp>/workspace`
  - `test/fixtures/workspace-poc/happy-path/repos` to `<tmp>/repos`
- Ran the real CLI from the copied workspace with telemetry disabled:

```bash
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change shared-refresh --targets app,api
# seed proposal.md, design.md, and targets/{app,api}/{tasks.md,specs/**}
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change shared-refresh --repo app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change shared-refresh --repo app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change shared-refresh --repo docs
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change shared-refresh --repo missing
```

- Inspected the copied temp workspace and repos after the run to confirm:
  - `repos/app/openspec/changes/shared-refresh/` was created
  - `repos/api/openspec/changes/shared-refresh/` remained absent
  - `repos/docs/openspec/changes/shared-refresh/` remained absent
  - `repos/app/openspec/changes/shared-refresh/` contained `.openspec.yaml`, `proposal.md`, `design.md`, `tasks.md`, `specs/`, and `.openspec.materialization.yaml`
  - `workspace/changes/shared-refresh/targets/app/tasks.md` remained present after apply
- Inspected the CLI output to confirm:
  - the success path printed the repo-local destination and explicit authority handoff
  - the repeat run failed with a create-only collision
  - `docs` failed as an untargeted alias
  - `missing` failed as an unknown alias

## Results

- `pnpm run build` passed.
- The focused Phase 11 regression slice passed: 7 files, 23/23 tests passed.
- `apply --change shared-refresh --repo app` succeeded and created the repo-local change only in `app`.
- The success output explicitly showed the handoff from workspace planning to repo-local execution.
- The same-alias repeat run failed with the expected create-only collision message.
- The untargeted `docs` run failed with the expected targeted-alias error.
- The unknown `missing` run failed with the expected unregistered-alias error.
- The workspace draft files remained in place after the successful materialization.

## Fixes applied

- No product fixes were required from this manual smoke pass.
- Updated this manual-test note to reflect the exact commands, inspections, and results from the fresh-context run.

## Residual risks

- No residual risks were found within the Phase 11 scope during this pass.
- Broader materialization matrix coverage remains Phase 12 follow-on work rather than a Phase 11 defect.
