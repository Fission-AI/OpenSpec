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

### Requirement: Consume operation context as required agent instruction

The system SHALL identify returned operation context as a required agent instruction input with the same prompt-level consumption expectation as the built-in instruction. Context supplies applicable project facts, conventions, and constraints without becoming output content or replacing CLI-controlled workflow state.

#### Scenario: Skill applies project context

- **WHEN** an apply or archive skill receives project context
- **THEN** the skill tells the agent to read and consider the context
- **AND** apply its relevant project facts, conventions, and constraints while performing the operation
- **AND** the workflow does not automatically insert the context into an output file

#### Scenario: Context conflicts with controlling workflow input

- **WHEN** project context conflicts with a built-in workflow step, explicit user choice, resolved path, CLI-controlled state, or command contract
- **THEN** the skill reports the conflict
- **AND** does not use context to replace or bypass the controlling workflow input
- **AND** does not claim that prompt text can enforce agent compliance
