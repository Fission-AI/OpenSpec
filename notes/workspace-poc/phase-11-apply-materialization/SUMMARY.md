# Phase 11 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Added a real top-level `openspec apply` command that materializes one targeted workspace change into one selected repo with `--change <id> --repo <alias>`.
- Added shared workspace-change resolution in `src/core/workspace/change.ts` so `workspace open` and `apply` use the same change lookup and target metadata rules.
- Added the Phase 11 materialization engine in `src/core/workspace/apply.ts`:
  - resolves the workspace root and selected repo alias
  - validates unknown vs untargeted aliases distinctly
  - validates required workspace source artifacts for the selected target slice
  - stages a repo-local bundle under `openspec/changes/` and atomically renames it into place
  - reuses the workspace change ID in the target repo
  - writes `.openspec.materialization.yaml` with the minimum trace metadata from Phase 10
  - keeps workspace planning artifacts untouched
- Made the authority handoff explicit in the CLI success output: workspace target slice before `apply`, repo-local execution surface after `apply`.
- Added focused Phase 11 coverage in:
  - `test/core/workspace/apply.test.ts`
  - `test/cli-e2e/workspace/workspace-apply-cli.test.ts`
- Updated the Phase 11 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 11 block in `ROADMAP.md`.
- Re-read the Phase 10 contract in `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`.
- Reviewed the current workspace implementation boundary in:
  - `src/core/workspace/open.ts`
  - `src/core/workspace/registry.ts`
  - `src/core/workspace/change-create.ts`
  - `src/utils/change-metadata.ts`
- Built the CLI:
  - `pnpm run build`
- Ran the focused Phase 11 regression slice:
  - `pnpm vitest run test/core/workspace/apply.test.ts test/core/workspace/change-create.test.ts test/core/workspace/open.test.ts test/commands/workspace/open.test.ts test/cli-e2e/workspace/workspace-apply-cli.test.ts test/cli-e2e/workspace/workspace-targeted-change-create-cli.test.ts test/cli-e2e/workspace/workspace-open-cli.test.ts`
- Ran a fresh copied-fixture CLI smoke using `test/fixtures/workspace-poc/happy-path`:
  - created `shared-refresh` with `new change --targets app,api`
  - seeded the target slice files
  - ran `apply --change shared-refresh --repo app`
  - re-ran `apply` for the same alias to confirm create-only collision behavior
  - ran `apply` for `docs` and `missing` to confirm untargeted and unknown alias failures

## Results

- `pnpm run build` passed.
- The focused workspace regression slice passed: 7 files, 23/23 tests passed.
- The new `apply` flow now satisfies the Phase 11 contract:
  - repo-local materialization uses the same change ID as the workspace change
  - only the selected target repo is modified
  - unknown and untargeted aliases fail with distinct target-selection errors
  - repeating `apply` for the same target repo fails with a create-only collision
  - applying the same change to a different targeted alias still works
  - workspace drafts remain intact after successful materialization
- The repo-local bundle shape matches the Phase 10 decision:
  - `.openspec.yaml`
  - `proposal.md`
  - `design.md`
  - `tasks.md`
  - `specs/`
  - `.openspec.materialization.yaml`

## Blockers and next-step notes

- No blockers remain for Phase 11.
- No new roadmap phases were required from this implementation pass.
- Phase 12 can now focus on expanding the materialization test matrix rather than defining or changing the contract.
