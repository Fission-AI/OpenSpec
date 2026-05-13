## ADDED Requirements

### Requirement: Workspace setup installs agent skills
OpenSpec SHALL let users install OpenSpec agent skills into a workspace during workspace setup.

#### Scenario: Prompting for workspace agent skills
- **WHEN** interactive workspace setup reaches agent skill installation
- **THEN** OpenSpec SHALL ask which agents should get OpenSpec skills in this workspace
- **AND** the prompt SHALL use agent-skill language rather than "AI tools" language

#### Scenario: Preselecting the preferred opener
- **GIVEN** the user selected a preferred opener that supports OpenSpec skill generation
- **WHEN** interactive workspace setup asks which agents should get skills
- **THEN** OpenSpec SHALL preselect the matching agent
- **AND** the user SHALL be able to select additional agents or deselect the preselected agent

#### Scenario: Installing selected workspace skills
- **WHEN** workspace setup completes with one or more selected agents
- **THEN** OpenSpec SHALL generate or refresh OpenSpec skill files under the workspace root for each selected agent
- **AND** it SHALL report which agents received skills

#### Scenario: Installing skills only during setup
- **WHEN** workspace setup installs agent skills
- **THEN** OpenSpec SHALL generate skill files only
- **AND** it SHALL not generate slash command files or global command files as part of workspace setup

#### Scenario: Preserving linked repos during skill installation
- **WHEN** workspace setup installs agent skills
- **THEN** OpenSpec SHALL leave linked repos and folders unchanged
- **AND** generated skills SHALL be scoped to the workspace planning home

#### Scenario: Non-interactive setup tool selection
- **WHEN** non-interactive workspace setup receives `--tools all`, `--tools none`, or `--tools <ids>`
- **THEN** OpenSpec SHALL use the selected tool set for workspace agent skill installation
- **AND** it SHALL validate tool IDs using the same supported tool IDs as skill generation for repo initialization

#### Scenario: Reporting setup skills in JSON output
- **WHEN** non-interactive workspace setup installs agent skills with JSON output enabled
- **THEN** OpenSpec SHALL include generated, refreshed, skipped, or failed skill installation results in machine-readable output

### Requirement: Workspace update manages agent skills
OpenSpec SHALL provide a workspace update flow for refreshing agent skills after setup.

#### Scenario: Updating the current workspace
- **GIVEN** the command runs from inside an OpenSpec workspace
- **WHEN** the user runs `openspec workspace update`
- **THEN** OpenSpec SHALL update that current workspace

#### Scenario: Updating a named workspace
- **GIVEN** a workspace named `platform` is known locally
- **WHEN** the user runs `openspec workspace update platform`
- **THEN** OpenSpec SHALL update the `platform` workspace

#### Scenario: Updating a workspace selected by flag
- **GIVEN** a workspace named `platform` is known locally
- **WHEN** the user runs `openspec workspace update --workspace platform`
- **THEN** OpenSpec SHALL update the `platform` workspace

#### Scenario: Updating selected workspace skills
- **WHEN** workspace update completes with selected agents
- **THEN** OpenSpec SHALL refresh OpenSpec skills for selected agents
- **AND** it SHALL add skills for newly selected agents
- **AND** it SHALL remove OpenSpec-managed workflow skill directories for agents that are no longer selected

#### Scenario: Removing only managed skill directories
- **WHEN** workspace update removes skills for an unselected agent
- **THEN** OpenSpec SHALL remove only known OpenSpec-managed workflow skill directories
- **AND** it SHALL preserve unrelated files in the agent directory

#### Scenario: Non-interactive update tool selection
- **WHEN** workspace update receives `--tools all`, `--tools none`, or `--tools <ids>`
- **THEN** OpenSpec SHALL update workspace agent skills using that selected tool set
- **AND** it SHALL avoid prompting for agent selection

#### Scenario: Reporting workspace skill update results
- **WHEN** workspace update changes agent skill state
- **THEN** OpenSpec SHALL report which agents were refreshed, added, removed, skipped, or failed

#### Scenario: Reporting workspace update results in JSON output
- **WHEN** workspace update runs with JSON output enabled
- **THEN** OpenSpec SHALL include refreshed, added, removed, skipped, or failed skill results in machine-readable output
