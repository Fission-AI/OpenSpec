## ADDED Requirements

### Requirement: Install scope configuration via profile flow
The config profile workflow SHALL allow users to configure install scope preference.

#### Scenario: Interactive profile includes install scope
- **WHEN** user runs `openspec config profile`
- **THEN** the interactive flow SHALL include install scope selection with values `global` and `project`
- **AND** the currently configured value SHALL be pre-selected

#### Scenario: Save install scope
- **WHEN** user confirms config profile changes
- **THEN** selected install scope SHALL be saved to global config

### Requirement: Install scope visibility in config output
The config command SHALL display install scope preference in human-readable output.

#### Scenario: Config list shows install scope
- **WHEN** user runs `openspec config list`
- **THEN** output SHALL include current install scope value
- **AND** indicate whether value is default or explicit
