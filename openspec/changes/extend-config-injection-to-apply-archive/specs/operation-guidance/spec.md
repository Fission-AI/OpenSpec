## ADDED Requirements

### Requirement: Configure advisory operation guidance

The system SHALL allow projects to configure additive guidance for supported operations under `operations.<operation>.guidance` without treating that guidance as an artifact rule or an enforceable check.

#### Scenario: Configure apply and archive guidance

- **WHEN** config contains guidance arrays under `operations.apply.guidance` and `operations.archive.guidance`
- **THEN** both operation configurations are available to their matching operation
- **AND** artifact rules remain unchanged

#### Scenario: Operation has no guidance

- **WHEN** a supported operation has no configured guidance or only empty guidance entries
- **THEN** the operation output omits `operationGuidance`

### Requirement: Keep operation guidance additive and advisory

The system SHALL present operation guidance as optional advice in addition to the built-in skill flow and explicit user choices.

#### Scenario: Guidance complements built-in flow

- **WHEN** archive guidance asks for a concise completion summary
- **THEN** the archive skill receives that advice without replacing its built-in steps or prompts

#### Scenario: Guidance conflicts with built-in behavior

- **WHEN** operation guidance conflicts with a built-in workflow step, explicit user choice, resolved path, or command contract
- **THEN** the skill keeps the built-in behavior authoritative
- **AND** does not represent the guidance as an enforceable override

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
