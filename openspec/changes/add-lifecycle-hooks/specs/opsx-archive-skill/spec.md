# opsx-archive-skill Delta Spec

## ADDED Requirements

### Requirement: Lifecycle Hook Execution

The archive skill SHALL execute lifecycle hooks at the pre-archive and post-archive points.

#### Scenario: Pre-archive hooks exist

- **WHEN** the agent begins the archive operation
- **AND** hooks are defined for the `pre-archive` lifecycle point
- **THEN** the agent retrieves hook instructions via `openspec instructions --hook pre-archive --change "<name>" --json`
- **AND** follows each hook instruction in order (schema hooks first, then config hooks)
- **AND** proceeds with the archive operation after completing hook instructions

#### Scenario: Post-archive hooks exist

- **WHEN** the archive operation completes successfully (change moved to archive)
- **AND** hooks are defined for the `post-archive` lifecycle point
- **THEN** the agent retrieves hook instructions via `openspec instructions --hook post-archive --change "<name>" --json`
- **AND** follows each hook instruction in order (schema hooks first, then config hooks)

#### Scenario: No hooks defined

- **WHEN** no hooks are defined for `pre-archive` or `post-archive`
- **THEN** the agent proceeds with the archive operation as normal
- **AND** no additional steps are added

#### Scenario: Hook instruction references change context

- **WHEN** a hook instruction references the change name, archived location, or change artifacts
- **THEN** the agent uses its knowledge of the current operation context to fulfill the instruction
