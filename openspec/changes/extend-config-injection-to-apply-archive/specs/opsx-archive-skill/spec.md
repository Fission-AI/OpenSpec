## ADDED Requirements

### Requirement: Load current archive operation inputs

The `/opsx:archive` skill SHALL request current archive operation inputs after resolving the target change and selected planning root, while preserving its existing archive workflow.

#### Scenario: Archive context and guidance are configured

- **WHEN** the skill has selected a change
- **AND** current config contains project context and `operations.archive.guidance`
- **THEN** the skill calls `openspec instructions archive --change "<name>" --json` with the selected-root context
- **AND** uses returned context as project background
- **AND** uses returned operation guidance as additive advice for the archive workflow

#### Scenario: Archive operation inputs are absent

- **WHEN** archive instruction output omits context and operation guidance
- **THEN** the skill continues with its existing archive workflow

#### Scenario: Archive guidance conflicts with the workflow

- **WHEN** returned guidance conflicts with a built-in archive step, explicit user choice, resolved path, or command contract
- **THEN** the skill keeps the existing workflow behavior authoritative
- **AND** does not infer replacement paths, skipped prompts, or command flags from the guidance

#### Scenario: Archive uses guidance as input only

- **WHEN** the skill receives context or operation guidance
- **THEN** it does not copy those fields verbatim into specs, change artifacts, or archive summaries unless separately requested by the user

### Requirement: Preserve archive execution behavior

The `/opsx:archive` skill SHALL keep its existing completion checks, task checks, spec-sync decision, confirmation behavior, archive move, and completion summary in this change.

#### Scenario: Runtime inputs are loaded

- **WHEN** archive instructions return configured inputs
- **THEN** no archive execution phase, filesystem operation, or user decision is added, removed, or reordered solely by this change
