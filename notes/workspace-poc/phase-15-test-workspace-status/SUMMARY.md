# Phase 15 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Fixed `src/core/workspace/status.ts` so a repo-local change archived under `openspec/changes/archive/` is reported as `archived` instead of silently falling back to `planned`.
- Exported the pure state-derivation helpers from `src/core/workspace/status.ts` and tightened the `soft-done` roll-up so archived targets only count once their archived task file is actually complete.
- Added Phase 15 coverage in:
  - `test/core/workspace/status.test.ts`
  - `test/commands/workflow/status.test.ts`
  - `test/cli-e2e/workspace/workspace-status-cli.test.ts`
- Kept `test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts` in the focused slice to preserve the existing planned-only workspace status contract.
- Created the missing Phase 15 notes and updated the Phase 15 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 15 roadmap block in `ROADMAP.md`.
- Confirmed the Phase 15 notes were missing on disk before implementation.
- Re-inspected the current workspace status implementation and existing coverage:
  - `src/core/workspace/status.ts`
  - `src/commands/workflow/status.ts`
  - `test/core/workspace/status.test.ts`
  - `test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts`
- Built the CLI:
  - `pnpm run build`
- Ran the focused Phase 15 automated slice:
  - `pnpm exec vitest run test/core/workspace/status.test.ts test/commands/workflow/status.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts test/cli-e2e/workspace/workspace-status-cli.test.ts`
- Re-ran the same focused slice in a fresh process after the first pass.
- Ran `git diff --check`.
- Ran a direct built-CLI smoke on copied fixtures outside Vitest:
  - happy-path workspace plus an added `ops` repo to validate `planned`, `materialized`, `archived`, and `blocked` targets in one workspace
  - dirty fixture to validate interruption/resume with `app: in-progress`, `api: planned`, and `docs: blocked`

## Results

- `pnpm run build` passed.
- The focused Phase 15 slice passed twice in fresh Vitest processes: 4 files, 13/13 tests.
- `git diff --check` passed.
- The happy-path CLI smoke showed the intended mixed state matrix:
  - `api: materialized`
  - `app: archived`
  - `docs: blocked`
  - `ops: planned`
- The dirty-fixture CLI smoke showed the intended interruption/resume state:
  - `app: in-progress`
  - `api: planned`
  - `docs: blocked`
- All `status --change <id> --json` outputs stayed parseable and free of ANSI/spinner contamination.

## Blockers and next-step notes

- No blockers remain for Phase 15.
- No new roadmap phases were required from this implementation pass.
- Phase 16 can build explicit workspace completion and `hard-done` behavior on top of the now-tested `planned/materialized/in-progress/archived/blocked/complete` target surface.
