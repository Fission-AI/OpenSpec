# specs-sync-skill Delta Spec

## ADDED Requirements

### Requirement: Lifecycle Hook Execution

The sync skill SHALL execute lifecycle hooks at the pre-sync and post-sync points.

#### Scenario: Pre-sync hooks exist

- **WHEN** the agent begins the sync operation
- **AND** hooks are defined for the `pre-sync` lifecycle point
- **THEN** the agent retrieves hook instructions via `openspec hooks pre-sync --change "<name>" --json`
- **AND** follows each hook instruction in order (schema hooks first, then config hooks)
- **AND** proceeds with the sync operation after completing hook instructions

#### Scenario: Post-sync hooks exist

- **WHEN** the sync operation completes successfully
- **AND** hooks are defined for the `post-sync` lifecycle point
- **THEN** the agent retrieves hook instructions via `openspec hooks post-sync --change "<name>" --json`
- **AND** follows each hook instruction in order (schema hooks first, then config hooks)

#### Scenario: No hooks defined

- **WHEN** no hooks are defined for `pre-sync` or `post-sync`
- **THEN** the agent proceeds with the sync operation as normal
- **AND** no additional steps are added
