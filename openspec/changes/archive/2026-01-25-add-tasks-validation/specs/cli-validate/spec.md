# cli-validate Spec Delta

## ADDED Requirements

### Requirement: Validator SHALL validate tasks.md format in changes

When validating changes, the validator SHALL check that tasks.md exists, contains at least one checkboxed task, and has no empty task descriptions.

#### Scenario: Missing tasks.md file

- **WHEN** validating a change that does not have tasks.md
- **THEN** report ERROR with message "tasks.md is required for OpenSpec changes"
- **AND** include path "tasks.md" in the issue

#### Scenario: No checkboxed tasks found

- **WHEN** validating a tasks.md file with no items matching pattern `/^[-*]\s+\[[xX\s]\]/`
- **THEN** report ERROR with message "tasks.md must contain at least one checkboxed task"
- **AND** include path "tasks.md" in the issue

#### Scenario: Empty task description detected

- **WHEN** validating a tasks.md file containing a line matching `/^[-*]\s+\[[xX\s]\]\s*$/`
- **THEN** report ERROR with message "Empty task description"
- **AND** include path "tasks.md:N" where N is the line number (1-indexed)

#### Scenario: Valid tasks.md with checkboxed tasks

- **WHEN** validating a tasks.md file with one or more properly formatted checkboxed tasks
- **THEN** report no errors for tasks.md
- **AND** include tasks.md in the validation summary

#### Scenario: Tasks.md validation integrated with change validation

- **WHEN** running `openspec validate <change-id>`
- **THEN** validate proposal.md, spec deltas, and tasks.md
- **AND** display results for all validated files
- **AND** exit with code 1 if any validation fails

### Requirement: Checkbox pattern SHALL match task-progress utility

The tasks.md validator SHALL use the same checkbox detection pattern as `src/utils/task-progress.ts` to ensure consistency across the codebase.

#### Scenario: Checkbox pattern consistency

- **WHEN** detecting checkboxed tasks in tasks.md
- **THEN** use pattern `/^[-*]\s+\[[xX\s]\]/` for checkbox detection
- **AND** accept both lowercase and uppercase X for completed tasks
- **AND** accept both `-` and `*` as list markers
