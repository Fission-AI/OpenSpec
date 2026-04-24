# Phase 13 Manual Test

Phase cycle: 1
Stage: `manual-test`
Date: 2026-04-17 (Australia/Sydney)

Manual smoke run in a fresh local context for ROADMAP Phase 13 only.

## Scenarios run

- Built the current CLI with `pnpm run build`.
- Created a fresh temp root and copied:
  - `test/fixtures/workspace-poc/happy-path/workspace` to `<tmp>/workspace`
  - `test/fixtures/workspace-poc/happy-path/repos` to `<tmp>/repos`
- Ran the real CLI from the copied workspace and repo roots with telemetry disabled:

```bash
cd <tmp>/workspace
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js new change shared-refresh --targets app,api
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js status --change shared-refresh --json
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js apply --change shared-refresh --repo app --json

cd <tmp>/repos/app
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js list --json

# edit tasks to simulate partial execution
printf '%s\n' '## App Tasks' '- [x] Finish API wiring' '- [ ] Land UI follow-up' > openspec/changes/shared-refresh/tasks.md
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js list --json

# edit tasks to simulate completion
printf '%s\n' '## App Tasks' '- [x] Finish API wiring' '- [x] Land UI follow-up' > openspec/changes/shared-refresh/tasks.md
OPEN_SPEC_TELEMETRY_DISABLED=1 node /Users/tabishbidiwale/fission/repos/openspec/dist/cli/index.js list --json

cat openspec/changes/shared-refresh/.openspec.materialization.yaml
```

- Inspected the raw workspace-root `status --change` JSON before apply.
- Inspected repo-local `list --json` immediately after apply, after a partial task update, and after a full task update.
- Inspected the materialization sidecar contents.

## Results

- `pnpm run build` passed.
- `new change shared-refresh --targets app,api` succeeded and created the workspace change.
- The raw workspace-root `status --change shared-refresh --json` output still reported:
  - `proposal: done`
  - `design: done`
  - `specs: ready`
  - `tasks: blocked`
- That confirmed the current generic status command is still interpreting workspace changes as if they had repo-local root `specs/` and `tasks.md`.
- `apply --change shared-refresh --repo app --json` succeeded and wrote one repo-local change under `repos/app/openspec/changes/shared-refresh`.
- Repo-local `list --json` reported `shared-refresh` as:
  - `in-progress` at `0/2` immediately after apply
  - `in-progress` at `1/2` after one checked task
  - `complete` at `2/2` after both tasks were checked
- The fixture also still contained the unrelated baseline entry `app-ui-polish` with `status: no-tasks`; it did not affect the `shared-refresh` probe.
- The materialization sidecar contained:
  - `source: workspace`
  - `workspaceName: happy-path`
  - `targetAlias: app`
  - `materializedAt: 2026-04-17T00:44:12.632Z`
- The current product surface therefore supports the Phase 13 decision:
  - task checkboxes are the real progress signal
  - raw artifact-graph status is not workspace-aware
  - the sidecar is the minimum reverse link needed for honest roll-up

## Fixes applied

- No product or test code fixes were required from this manual pass.
- Updated this manual-test note to reflect the fresh smoke run and explicit `manual-test` stage metadata.

## Residual risks

- None found within the scope of Phase 13.
- Phase 14 still needs to implement the actual workspace roll-up behavior defined in `DECISION.md`; that is a forward implementation dependency, not a manual-test gap.
