# Phase 21 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Extended committed workspace repo metadata in `src/core/workspace/metadata.ts` to support optional `owner` and `handoff` fields alongside existing repo entries, with validation and backward-compatible reads for older ownerless workspaces.
- Extended `src/core/workspace/registry.ts` so:
  - `addWorkspaceRepo()` can capture optional owner or handoff guidance at registration time
  - a new `updateWorkspaceRepoGuidance()` path updates committed owner or handoff metadata for an already-registered alias without touching `.openspec/local.yaml`
- Updated `src/commands/workspace.ts` to ship the CLI surface for Phase 21:
  - `openspec workspace add-repo <alias> <path> [--owner ...] [--handoff ...]`
  - `openspec workspace update-repo <alias> [--owner ...] [--handoff ...]`
  - refreshed `workspace --help` descriptions to make workspace mode explicitly about cross-repo planning
- Surfaced owner or handoff information anywhere this phase required it:
  - `src/core/workspace/open.ts` now includes repo owner or handoff guidance in attached repo JSON plus the generated instruction surface
  - `src/core/workspace/status.ts` now includes repo owner or handoff guidance in workspace target JSON and text rendering
  - `src/commands/workspace.ts` text output for `workspace open` also renders the same guidance
- Added shipped user-facing guidance:
  - new guide: `docs/workspace.md`
  - linked from `README.md`
  - linked and summarized in `docs/cli.md`
- Added focused regression coverage for the new metadata contract and surfaces:
  - `test/core/workspace/registry.test.ts`
  - `test/core/workspace/open.test.ts`
  - `test/commands/workspace/registry.test.ts`
  - `test/commands/workflow/status.test.ts`
  - `test/cli-e2e/workspace/workspace-create-cli.test.ts`
  - `test/cli-e2e/workspace/workspace-registry-cli.test.ts`
  - `test/cli-e2e/workspace/workspace-open-cli.test.ts`
  - `test/cli-e2e/workspace/workspace-status-cli.test.ts`
- Created the missing Phase 21 notes and marked the Phase 21 checklist complete in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 21 roadmap block in `ROADMAP.md`.
- Confirmed the Phase 21 summary, verification, and manual-test artifacts were missing on disk before implementation.
- Re-read the current PRD gap audit in:
  - `notes/workspace-poc/phase-20-prd-audit/SUMMARY.md`
  - `notes/workspace-poc/phase-20-prd-audit/VERIFY.md`
- Re-inspected the touched implementation boundary:
  - `src/core/workspace/metadata.ts`
  - `src/core/workspace/registry.ts`
  - `src/core/workspace/open.ts`
  - `src/core/workspace/status.ts`
  - `src/commands/workspace.ts`
  - `docs/cli.md`
  - `README.md`
- Built the CLI:
  - `pnpm run build`
- Ran the focused workspace regression slice:
  - `pnpm exec vitest run test/core/workspace/*.test.ts test/commands/workspace/*.test.ts test/commands/workflow/status.test.ts test/cli-e2e/workspace/*.test.ts`
- Ran `git diff --check`.
- Checked the shipped help and doc surfaces:
  - `node dist/cli/index.js workspace --help`
  - `rg -n "Workspace Mode|when to use cross-repo workspaces|workspace update-repo|When To Use Workspace Mode|Supported CLI Flow|Hand Off Work To Another Repo Owner" README.md docs/cli.md docs/workspace.md`
- Ran a fresh built-CLI manual smoke in an isolated temp workspace:
  - created a new workspace via `workspace create`
  - registered `app` and `api` with owner or handoff metadata
  - created `owner-visibility` with `--targets app,api`
  - updated the `api` handoff note with `workspace update-repo`
  - checked `workspace open --change owner-visibility --json`
  - checked `status --change owner-visibility --json`

## Results

- `pnpm run build` passed.
- The focused workspace regression slice passed: 21 files, 77/77 tests.
- `git diff --check` passed.
- The shipped workspace contract now supports optional committed repo guidance without path leakage:
  - `.openspec/workspace.yaml` stores `owner` and `handoff` only when configured
  - `.openspec/local.yaml` remains the only place local repo paths are stored
- The new CLI path is backward-compatible and phase-scoped:
  - existing `workspace add-repo <alias> <path>` behavior still works unchanged
  - `workspace add-repo` can now capture guidance on first registration
  - `workspace update-repo` updates that guidance later without modifying the local overlay
- Owner or handoff visibility now appears on the existing workspace surfaces this phase targeted:
  - `workspace open` text and JSON
  - generated workspace-open instruction content
  - workspace-aware `status` text and JSON
- Existing ownerless workspaces remained readable:
  - the full workspace regression slice still passed
  - Phase 19 acceptance CLI coverage still passed inside the same run
- Fresh-user guidance is now shipped in-repo instead of being implied by roadmap notes:
  - `README.md` links to `docs/workspace.md`
  - `docs/cli.md` now exposes workspace mode in the CLI reference
  - `docs/workspace.md` explains when to use workspace mode, the supported CLI flow, and how to re-enter or hand off in-flight work

## Blockers and next-step notes

- No blockers remain for Phase 21.
- No new roadmap phases were required from this implementation pass.
- Phase 22 can now validate the shipped owner or handoff surfaces and workspace guidance in a fresh verification-focused pass.
