## ADDED Requirements

### Requirement: Handle Archive lifecycle checkpoints

The `/opsx:archive` skill and command SHALL act on optional `lifecycle` and `lifecycleError` fields of their existing `openspec instructions archive --json` read. They SHALL NOT call `openspec lifecycle actions`. A failed lookup SHALL still never block archiving.

#### Scenario: Before actions configured

- **WHEN** the archive read includes `lifecycle.before`
- **THEN** the skill handles those actions once, following `lifecycle.handling`, before syncing specs or moving the change

#### Scenario: Completed actions configured

- **WHEN** the archive read includes `lifecycle.completed`
- **AND** the change folder has moved to the archive
- **THEN** the skill handles those actions once, following `lifecycle.handling`
- **AND** does so whether specs were synced, sync was skipped, or the change had no delta specs

#### Scenario: Invalid lifecycle config

- **WHEN** the archive read includes `lifecycleError`
- **THEN** the skill reports its `issues` and `fix` and stops before syncing specs or moving the change

#### Scenario: Older CLI or failed lookup

- **WHEN** the archive read omits both fields, exits non-zero, or returns invalid JSON
- **THEN** the skill archives as before with no lifecycle actions
