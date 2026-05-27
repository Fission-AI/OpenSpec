## ADDED Requirements

### Requirement: Config profile applies to current workspace
The `pastelsdd config profile` command SHALL remain global while offering an explicit workspace apply path when run from inside an Pastelsdd workspace.

#### Scenario: Config profile run inside a workspace
- **GIVEN** the command runs from inside an Pastelsdd workspace
- **WHEN** the user changes profile or delivery settings with interactive `pastelsdd config profile`
- **THEN** Pastelsdd SHALL save the global config changes
- **AND** it SHALL prompt: `Apply changes to this workspace now?`

#### Scenario: User confirms workspace apply
- **GIVEN** `pastelsdd config profile` changed global profile or delivery settings inside a workspace
- **WHEN** the user confirms the workspace apply prompt
- **THEN** Pastelsdd SHALL run `pastelsdd workspace update` for the current workspace
- **AND** it SHALL not run repo-local `pastelsdd update` unless the current planning home is repo-local

#### Scenario: User declines workspace apply
- **GIVEN** `pastelsdd config profile` changed global profile or delivery settings inside a workspace
- **WHEN** the user declines the workspace apply prompt
- **THEN** Pastelsdd SHALL explain that global config was updated
- **AND** it SHALL tell the user to run `pastelsdd workspace update` later to apply the profile to workspace-local skills
- **AND** it SHALL not modify workspace skill files

#### Scenario: No-op inside workspace
- **GIVEN** the command runs from inside an Pastelsdd workspace
- **WHEN** `pastelsdd config profile` exits with no effective config changes
- **THEN** Pastelsdd SHALL not prompt to apply changes
- **AND** it SHALL warn if workspace-local skills are out of sync with the current global profile
- **AND** the warning SHALL suggest `pastelsdd workspace update`

#### Scenario: Core preset shortcut inside a workspace
- **GIVEN** the command runs from inside an Pastelsdd workspace
- **WHEN** the user runs `pastelsdd config profile core`
- **THEN** Pastelsdd SHALL save the global config change without prompting to apply immediately
- **AND** it SHALL tell the user to run `pastelsdd workspace update` to apply the profile to workspace-local skills

#### Scenario: Core preset shortcut inside a repo project
- **GIVEN** the command runs from inside a repo-local Pastelsdd project
- **WHEN** the user runs `pastelsdd config profile core`
- **THEN** Pastelsdd SHALL preserve existing repo-local shortcut behavior
- **AND** it SHALL tell the user to run `pastelsdd update` to apply the profile to project files

#### Scenario: Workspace planning home wins over linked repo project
- **GIVEN** the command runs in a path under a workspace planning home where a repo-local Pastelsdd project could also be detected
- **WHEN** Pastelsdd decides which apply prompt to show
- **THEN** the nearest current planning home SHALL determine whether to offer `pastelsdd workspace update` or repo-local `pastelsdd update`
- **AND** Pastelsdd SHALL not apply profile changes to a linked repo when the current planning home is the workspace

#### Scenario: Linked repo keeps repo-local profile behavior
- **GIVEN** a repo-local Pastelsdd project is registered as a workspace link
- **AND** the command runs from inside that linked repo rather than from the workspace planning home
- **WHEN** Pastelsdd decides which apply prompt or guidance to show
- **THEN** Pastelsdd SHALL preserve repo-local `pastelsdd update` behavior for that repo
- **AND** it SHALL not offer `pastelsdd workspace update` unless the workspace is explicitly selected
