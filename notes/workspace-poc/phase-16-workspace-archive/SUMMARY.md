# Phase 16 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Added the lean explicit workspace completion path on the existing archive surface: `openspec archive <id> --workspace`.
- Implemented workspace archive handling in `src/core/workspace/archive.ts` and routed `src/core/archive.ts` to it only when `--workspace` is present, leaving repo-local archive behavior unchanged by default.
- Recorded explicit workspace-level hard-done state in workspace change metadata via a new optional `workspaceArchivedAt` field on `.openspec.yaml`.
- Updated `src/core/workspace/status.ts` so `hard-done` is derived only from that explicit workspace archive marker.
- Kept repo-local archive semantics repo-local:
  - repo-local archive still moves only the repo-local change under `openspec/changes/archive/`
  - workspace archive does not move repo-local changes or touch canonical repo-local specs
- Added focused Phase 16 coverage in `test/core/workspace/archive.test.ts`.
- Extended `test/utils/change-metadata.test.ts` so the new workspace archive marker is parsed and persisted correctly.
- Re-ran the existing repo-local archive and workspace status regression coverage to prove the new path did not collapse the repo/local boundary.
- Created the missing Phase 16 notes and updated the Phase 16 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 16 roadmap block in `ROADMAP.md`.
- Confirmed the Phase 16 phase artifacts were missing on disk before implementation.
- Re-read the Phase 13 decision and the Phase 15 status/archive notes to preserve the documented `soft-done` versus explicit `hard-done` boundary.
- Re-inspected the touched implementation boundary:
  - `src/core/archive.ts`
  - `src/core/workspace/status.ts`
  - `src/utils/change-metadata.ts`
  - `src/core/artifact-graph/types.ts`
- Built the CLI:
  - `pnpm run build`
- Ran the focused Phase 16 automated slice:
  - `pnpm exec vitest run test/core/archive.test.ts test/core/workspace/status.test.ts test/core/workspace/archive.test.ts test/utils/change-metadata.test.ts`
- Ran `git diff --check`.
- Ran a direct built-CLI smoke on copied `happy-path` fixtures outside Vitest:
  - created `manual-phase16` for `app,api`
  - materialized both targets
  - completed coordination plus both repo-local task files
  - archived the repo-local `app` change
  - confirmed workspace status was still `soft-done`
  - ran `openspec archive manual-phase16 --workspace`
  - confirmed workspace status became `hard-done` and `.openspec.yaml` gained `workspaceArchivedAt`

## Results

- `pnpm run build` passed.
- The focused Phase 16 automated slice passed: 4 files, 57/57 tests.
- `git diff --check` passed.
- Repo-local archive no longer risks implying workspace completion:
  - before the explicit workspace archive, status reported `soft-done`
  - after `archive --workspace`, status reported `hard-done`
- The direct CLI smoke confirmed the intended separation of concerns:
  - `app` remained archived only in `repos/app/openspec/changes/archive/...`
  - the workspace change remained present at `workspace/changes/manual-phase16/`
  - the workspace metadata, not repo-local archive activity, became the source of truth for `hard-done`
- Mixed repo cadences remained valid:
  - `api` stayed `complete`
  - `app` stayed `archived`
  - the overall workspace still transitioned cleanly from `soft-done` to `hard-done`

## Blockers and next-step notes

- No blockers remain for Phase 16.
- No new roadmap phases were required from this implementation pass.
- Phase 17 can now expand the command/CLI regression matrix around this shipped `--workspace` hard-done path.
