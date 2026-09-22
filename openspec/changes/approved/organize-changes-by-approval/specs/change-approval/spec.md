## Purpose

Distinguish changes awaiting review from changes approved for implementation while preserving access to existing plans.

## ADDED Requirements

### Requirement: Explicit approval transition
OpenSpec's agent workflows SHALL instruct the agent to move a finished proposed or legacy change into `changes/approved/<name>/` within its selected planning root, preserving its name and contents. Approval SHALL be determined by directory location.

#### Scenario: Approve a finished plan
- **WHEN** the user approves a change whose schema-required planning artifacts are complete
- **THEN** the agent moves the entire change into `approved/` and reports its resolved location
- **AND** task progress and artifact contents remain unchanged

#### Scenario: Approval without implementation
- **WHEN** the user approves the finished plan in conversation but leaves implementation for later
- **THEN** the agent moves the directory and leaves implementation tasks untouched

#### Scenario: Apply implies approval
- **WHEN** the user invokes the apply workflow for a finished proposed or legacy change
- **THEN** the agent approves that change before implementation and refreshes its resolved artifact paths

#### Scenario: Planning is incomplete
- **WHEN** approval or apply is requested for a change missing required planning artifacts
- **THEN** the agent reports the missing artifacts and the change stays at its current location

#### Scenario: Finishing a proposal is not approval
- **WHEN** the agent completes planning without explicit user approval or an apply request
- **THEN** the change remains proposed

#### Scenario: Approval is repeated
- **WHEN** an already approved change is approved again
- **THEN** the agent uses the existing approved location

#### Scenario: Move cannot be completed
- **WHEN** the destination conflicts or a filesystem error prevents approval
- **THEN** the agent reports the failure, preserves existing content, and the agent pauses before implementation

#### Scenario: Approval on Windows or in a store
- **WHEN** a user approves a change on Windows, macOS, or Linux, including with a selected store
- **THEN** it moves within the selected planning root using native paths, including roots containing spaces

### Requirement: Stable change identity
OpenSpec SHALL resolve active changes by their existing bare name across proposed, approved, and legacy locations for listing, showing, validation, status, instructions, view, completion, and archive. Resolved artifact paths SHALL identify the actual location.

#### Scenario: Commands follow approval
- **WHEN** a change moves from proposed to approved
- **THEN** existing name-based commands continue to address the same artifacts and report their new paths

#### Scenario: Read-only inspection
- **WHEN** a user lists changes or requests status, validation, or apply instructions
- **THEN** the change's approval state and location remain unchanged

#### Scenario: Duplicate names from a merge
- **WHEN** the same active name exists in more than one supported location
- **THEN** commands report the conflicting paths and require the collision to be resolved before acting on that name

#### Scenario: Archive an approved or legacy change
- **WHEN** a user archives an approved or legacy change
- **THEN** existing archive checks and spec synchronization behavior apply to its resolved directory
- **AND** the destination remains `changes/archive/<archive-name>/`

#### Scenario: A proposed change cannot be archived
- **WHEN** a user tries to archive a change still in proposed
- **THEN** OpenSpec leaves it in place and asks the user to approve or apply it first

### Requirement: Preserve legacy changes on update
Updating OpenSpec SHALL preserve flat `changes/<name>/` directories and make them accessible by name without assigning approval.

#### Scenario: Update an existing project
- **WHEN** OpenSpec is updated in a project containing flat changes and archives
- **THEN** existing change and archive contents and locations are preserved
- **AND** new changes use `proposed/`

#### Scenario: Approve a legacy change
- **WHEN** a finished legacy change is explicitly approved or selected for apply
- **THEN** it moves directly into `approved/` using the same approval behavior as a proposed change
