## ADDED Requirements

### Requirement: Consume current apply operation inputs

The `/opsx:apply` skill SHALL consume current project context and apply operation guidance returned by `openspec instructions apply --change "<name>" --json` while preserving its existing state-driven workflow.

#### Scenario: Apply context and guidance are configured

- **WHEN** apply instruction output contains `context` and `operationGuidance`
- **THEN** the skill treats context as a required prompt-level instruction input
- **AND** tells the agent to read it and apply relevant project facts, conventions, and constraints
- **AND** treats operation guidance as optional additive advice
- **AND** tells the agent to read and consider it and follow entries that are applicable and compatible with the built-in workflow

#### Scenario: Apply operation inputs are absent

- **WHEN** apply instruction output omits context and operation guidance
- **THEN** the skill continues with its existing apply workflow

#### Scenario: Runtime instructions conflict with apply state

- **WHEN** context or operation guidance conflicts with CLI-returned state, missing artifacts, tasks, progress, context files, or built-in instruction
- **THEN** the generated skill keeps required project context and advisory operation guidance separate from the CLI-returned apply fields
- **AND** tells the agent to report context conflicts
- **AND** tells the agent to explain why conflicting or inapplicable operation guidance was not followed
- **AND** this change does not modify the CLI-returned state, missing artifacts, tasks, progress, context files, or built-in instruction
- **AND** the template tells the agent that neither field is evidence of task completion or permission to bypass a blocked state
- **AND** the system does not represent that prompt-level precedence as an enforceable check

#### Scenario: Apply consumes runtime instructions without copying them

- **WHEN** the skill receives context or operation guidance
- **THEN** it does not copy those fields verbatim into implementation files or planning artifacts unless separately requested by the user

### Requirement: Preserve apply workflow behavior

The `/opsx:apply` skill template and CLI contract SHALL keep their existing change selection, context loading, task progression, pause-on-blocker behavior, and completion reporting structure in this change.

#### Scenario: Runtime inputs are consumed

- **WHEN** apply instructions return configured operation inputs
- **THEN** no CLI-controlled apply state transition, required implementation task, or completion criterion is added, removed, or replaced solely by this change
