## ADDED Requirements

### Requirement: Config profile applies to current workspace
The `openspec config profile` command SHALL remain global while offering an explicit workspace apply path when run from inside an OpenSpec workspace.

#### Scenario: Config profile run inside a workspace
- **GIVEN** the command runs from inside an OpenSpec workspace
- **WHEN** the user changes profile or delivery settings with interactive `openspec config profile`
- **THEN** OpenSpec SHALL save the global config changes
- **AND** it SHALL prompt: `Apply changes to this workspace now?`

#### Scenario: User confirms workspace apply
- **GIVEN** `openspec config profile` changed global profile or delivery settings inside a workspace
- **WHEN** the user confirms the workspace apply prompt
- **THEN** OpenSpec SHALL run `openspec workspace update` for the current workspace
- **AND** it SHALL not run repo-local `openspec update` unless the current planning home is repo-local

#### Scenario: User declines workspace apply
- **GIVEN** `openspec config profile` changed global profile or delivery settings inside a workspace
- **WHEN** the user declines the workspace apply prompt
- **THEN** OpenSpec SHALL explain that global config was updated
- **AND** it SHALL tell the user to run `openspec workspace update` later to apply the profile to workspace-local skills
- **AND** it SHALL not modify workspace skill files

#### Scenario: No-op inside workspace
- **GIVEN** the command runs from inside an OpenSpec workspace
- **WHEN** `openspec config profile` exits with no effective config changes
- **THEN** OpenSpec SHALL not prompt to apply changes
- **AND** it SHALL warn if workspace-local skills are out of sync with the current global profile
- **AND** the warning SHALL suggest `openspec workspace update`

#### Scenario: Core preset shortcut inside a workspace
- **GIVEN** the command runs from inside an OpenSpec workspace
- **WHEN** the user runs `openspec config profile core`
- **THEN** OpenSpec SHALL save the global config change without prompting to apply immediately
- **AND** it SHALL tell the user to run `openspec workspace update` to apply the profile to workspace-local skills

#### Scenario: Core preset shortcut inside a repo project
- **GIVEN** the command runs from inside a repo-local OpenSpec project
- **WHEN** the user runs `openspec config profile core`
- **THEN** OpenSpec SHALL preserve existing repo-local shortcut behavior
- **AND** it SHALL tell the user to run `openspec update` to apply the profile to project files

#### Scenario: Workspace planning home wins over linked repo project
- **GIVEN** the command runs in a path under a workspace planning home where a repo-local OpenSpec project could also be detected
- **WHEN** OpenSpec decides which apply prompt to show
- **THEN** the nearest current planning home SHALL determine whether to offer `openspec workspace update` or repo-local `openspec update`
- **AND** OpenSpec SHALL not apply profile changes to a linked repo when the current planning home is the workspace

#### Scenario: Linked repo keeps repo-local profile behavior
- **GIVEN** a repo-local OpenSpec project is registered as a workspace link
- **AND** the command runs from inside that linked repo rather than from the workspace planning home
- **WHEN** OpenSpec decides which apply prompt or guidance to show
- **THEN** OpenSpec SHALL preserve repo-local `openspec update` behavior for that repo
- **AND** it SHALL not offer `openspec workspace update` unless the workspace is explicitly selected
