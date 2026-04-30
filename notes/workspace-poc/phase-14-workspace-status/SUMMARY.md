# Phase 14 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Added workspace-aware status roll-up in `src/core/workspace/status.ts`.
- Extended `src/commands/workflow/status.ts` so `openspec status --change <id>` detects targeted workspace changes and uses the workspace roll-up instead of the repo-local artifact graph.
- Implemented the Phase 14 state model:
  - overall workspace change: `planned`, `in-progress`, `blocked`, `soft-done`, `hard-done`
  - coordination: `planned`, `in-progress`, `blocked`, `complete`
  - targets: `planned`, `materialized`, `in-progress`, `blocked`, `complete`
- Rolled coordination state from `tasks/coordination.md`.
- Rolled target state from workspace draft tasks before materialization and from repo-local `tasks.md` after validating `.openspec.materialization.yaml`.
- Kept JSON output small and stable:
  - `change.id`
  - `change.state`
  - `coordination.state`
  - `coordination.tasks`
  - `coordination.problems`
  - sorted `targets[]` with `alias`, `state`, `source`, `tasks`, and `problems`
- Kept blocked output honest by reporting missing local overlay entries, stale repo paths, missing repo-local OpenSpec state, invalid materialization traces, and unreadable task files instead of inferring progress.
- Added focused Phase 14 coverage in:
  - `test/core/workspace/status.test.ts`
  - `test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- Updated the Phase 14 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 14 roadmap block in `ROADMAP.md`.
- Re-read the Phase 13 decision in `notes/workspace-poc/phase-13-status-research/DECISION.md`.
- Re-reviewed the current workspace implementation surface:
  - `src/core/workspace/change-create.ts`
  - `src/core/workspace/apply.ts`
  - `src/core/workspace/registry.ts`
  - `src/utils/task-progress.ts`
- Built the CLI:
  - `pnpm run build`
- Ran the repository test suite after the implementation landed:
  - `pnpm test -- test/core/workspace/status.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
  - Result: Vitest ran the full suite; 87 files passed, 1453/1453 tests passed
- Ran the focused Phase 14 verification slice in a fresh process:
  - `pnpm exec vitest run test/core/workspace/status.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- Ran a fresh copied-fixture CLI smoke outside Vitest:
  - happy-path fixture: created `manual-status`, checked `planned`, materialized `app`, then completed coordination plus both repo-local task files to confirm `soft-done`
  - dirty fixture: created `docs-repair` and confirmed blocked status for the stale `docs` repo path

## Results

- `pnpm run build` passed.
- The full Vitest suite passed: 87 files, 1453/1453 tests.
- The focused Phase 14 verification slice passed: 2 files, 6/6 tests.
- The workspace status contract now behaves as intended:
  - planning-only targets stay `planned` with `source: "workspace"`
  - valid repo-local materializations show `materialized` at `0/n` or `0/0`
  - partial repo-local progress shows `in-progress`
  - stale repo paths and invalid materialization traces show `blocked`
  - `soft-done` appears only after coordination and every target are task-complete
  - `hard-done` is not inferred and remained absent in the manual smoke
- The JSON output stayed machine-readable with no spinner contamination or ANSI escape sequences.

## Blockers and next-step notes

- No blockers remain for Phase 14.
- No new roadmap phases were required from this implementation pass.
- Phase 15 can expand the status validation matrix, but the Phase 14 build contract is now implemented and passing.
