## ADDED Requirements

### Requirement: Consume current apply operation inputs

The `/opsx:apply` skill SHALL consume current project context and apply operation guidance returned by `openspec instructions apply --change "<name>" --json` while preserving its existing state-driven workflow.

#### Scenario: Apply context and guidance are configured

- **WHEN** apply instruction output contains `context` and `operationGuidance`
- **THEN** the skill uses context as project background
- **AND** uses operation guidance as additive advice while implementing pending tasks

#### Scenario: Apply operation inputs are absent

- **WHEN** apply instruction output omits context and operation guidance
- **THEN** the skill continues with its existing apply workflow

#### Scenario: Guidance conflicts with apply state

- **WHEN** context or operation guidance conflicts with CLI-returned state, missing artifacts, tasks, progress, context files, or built-in instruction
- **THEN** the skill treats the CLI-returned apply fields as authoritative
- **AND** does not use guidance to bypass a blocked state or mark tasks complete

#### Scenario: Apply uses runtime inputs as guidance only

- **WHEN** the skill receives context or operation guidance
- **THEN** it does not copy those fields verbatim into implementation files or planning artifacts unless separately requested by the user

### Requirement: Preserve apply workflow behavior

The `/opsx:apply` skill SHALL keep its existing change selection, context loading, task progression, validation, and completion reporting behavior in this change.

#### Scenario: Runtime inputs are consumed

- **WHEN** apply instructions return configured operation inputs
- **THEN** no apply state transition, required implementation task, or completion criterion is added, removed, or replaced solely by this change
