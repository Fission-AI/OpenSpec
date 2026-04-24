# Phase 06 Summary

Phase cycle: 1
Stage: `implementation`

## Changes made

- Added workspace-aware change-container helpers in `src/core/workspace/metadata.ts` and reused them from:
  - `src/commands/workflow/shared.ts`
  - `src/core/artifact-graph/instruction-loader.ts`
- Fixed the workflow path mismatch exposed by the new coverage so `status --change <name>` can read workspace-created changes from top-level `changes/` instead of only repo-local `openspec/changes/`.
- Added an exact workspace-change topology assertion to `test/helpers/workspace-assertions.ts`.
- Added focused core coverage in `test/core/workspace/change-create.test.ts` for:
  - `parseWorkspaceTargets()`
  - workspace change metadata
  - layout-only central planning scaffolds
  - unknown alias rejection
- Added command-surface coverage in `test/commands/workflow/new-change.workspace.test.ts` for targeted change creation inside a registered workspace.
- Added CLI e2e coverage in `test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts` for:
  - successful targeted creation
  - unknown alias rejection
  - untouched repo-local roots
  - healthy `status` and `workspace doctor` after creation

## Tests or research performed

- `pnpm run build`
- `pnpm vitest --run test/core/workspace/change-create.test.ts test/commands/workflow/new-change.workspace.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- `pnpm vitest --run test/core/artifact-graph/instruction-loader.test.ts test/commands/artifact-workflow.test.ts test/cli-e2e/workspace/workspace-registry-cli.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- `git diff --check -- src/core/workspace/metadata.ts src/commands/workflow/shared.ts src/core/artifact-graph/instruction-loader.ts test/helpers/workspace-assertions.ts test/core/workspace/change-create.test.ts test/commands/workflow/new-change.workspace.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- Fresh built-CLI smoke in an isolated copied workspace fixture with telemetry disabled:
  - `node bin/openspec.js --no-color new change phase06-manual --targets app,api`
  - `node bin/openspec.js --no-color status --change phase06-manual --json`
  - `node bin/openspec.js --no-color workspace doctor --json`
  - `node bin/openspec.js --no-color new change phase06-bad --targets app,missing`
  - explicit repo-root checks that no `openspec/changes/phase06-manual` or `openspec/changes/phase06-bad` directories were created under `app`, `api`, or `docs`

## Results

- Build passed.
- The focused Phase 06 slice passed: 9/9 tests.
- The broader regression slice that touches workflow loading and workspace registry behavior passed: 98/98 tests.
- `new change --targets` now has direct coverage for rejecting aliases outside the workspace registry.
- Workspace change creation is now proven to produce only:
  - central planning artifacts at the workspace change root
  - per-target partitions under `targets/<alias>/`
- Successful targeted creation leaves repo-local `openspec/changes/` roots untouched before any materialization step.
- `status --change` now succeeds for workspace-created changes and reports the expected incomplete planning state:
  - `proposal` and `design` are `done`
  - `specs` is `ready`
  - `tasks` is `blocked` by missing `specs`
- `workspace doctor --json` still reports a healthy workspace after targeted change creation.

## Blockers and next-step notes

- No blockers remain for Phase 06.
- No new bounded follow-up phases were required from this implementation pass.
