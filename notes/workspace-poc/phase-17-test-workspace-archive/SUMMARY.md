# Phase 17 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Added command-level workspace archive coverage in `test/commands/archive.workspace.test.ts`.
- Added CLI e2e workspace archive coverage in `test/cli-e2e/workspace/workspace-archive-cli.test.ts`.
- Covered the missing Phase 17 scenarios directly:
  - one repo archived while another repo remains in-progress
  - `soft-done` before explicit workspace archive
  - `hard-done` only after explicit workspace archive
  - repo-local archive behavior still working outside workspace flows
- Created the missing Phase 17 notes and updated the Phase 17 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 17 roadmap block in `ROADMAP.md`.
- Re-read the shipped Phase 16 archive/status notes to preserve the intended repo-local versus workspace ownership boundary:
  - `notes/workspace-poc/phase-16-workspace-archive/SUMMARY.md`
  - `notes/workspace-poc/phase-16-workspace-archive/VERIFY.md`
- Re-inspected the current archive/status implementation and existing coverage:
  - `src/core/archive.ts`
  - `src/core/workspace/archive.ts`
  - `src/core/workspace/status.ts`
  - `test/core/archive.test.ts`
  - `test/core/workspace/archive.test.ts`
  - `test/core/workspace/status.test.ts`
  - `test/commands/workflow/status.test.ts`
- Built the CLI:
  - `pnpm run build`
- Ran the focused Phase 17 automated slice:
  - `pnpm exec vitest run test/core/archive.test.ts test/core/workspace/archive.test.ts test/core/workspace/status.test.ts test/commands/workflow/status.test.ts test/commands/archive.workspace.test.ts test/cli-e2e/workspace/workspace-status-cli.test.ts test/cli-e2e/workspace/workspace-archive-cli.test.ts`
- Ran `git diff --check`.
- Ran a direct built-CLI smoke on copied happy-path fixtures outside Vitest for:
  - staggered repo archive with top-level status still `in-progress`
  - `soft-done` before `archive --workspace`
  - `hard-done` after `archive --workspace`

## Results

- `pnpm run build` passed.
- The focused Phase 17 automated slice passed: 7 files, 42/42 tests.
- `git diff --check` passed.
- The new command and CLI coverage proved the expected boundaries:
  - repo-local archive can happen while another target is still active without forcing top-level done
  - overall status stays `soft-done` until the explicit workspace archive happens
  - explicit workspace archive flips only the workspace change to `hard-done`
  - repo-local archive behavior outside workspace flows still works unchanged
- The direct CLI smoke confirmed the intended user-visible sequence on copied fixtures:
  - staggered case: `app` archived, `api` in-progress, overall workspace `in-progress`
  - completion case before workspace archive: overall workspace `soft-done`
  - completion case after workspace archive: overall workspace `hard-done`
  - the workspace change metadata gained `workspaceArchivedAt`
  - the repo-local archived copy remained under `repos/app/openspec/changes/archive/`

## Blockers and next-step notes

- No blockers remain for Phase 17.
- No new roadmap phases were required from this implementation pass.
- Phase 18 can stay focused on the deferred research list rather than archive/status regression work.
