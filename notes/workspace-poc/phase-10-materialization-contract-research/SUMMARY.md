# Phase 10 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Added the Phase 10 research decision in `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`.
- Added Phase 10 verification and manual-test artifacts:
  - `notes/workspace-poc/phase-10-materialization-contract-research/VERIFY.md`
  - `notes/workspace-poc/phase-10-materialization-contract-research/MANUAL_TEST.md`
- Chose one concrete v0 materialization contract for `openspec apply --change <id> --repo <alias>`:
  - create-only
  - no overwrite
  - no refresh path
  - explicit repeat-apply failure for the same target repo
  - minimal sidecar trace metadata in `.openspec.materialization.yaml`
- Defined the repo-local bundle shape as:
  - shared context copied from workspace root: `proposal.md`, `design.md`
  - target slice copied from `targets/<alias>/`: `tasks.md`, `specs/`
  - no workspace coordination artifacts copied into the repo-local change
- Updated the Phase 10 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 10 and Phase 11 blocks in `ROADMAP.md`.
- Reviewed the current workspace and apply-adjacent implementation surface in:
  - `src/core/workspace/open.ts`
  - `src/core/workspace/change-create.ts`
  - `src/utils/change-metadata.ts`
  - `src/core/artifact-graph/types.ts`
  - `schemas/spec-driven/schema.yaml`
  - `src/cli/index.ts`
- Re-read prior workspace POC notes and design anchors in:
  - `notes/workspace-poc/phase-07-open-contract-research/DECISION.md`
  - `notes/workspace-poc/phase-09-test-workspace-open/{SUMMARY.md,VERIFY.md}`
  - `WORKSPACE_POC_PRD.md`
  - `WORKSPACE_POC_DECISION_RECORD.md`
- Ran focused workspace regression coverage:
  - `pnpm vitest run test/core/workspace/change-create.test.ts test/core/workspace/open.test.ts test/commands/workspace/open.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts test/cli-e2e/workspace/workspace-open-cli.test.ts`
- Ran a fresh copied-fixture CLI smoke against `test/fixtures/workspace-poc/happy-path` using the built CLI:
  - `node dist/cli/index.js new change shared-refresh --targets app,api`
  - `node dist/cli/index.js workspace open --change shared-refresh --agent claude`
  - verified `repos/{app,api,docs}/openspec/changes/shared-refresh` remained absent
- Corrected one invalid manual harness attempt during this run:
  - an initial smoke used `pnpm exec` from the copied temp workspace, which is not a package
  - reran successfully with `node dist/cli/index.js` from the repository build output

## Results

- Focused workspace tests passed: 5 files, 19/19 tests passed.
- The current implementation boundary still holds:
  - workspace changes centralize planning and target metadata
  - `workspace open` remains read-only
  - the user-facing handoff to `apply --change --repo` is already explicit in the open surface
- The chosen v0 contract is consistent with both the roadmap guardrails and the current implementation surface:
  - create-only avoids inventing refresh semantics before they are tested
  - copying shared context plus one target slice produces a usable repo-local execution bundle
  - a sidecar trace file is enough for later roll-up without broadening core change metadata now

## Blockers and next-step notes

- No blockers remain for Phase 10.
- No new roadmap phases were required from this research pass.
- Phase 11 should implement exactly the create-only contract captured in `DECISION.md` and should not add refresh or overwrite behavior unless the roadmap is expanded first.
