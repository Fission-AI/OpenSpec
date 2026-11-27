## ADDED Requirements

### Requirement: Handle Archive lifecycle checkpoints per change

The `/opsx:bulk-archive` skill and command SHALL act on optional `lifecycle` and `lifecycleError` fields of their single `openspec instructions archive --json` read for the selected root, applying them to every change in the batch. They SHALL NOT call `openspec lifecycle actions`. A failed lookup SHALL still never block the batch.

#### Scenario: Before actions configured

- **WHEN** the archive read includes `lifecycle.before`
- **THEN** the skill handles those actions once for each archived change, before syncing that change's specs or moving it

#### Scenario: Completed actions configured

- **WHEN** the archive read includes `lifecycle.completed`
- **AND** a change folder has moved to the archive
- **THEN** the skill handles those actions once for that change, whether or not its specs were synced

#### Scenario: Invalid lifecycle config

- **WHEN** the archive read includes `lifecycleError`
- **THEN** the skill reports its `issues` and `fix` and stops the whole batch before any main-spec write or change move
