## ADDED Requirements
### Requirement: Linear MCP Detection and Preferences
The proposal, apply, and archive workflows SHALL detect whether Linear MCP is available and only execute Linear actions when connected. Availability SHALL be confirmed by a successful connection and a successful team list query. When connected, the workflow SHALL load `openspec/linear.yml` to obtain `team_id` and `project_id`, and update `openspec/project.md` with the preferred Linear team and project. If the config file does not exist, the workflow SHALL prompt the user to select a Linear team and project, then persist the selections to `openspec/linear.yml` and `openspec/project.md`.

#### Scenario: Linear MCP connected with stored preferences
- **WHEN** a workflow starts and Linear MCP is available
- **AND** `openspec/linear.yml` contains `team_id` and `project_id`
- **THEN** load those values and update `openspec/project.md` to reflect the preferred team and project

#### Scenario: Linear MCP connected without stored preferences
- **WHEN** a workflow starts and Linear MCP is available
- **AND** `openspec/linear.yml` is missing
- **THEN** prompt for a Linear team and project
- **AND** persist the selections to `openspec/linear.yml`
- **AND** update `openspec/project.md` with the preferred team and project

#### Scenario: Linear MCP not available
- **WHEN** a workflow starts and Linear MCP is not available
- **THEN** continue the OpenSpec workflow without Linear prompts or updates

### Requirement: Spec Epic Synchronization
When Linear MCP is available, the workflows SHALL ensure each capability under `openspec/specs/` has a corresponding Linear epic issue in the preferred project. Missing epics SHALL be created and labeled `Epic`, and existing epics SHALL be updated to reflect the spec identifier and path.

#### Scenario: Creating missing epics for specs
- **WHEN** a workflow runs with Linear MCP connected
- **AND** a spec does not have a matching epic issue
- **THEN** create a new Linear issue labeled `Epic` in the preferred project
- **AND** include the spec identifier and `openspec/specs/<capability>/spec.md` path in the epic description

### Requirement: Proposal Story Selection and State Transition
When creating a proposal with Linear MCP connected, the workflow SHALL fetch the top backlog stories from the preferred Linear project, present an interactive list for selection, store the selected story ID in `proposal.md` frontmatter, and move the story from Backlog to Todo.

#### Scenario: Selecting a backlog story for a proposal
- **WHEN** the proposal workflow starts with Linear MCP connected
- **THEN** list backlog stories from the preferred project in an interactive prompt
- **AND** store the selected story ID as `linear_story_id` in `proposal.md` frontmatter
- **AND** move the selected story from Backlog to Todo

### Requirement: Apply Story Update and In Progress Transition
When applying a change with a `linear_story_id` in `proposal.md`, the workflow SHALL update the Linear story description with the proposal content and move the story to In Progress.

#### Scenario: Applying a change with a Linear story
- **WHEN** the apply workflow runs and `proposal.md` includes `linear_story_id`
- **THEN** update the Linear story description using the proposal content
- **AND** move the story to In Progress

### Requirement: Archive Story Update, Completion, and Epic Refresh
When archiving a change with a `linear_story_id` in `proposal.md`, the workflow SHALL update the Linear story description with the proposal content, move the story to Done, and refresh spec epics in the preferred project.

#### Scenario: Archiving a change with a Linear story
- **WHEN** the archive workflow runs and `proposal.md` includes `linear_story_id`
- **THEN** update the Linear story description using the proposal content
- **AND** move the story to Done
- **AND** refresh the spec epic issues for `openspec/specs/`
