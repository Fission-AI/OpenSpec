## ADDED Requirements

### Requirement: Expose current context to operation instruction surfaces

The system SHALL expose project context to apply and archive instruction output by reading the current config from the selected planning root at execution time.

#### Scenario: Apply requests current context

- **WHEN** a user requests apply instructions and config contains project context
- **THEN** apply output includes that context as a structured optional field

#### Scenario: Archive requests current context

- **WHEN** a user requests archive instructions and config contains project context
- **THEN** archive output includes that context as a structured optional field

#### Scenario: Selected store supplies context

- **WHEN** apply or archive instructions target a selected store
- **THEN** context is read from that store's resolved config rather than the current repository config

#### Scenario: Context changes between operations

- **WHEN** project context changes after one instruction call
- **THEN** the next apply or archive instruction call receives the updated context

#### Scenario: Context is absent

- **WHEN** project config has no non-empty context
- **THEN** apply and archive structured outputs omit the context field

### Requirement: Keep operation context separate from output files

The system SHALL identify operation context as agent input that is not automatically copied into implementation output, specs, change artifacts, archive summaries, or archived files.

#### Scenario: Skill uses context as background

- **WHEN** an apply or archive skill receives project context
- **THEN** the context is available as background guidance
- **AND** the workflow does not automatically insert the context into an output file
