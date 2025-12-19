## ADDED Requirements
### Requirement: Refine Workflow Guidance
The AI instructions SHALL describe how to refine an existing change proposal after apply feedback without making code edits.

#### Scenario: Documenting refine usage
- **WHEN** `openspec/AGENTS.md` is generated or updated
- **THEN** include guidance to refine proposal artifacts only when the user requests adjustments after apply feedback
- **AND** specify that refinement updates proposal/design/tasks/spec deltas only
- **AND** state that refine makes no code changes
- **AND** require an explicit re-approval before running apply again
- **AND** instruct that scope expansions should stop and recommend creating a new change
- **AND** include the step to run `openspec validate <change-id> --strict` after refining
