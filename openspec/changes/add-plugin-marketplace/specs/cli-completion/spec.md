## ADDED Requirements

### Requirement: Plugin namespaces in shell completions
Shell completion SHALL include the namespaces of enabled, compatible plugins and their declared subcommands.

#### Scenario: Completing a plugin namespace
- **WHEN** a user requests completion at the top-level command position
- **AND** a compatible plugin declares namespace `lore`
- **THEN** the completion candidates SHALL include `lore`

#### Scenario: Completing plugin subcommands
- **WHEN** a user requests completion after a registered plugin namespace
- **THEN** the completion candidates SHALL include the subcommands the plugin declared in its manifest

#### Scenario: Incompatible plugin excluded from completion
- **WHEN** a resolved plugin is incompatible with the running OpenSpec version
- **THEN** its namespace SHALL NOT appear in completion candidates
