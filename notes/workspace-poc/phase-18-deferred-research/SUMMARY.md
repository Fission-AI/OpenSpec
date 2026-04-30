# Phase 18 Summary

Phase cycle: 1
Stage: `implementation`
Date: 2026-04-17 (Australia/Sydney)

## Changes made

- Added the Phase 18 deferred-research decision in `notes/workspace-poc/phase-18-deferred-research/DECISION.md`.
- Added the missing Phase 18 artifacts:
  - `notes/workspace-poc/phase-18-deferred-research/VERIFY.md`
  - `notes/workspace-poc/phase-18-deferred-research/MANUAL_TEST.md`
- Chose one concrete post-POC direction while keeping the shipped workspace POC contract fixed:
  - shared-contract promotion becomes an explicit future owner-repo command
  - stable project IDs arrive additively on top of the alias-based v0 contract
  - team-shared multi-writer workspace semantics stay out of scope after the POC
- Captured the exact backward-compatible migration seam:
  - optional `repos.<alias>.projectId`
  - optional `local.yaml.projectBindings.<projectId>.path`
  - legacy `targets`, `targets/<alias>/...`, `repoPaths.<alias>`, and `.openspec.materialization.yaml` remain valid during migration
- Updated the Phase 18 checklist in `ROADMAP.md`.

## Tests or research performed

- Re-read the Phase 18 roadmap block in `ROADMAP.md`.
- Confirmed the phase directory was missing and created the Phase 18 artifacts from scratch.
- Re-read the current workspace POC anchors:
  - `WORKSPACE_POC_PRD.md`
  - `WORKSPACE_POC_DECISION_RECORD.md`
  - `notes/workspace-poc/phase-07-open-contract-research/DECISION.md`
  - `notes/workspace-poc/phase-10-materialization-contract-research/DECISION.md`
  - `notes/workspace-poc/phase-13-status-research/DECISION.md`
- Re-inspected the implementation and fixture surfaces that define the shipped contract:
  - `src/core/workspace/metadata.ts`
  - `src/core/workspace/registry.ts`
  - `src/core/workspace/change-create.ts`
  - `src/core/workspace/apply.ts`
  - `src/core/workspace/status.ts`
  - `test/helpers/workspace-assertions.ts`
  - `test/helpers/workspace-sandbox.ts`
  - `test/fixtures/workspace-poc/happy-path/workspace/.openspec/workspace.yaml`
  - `test/fixtures/workspace-poc/happy-path/workspace/.openspec/local.yaml`
- Ran focused automated validation for the current alias, overlay, target-layout, and materialization contract:
  - `pnpm run build`
  - `pnpm exec vitest run test/core/workspace/registry.test.ts test/core/workspace/change-create.test.ts test/core/workspace/open.test.ts test/core/workspace/apply.test.ts test/core/workspace/status.test.ts test/commands/workspace/registry.test.ts test/commands/workspace/open.test.ts test/cli-e2e/workspace/workspace-open-cli.test.ts test/cli-e2e/workspace/workspace-apply-cli.test.ts`
  - `git diff --check`
- Ran a fresh copied-fixture manual smoke with the built CLI against `test/fixtures/workspace-poc/happy-path`:
  - inspected `.openspec/workspace.yaml` and `.openspec/local.yaml`
  - created `shared-refresh` with `new change shared-refresh --targets app,api`
  - materialized `app` with `apply --change shared-refresh --repo app --json`
  - confirmed only `repos/app` received `openspec/changes/shared-refresh`
  - inspected `.openspec.materialization.yaml`

## Results

- `pnpm run build` passed.
- The focused workspace slice passed: 9 files, 39/39 tests.
- `git diff --check` passed.
- The manual smoke confirmed the currently shipped contract the Phase 18 note depends on:
  - committed workspace metadata is still alias-keyed in `.openspec/workspace.yaml`
  - machine-local repo bindings are still alias-keyed in `.openspec/local.yaml`
  - `new change` still records alias targets and creates alias-named target directories
  - `apply` still reuses the same change ID and writes `.openspec.materialization.yaml` with `workspaceName` and `targetAlias`
  - only the selected target repo is modified by `apply`
- `DECISION.md` now cleanly separates deferred post-POC work from the shipped contract, names concrete breakpoints in current tests and fixtures, and identifies an additive migration seam that preserves backward compatibility.

## Blockers and next-step notes

- No blockers remain for Phase 18.
- No new roadmap phase is required for the working POC because this research is explicitly deferred and non-blocking.
- If the post-POC work is pursued later, start with additive `projectId` support and an explicit promotion command rather than changing the current alias-based workspace contract in place.
