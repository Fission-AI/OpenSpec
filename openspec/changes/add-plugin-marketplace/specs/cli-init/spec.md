## ADDED Requirements

### Requirement: Plugin detection during initialization
`openspec init` SHALL detect installed, compatible plugins and offer to enable them.

#### Scenario: Compatible plugin detected interactively
- **WHEN** a user runs `openspec init` in a project with an installed compatible plugin
- **THEN** the interactive flow SHALL offer to enable that plugin
- **AND** the offer SHALL be skippable

#### Scenario: Non-interactive initialization
- **WHEN** `openspec init` runs non-interactively
- **THEN** it SHALL NOT enable plugins implicitly
- **AND** SHALL leave plugin configuration unchanged

### Requirement: Install contributed artifacts during initialization
When a plugin is enabled during `openspec init`, its contributed skills and commands SHALL be installed into the selected AI tool directories.

#### Scenario: Contributed artifacts installed on init
- **WHEN** a plugin is enabled during initialization
- **AND** one or more AI tools are selected
- **THEN** the plugin's contributed skills and commands SHALL be installed for those tools

#### Scenario: Init summary reports plugins
- **WHEN** initialization enables one or more plugins
- **THEN** the init summary SHALL report the enabled plugins and the artifacts installed

#### Scenario: Idempotent re-initialization
- **WHEN** `openspec init` is run again with the same enabled plugins
- **THEN** it SHALL not duplicate contributed artifacts
