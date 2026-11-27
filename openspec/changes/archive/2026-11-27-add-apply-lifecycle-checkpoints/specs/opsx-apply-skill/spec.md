## ADDED Requirements

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
