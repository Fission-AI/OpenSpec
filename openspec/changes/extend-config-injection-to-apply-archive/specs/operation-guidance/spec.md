## ADDED Requirements

### Requirement: Configure operation guidance

The system SHALL allow projects to configure additive advice for supported operations under `operations.<operation>.guidance` without treating that guidance as an artifact rule, the built-in workflow, or an enforceable check.

#### Scenario: Configure apply and archive guidance

- **WHEN** config contains guidance arrays under `operations.apply.guidance` and `operations.archive.guidance`
- **THEN** both operation configurations are available to their matching operation
- **AND** artifact rules remain unchanged

#### Scenario: Operation has no guidance

- **WHEN** a supported operation has no configured guidance or only empty guidance entries
- **THEN** the operation output omits `operationGuidance`

### Requirement: Consume operation guidance as optional additive advice

The system SHALL present returned operation guidance as optional additive advice rather than as the operation's built-in flow or an enforceable check. A skill that receives guidance SHALL tell the agent to read and consider every entry, follow entries that are applicable and compatible with the built-in workflow, and keep the field separate from built-in instructions, CLI-controlled state, and explicit user choices.

#### Scenario: Guidance complements built-in flow

- **WHEN** archive guidance asks for a concise completion summary
- **THEN** the archive skill tells the agent to follow that applicable guidance
- **AND** preserves its built-in steps and prompts

#### Scenario: Guidance conflicts with built-in behavior

- **WHEN** operation guidance conflicts with a built-in workflow step, explicit user choice, resolved path, or command contract
- **THEN** instruction output keeps the conflicting text in `operationGuidance` rather than merging it into built-in instruction, state, path, or command fields
- **AND** the generated skill tells the agent to explain why the advice was not followed
- **AND** does not use the conflicting entry to replace or bypass the controlling workflow input
- **AND** existing CLI validation, state calculation, resolved paths, and command contracts remain unchanged
- **AND** the system does not claim that prompt text can enforce agent compliance

### Requirement: Load operation guidance at execution time

The system SHALL read operation guidance from the current selected-root config whenever an apply or archive instruction surface is invoked.

#### Scenario: Guidance changes after skill generation

- **WHEN** a generated skill already exists and project operation guidance is later changed
- **THEN** the next matching operation receives the updated guidance without regenerating the skill

#### Scenario: Selected store supplies guidance

- **WHEN** operation instructions target a selected store
- **THEN** guidance is read from that store's config

### Requirement: Preserve guidance content

The system SHALL preserve non-empty guidance strings, including line breaks and Markdown, when returning them to an operation.

#### Scenario: Multi-line Markdown guidance

- **WHEN** configured operation guidance contains multiple lines and Markdown
- **THEN** structured operation output returns the text without rewriting its content
