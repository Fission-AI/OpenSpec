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
- **AND** it SHALL store the selected agents in workspace-local machine state

#### Scenario: Installing profile-selected workflows
- **GIVEN** global config resolves to a workflow profile
- **WHEN** workspace setup installs agent skills
- **THEN** OpenSpec SHALL install workspace-local skills for the workflows selected by that profile
- **AND** it SHALL treat `--tools` as agent selection, not workflow selection
- **AND** it SHALL record the last applied workflow IDs for drift detection

#### Scenario: Installing skills only during setup
- **WHEN** workspace setup installs agent skills
- **THEN** OpenSpec SHALL generate skill files only
- **AND** it SHALL not generate slash command files or global command files as part of workspace setup

#### Scenario: Ignoring command delivery for workspace setup
- **GIVEN** global config delivery is `commands` or `both`
- **WHEN** workspace setup installs agent skills
- **THEN** OpenSpec SHALL still generate workspace-local skills only
- **AND** it SHALL report that workspace command generation is not part of this slice

#### Scenario: Preserving linked repos during skill installation
- **WHEN** workspace setup installs agent skills
- **THEN** OpenSpec SHALL leave linked repos and folders unchanged
- **AND** generated skills SHALL be scoped to the workspace planning home

#### Scenario: Non-interactive setup tool selection
- **WHEN** non-interactive workspace setup receives `--tools all`, `--tools none`, or `--tools <ids>`
- **THEN** OpenSpec SHALL use the selected tool set for workspace agent skill installation
- **AND** it SHALL validate tool IDs using the same supported tool IDs as skill generation for repo initialization

#### Scenario: Non-interactive setup without tool selection
- **WHEN** non-interactive workspace setup omits `--tools`
- **THEN** OpenSpec SHALL create the workspace without installing agent skills
- **AND** it SHALL report that no workspace skills were installed
- **AND** it SHALL tell the user to run `openspec workspace update --tools <ids>` to install skills later

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
- **AND** it SHALL update the stored workspace-local selected agent list

#### Scenario: Updating profile-selected workflows
- **GIVEN** global config resolves to a workflow profile
- **WHEN** workspace update refreshes workspace-local skills
- **THEN** OpenSpec SHALL sync the workspace-local skill workflow set to the workflows selected by that profile
- **AND** deselected workflow skill directories SHALL be removed only when they are known OpenSpec-managed workflow skill directories
- **AND** it SHALL update the last applied workflow IDs used for drift detection

#### Scenario: Ignoring command delivery for workspace update
- **GIVEN** global config delivery is `commands` or `both`
- **WHEN** workspace update refreshes workspace-local skills
- **THEN** OpenSpec SHALL still update workspace-local skills only
- **AND** it SHALL not generate slash command files or global command files

#### Scenario: Removing only managed skill directories
- **WHEN** workspace update removes skills for an unselected agent
- **THEN** OpenSpec SHALL remove only known OpenSpec-managed workflow skill directories
- **AND** it SHALL preserve unrelated files in the agent directory

#### Scenario: Updating stored agent selection by flag
- **WHEN** workspace update receives `--tools <ids>` or `--tools none`
- **THEN** OpenSpec SHALL replace the stored workspace-local selected agent list with that selection
- **AND** future workspace updates without `--tools` SHALL use the stored selection

#### Scenario: Non-interactive update tool selection
- **WHEN** workspace update receives `--tools all`, `--tools none`, or `--tools <ids>`
- **THEN** OpenSpec SHALL update workspace agent skills using that selected tool set
- **AND** it SHALL avoid prompting for agent selection

#### Scenario: Non-interactive update without tool selection
- **GIVEN** workspace-local selected agents are stored
- **WHEN** non-interactive workspace update omits `--tools`
- **THEN** OpenSpec SHALL refresh the stored selected agents using the active global profile
- **AND** it SHALL avoid prompting for agent selection

#### Scenario: Non-interactive update without stored selection
- **GIVEN** no workspace-local selected agents are stored
- **WHEN** non-interactive workspace update omits `--tools`
- **THEN** OpenSpec SHALL complete without installing agent skills
- **AND** it SHALL report a no-op with guidance to pass `--tools`

#### Scenario: Reporting workspace skill drift
- **GIVEN** workspace-local skill state records last applied workflow IDs
- **AND** the active global profile resolves to a different workflow set
- **WHEN** OpenSpec reports workspace skill state
- **THEN** it SHALL report that workspace-local skills are out of sync with the global profile
- **AND** it SHALL suggest `openspec workspace update`

#### Scenario: Reporting clean workspace skill sync
- **GIVEN** workspace-local skill state matches the active global profile and selected agents
- **WHEN** OpenSpec reports workspace skill state
- **THEN** it SHALL not report profile drift

#### Scenario: Reporting workspace skill update results
- **WHEN** workspace update changes agent skill state
- **THEN** OpenSpec SHALL report which agents were refreshed, added, removed, skipped, or failed

#### Scenario: Reporting workspace update results in JSON output
- **WHEN** workspace update runs with JSON output enabled
- **THEN** OpenSpec SHALL include refreshed, added, removed, skipped, or failed skill results in machine-readable output

### Requirement: Workspace skill update surface is documented
OpenSpec SHALL expose workspace skill setup/update behavior in user-facing command surfaces.

#### Scenario: Workspace update appears in help
- **WHEN** a user runs `openspec workspace --help`
- **THEN** OpenSpec SHALL list `workspace update`
- **AND** it SHALL describe it as refreshing workspace-local agent skills

#### Scenario: Workspace update options appear in help
- **WHEN** a user runs `openspec workspace update --help`
- **THEN** OpenSpec SHALL document workspace selection options
- **AND** it SHALL document `--tools all|none|<ids>`
- **AND** it SHALL state that global profile selects workflows and `--tools` selects agents

#### Scenario: Workspace update appears in completions
- **WHEN** shell completions are generated
- **THEN** the workspace command registry SHALL include `workspace update`
- **AND** it SHALL include relevant options such as `--workspace`, `--tools`, `--json`, and `--no-interactive`
