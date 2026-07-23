## ADDED Requirements

### Requirement: Apply instructions include current operation inputs

The system SHALL include current project context and apply operation guidance as separate optional fields in schema-aware apply instruction output without changing existing apply state behavior.

#### Scenario: Apply JSON contains context and guidance

- **WHEN** a user runs `openspec instructions apply --change <id> --json`
- **AND** config contains project context and `operations.apply.guidance`
- **THEN** the JSON contains separate `context` and `operationGuidance` fields
- **AND** preserves existing apply state, task, progress, context-file, reference, and root fields

#### Scenario: Apply text contains context and guidance

- **WHEN** a user runs `openspec instructions apply --change <id>` with configured context and apply guidance
- **THEN** text output labels project context and operation guidance as separate advisory sections
- **AND** preserves the built-in apply instruction content

#### Scenario: Apply has artifact rules only

- **WHEN** config contains artifact rules but no apply operation guidance
- **THEN** apply instruction output does not expose artifact rules as operation guidance

#### Scenario: Apply reads current config

- **WHEN** config changes between two apply instruction calls
- **THEN** the second output reflects the current context and apply guidance

#### Scenario: Apply operation inputs are absent

- **WHEN** config has no non-empty context or apply guidance
- **THEN** apply output omits both optional fields
- **AND** otherwise matches existing apply behavior
