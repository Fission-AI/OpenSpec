# opsx-verify-skill Delta Spec

## ADDED Requirements

### Requirement: Lifecycle Hook Execution

The verify skill SHALL execute lifecycle hooks at the pre-verify and post-verify points.

#### Scenario: Pre-verify hooks exist

- **WHEN** the agent begins the verify operation
- **AND** hooks are defined for the `pre-verify` lifecycle point
- **THEN** the agent retrieves hook instructions via `openspec instructions --hook pre-verify --change "<name>" --json`
- **AND** follows each hook instruction in order (schema hooks first, then config hooks)
- **AND** proceeds with the verify operation after completing hook instructions

#### Scenario: Post-verify hooks exist

- **WHEN** the verify operation completes successfully
- **AND** hooks are defined for the `post-verify` lifecycle point
- **THEN** the agent retrieves hook instructions via `openspec instructions --hook post-verify --change "<name>" --json`
- **AND** follows each hook instruction in order (schema hooks first, then config hooks)

#### Scenario: No hooks defined

- **WHEN** no hooks are defined for `pre-verify` or `post-verify`
- **THEN** the agent proceeds with the verify operation as normal
- **AND** no additional steps are added

#### Scenario: Hook instruction references change context

- **WHEN** a hook instruction references the change name or change artifacts
- **THEN** the agent uses its knowledge of the current operation context to fulfill the instruction
