# Tasks: Unify Change State Model

## Phase 1: Fix Artifact Workflow Discovery

- [x] Update `validateChangeExists()` in `artifact-workflow.ts` to check directory existence instead of using `getActiveChangeIds()`
- [x] Update error message to list all change directories (not just those with proposal.md)
- [x] Add test for `openspec status --change <scaffolded-change>`
- [x] Add test for `openspec next --change <scaffolded-change>`
- [x] Add test for `openspec instructions proposal --change <scaffolded-change>`

## Phase 2: Fix View Command

- [x] Update `getChangesData()` in `view.ts` to return three categories: draft, active, completed
- [x] Fix completion logic: `total === 0` → draft, not completed
- [x] Add "Draft Changes" section to dashboard rendering
- [x] Update summary to include draft count
- [x] Add test for draft changes appearing correctly in view

## Phase 3: Cleanup and Validation

- [x] Clean up test changes (`test-workflow`, `test-workflow-2`)
- [x] Run full test suite
- [x] Manual test: `openspec new change foo && openspec status --change foo`
- [x] Manual test: `openspec new change foo && openspec view` shows foo in Draft
- [x] Validate with `openspec validate unify-change-state-model --strict`
