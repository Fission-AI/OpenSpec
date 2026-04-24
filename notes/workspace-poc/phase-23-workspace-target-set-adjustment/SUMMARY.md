# Phase 23 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Added a new explicit command path, `openspec workspace targets <change>`, with `--add` and `--remove` options plus JSON output in `src/commands/workspace.ts`.
- Implemented the target-set mutation engine in `src/core/workspace/target-set.ts`:
  - validates add or remove requests against the workspace registry
  - appends added aliases to the current target set
  - removes unmaterialized aliases by deleting their per-target draft slice
  - blocks mutations when the alias already has repo-local active or archived execution
  - rolls back filesystem mutations if metadata write fails
- Refactored `src/core/workspace/change-create.ts` to export shared target-scaffolding helpers so new target slices reuse the same draft layout as `new change --targets`.
- Updated `src/core/workspace/change.ts` so missing-target remediation points to the new command path instead of manual file edits.
- Added Phase 23 regression coverage:
  - `test/core/workspace/target-set.test.ts`
  - `test/commands/workspace/targets.test.ts`
  - `test/cli-e2e/workspace/workspace-target-set-cli.test.ts`
  - `test/commands/workspace/help.test.ts`
  - `test/cli-e2e/workspace/workspace-guidance-cli.test.ts`
- Updated shipped docs for the new command and guardrail:
  - `docs/workspace.md`
  - `docs/cli.md`
- Marked Phase 23 complete in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 23 roadmap block in `ROADMAP.md`.
- Confirmed the Phase 23 notes directory was missing before this run.
- Rebuilt the CLI:
  - `pnpm run build`
- Ran the focused Phase 23 regression slice:
  - `pnpm exec vitest run test/core/workspace/target-set.test.ts test/core/workspace/open.test.ts test/core/workspace/apply.test.ts test/core/workspace/status.test.ts test/commands/workspace/targets.test.ts test/commands/workspace/help.test.ts test/cli-e2e/workspace/workspace-target-set-cli.test.ts test/cli-e2e/workspace/workspace-guidance-cli.test.ts`
- Ran the broader workspace regression slice:
  - `pnpm exec vitest run test/core/workspace/*.test.ts test/commands/workspace/*.test.ts test/commands/workflow/apply.test.ts test/commands/workflow/status.test.ts test/commands/workflow/new-change.workspace.test.ts test/cli-e2e/workspace/*.test.ts`
- Ran `git diff --check`.
- Ran a fresh built-CLI manual smoke on copied `happy-path` fixtures covering:
  - add target after change creation
  - remove unmaterialized target
  - reject removal after repo-local materialization

## Results

- `pnpm run build` passed.
- The focused Phase 23 slice passed: 8 files, 32/32 tests.
- The broader workspace regression slice passed: 28 files, 98/98 tests.
- `git diff --check` passed.
- The new command updates `.openspec.yaml` plus `targets/<alias>/` draft slices without requiring manual metadata edits.
- `workspace open`, `apply`, and workspace-aware `status` all honor the adjusted target set:
  - added targets immediately appear in open and status, and can be materialized with `apply`
  - removed unmaterialized targets disappear from open and status, and `apply` rejects them as untargeted
- Guardrails now prevent silent authority drift:
  - removing a materialized target fails with an explicit authority-handoff error
  - adding an alias that already has same-ID repo-local execution also fails
- The fresh manual smoke passed:
  - added `docs` showed up in status and materialized successfully
  - removing materialized `docs` failed with the explicit guardrail
  - removing unmaterialized `docs` on a second change removed the draft slice cleanly and left only `app` and `api` in open or status

## Blockers and next-step notes

- No blockers remain for Phase 23.
- No new roadmap phases were required from this implementation pass.
