## MODIFIED Requirements

### Requirement: Verify Skill Invocation

The system SHALL provide an `/enpalspec:verify` skill that validates implementation against change artifacts.

#### Scenario: Verify with change name provided

- **WHEN** agent executes `/enpalspec:verify <change-name>`
- **THEN** the agent verifies implementation for that specific change
- **AND** produces a verification report

#### Scenario: Verify without change name

- **WHEN** agent executes `/enpalspec:verify` without a change name
- **THEN** the agent prompts user to select from available changes
- **AND** shows only changes that have implementation tasks

#### Scenario: Change has no tasks

- **WHEN** selected change has no tasks.md or tasks are empty
- **THEN** the agent reports "No tasks to verify"
- **AND** suggests running `/enpalspec:apply` to implement tasks first

## ADDED Requirements

### Requirement: Apply skill directs to verify on completion

The apply skill SHALL direct users to run `/enpalspec:verify` upon completing all tasks, rather than directing them to archive.

#### Scenario: Apply completion message

- **WHEN** all tasks are marked complete during an apply session
- **THEN** the apply skill SHALL display: "All tasks complete! Run /enpalspec:verify before archiving."
- **AND** NOT suggest running `/enpalspec:archive` directly

#### Scenario: Verify is the next step after apply

- **WHEN** the apply skill summary output is shown
- **THEN** the suggested next action SHALL be `/enpalspec:verify`
- **AND** the archive suggestion SHALL only appear after verify confirms readiness
