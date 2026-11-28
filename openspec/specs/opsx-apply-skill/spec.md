# opsx-apply-skill Specification

## Purpose
Defines how the apply skill reads the current apply inputs for a change while keeping the existing apply workflow behavior.

## Requirements

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

### Requirement: Handle Apply lifecycle checkpoints

The `/opsx:apply` skill and command SHALL take lifecycle actions only from the optional `lifecycle` and `lifecycleError` fields of the initial `openspec instructions apply --change "<name>" --json` read, and SHALL handle each action following `lifecycle.handling`. It SHALL NOT make extra CLI calls, including `openspec lifecycle actions`, to find them.

#### Scenario: No lifecycle fields

- **WHEN** the apply read has no `lifecycle` or `lifecycleError` field, because no trigger matches or the CLI predates lifecycle actions
- **THEN** the skill runs its existing workflow with no extra CLI calls

#### Scenario: Ready to implement with before actions

- **WHEN** the change is ready to implement and the apply read includes `lifecycle.before`
- **THEN** the skill reads every `contextFiles` path first
- **AND** handles `lifecycle.before` once per start or resume, before any edits, in the listed order

#### Scenario: Ready to implement with a lifecycle error

- **WHEN** the change is ready to implement and the apply read includes `lifecycleError`
- **THEN** the skill reports the error's issues and fix
- **AND** stops before editing any files

#### Scenario: Change is blocked

- **WHEN** the apply read returns `state: "blocked"`
- **THEN** the skill handles neither `lifecycle.before` nor `lifecycle.completed`

#### Scenario: Change is already complete

- **WHEN** the initial apply read returns `state: "all_done"`
- **THEN** the skill skips `lifecycle.before`
- **AND** when `lifecycle.completed` is present, reads every `contextFiles` path before handling it
- **AND** when `lifecycleError` is present, reports it and finishes normally

#### Scenario: Task loop refreshes

- **WHEN** the skill reruns the apply read during the task loop
- **THEN** it ignores `lifecycle` and `lifecycleError` in that response
- **AND** repeats no `before` offer and handles no `completed` action mid-loop

#### Scenario: Implementation finishes

- **WHEN** Apply finishes implementing during the session (all tracked tasks reach `state: "all_done"`, or freeform implementation finishes without pausing on a schema without task tracking)
- **THEN** the skill handles `lifecycle.completed` from the initial read once
- **AND** when `lifecycleError` was present, reports it and finishes normally

#### Scenario: Apply pauses

- **WHEN** the skill pauses on a blocker, question, or interruption before implementation finishes
- **THEN** it does not handle `lifecycle.completed`
