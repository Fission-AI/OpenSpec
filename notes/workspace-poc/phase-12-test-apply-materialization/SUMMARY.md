# Phase 12 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Expanded `test/core/workspace/apply.test.ts` to cover:
  - missing target-slice source artifacts during materialization plan construction
  - stale dirty-workspace alias resolution failures
  - pre-existing target change collisions without overwrite
- Added `test/commands/workflow/apply.test.ts` to cover the direct command surface for:
  - apply success output
  - apply failure on stale repo resolution
  - repeat-apply create-only behavior
- Expanded `test/cli-e2e/workspace/workspace-apply-cli.test.ts` to cover:
  - dirty-workspace stale-alias failure through the built CLI
  - a fresh `workspace create -> add-repo -> new change -> apply` flow using copied `happy-path` fixture repos
  - selective materialization into only one repo out of many
- Updated the Phase 12 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 12 roadmap block in `ROADMAP.md`.
- Reviewed the current materialization implementation and existing tests in:
  - `src/core/workspace/apply.ts`
  - `src/commands/workflow/apply.ts`
  - `test/core/workspace/apply.test.ts`
  - `test/cli-e2e/workspace/workspace-apply-cli.test.ts`
  - `test/helpers/workspace-sandbox.ts`
- Built the CLI:
  - `pnpm run build`
- Ran the focused Phase 12 verification slice:
  - `pnpm vitest run test/core/workspace/apply.test.ts test/commands/workflow/apply.test.ts test/cli-e2e/workspace/workspace-apply-cli.test.ts test/cli-e2e/workspace/workspace-create-cli.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- Ran a fresh manual CLI smoke in an isolated temp root with telemetry disabled:
  - `workspace create phase-12-manual --json`
  - `workspace add-repo app <tmp>/repos/app --json`
  - `workspace add-repo api <tmp>/repos/api --json`
  - `new change shared-refresh --targets app,api`
  - `apply --change shared-refresh --repo app --json`
  - repeated `apply --change shared-refresh --repo app` to confirm collision behavior

## Results

- `pnpm run build` passed.
- The focused Phase 12 verification slice passed: 5 files, 17/17 tests passed.
- The expanded coverage now proves the Phase 12 acceptance surface:
  - the repo-local change directory name matches the workspace change ID
  - apply writes only to the selected alias
  - stale-path and collision failures are explicit and do not produce silent partial success
  - the `happy-path` fixture repos support the fresh create/add-repo/new-change/apply flow through the built CLI
- The manual smoke matched the automated results:
  - `shared-refresh` materialized only into `app`
  - `api` remained untouched
  - the repeat `app` apply failed with the expected create-only collision

## Blockers and next-step notes

- No blockers remain for Phase 12.
- No new roadmap phases were required from this pass.
- Phase 13 can build status semantics on top of a materially better-tested handoff surface.
