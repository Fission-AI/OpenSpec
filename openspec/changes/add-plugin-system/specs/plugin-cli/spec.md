## ADDED Requirements

### Requirement: Plugin list command

The system SHALL provide a `openspec plugin list` command to show all available and loaded plugins.

#### Scenario: List with loaded plugins
- **WHEN** user runs `openspec plugin list`
- **AND** `config.yaml` lists plugins `["odoo-lifecycle"]`
- **AND** `openspec/plugins/odoo-lifecycle/plugin.yaml` exists
- **THEN** output shows:
  - Plugin name, version, description
  - Source (project, user, package)
  - Status (loaded, not-in-whitelist, error)

#### Scenario: List with no plugins
- **WHEN** user runs `openspec plugin list`
- **AND** no plugins exist or config has no `plugins` field
- **THEN** output shows "No plugins loaded" with instructions on how to add plugins

#### Scenario: List shows unwhitelisted plugins
- **WHEN** `openspec/plugins/secret/plugin.yaml` exists
- **AND** `config.yaml` does not list "secret" in `plugins`
- **THEN** "secret" appears in the list with status "not-in-whitelist"

### Requirement: Plugin info command

The system SHALL provide a `openspec plugin info <name>` command to show detailed plugin information.

#### Scenario: Show plugin details
- **WHEN** user runs `openspec plugin info odoo-lifecycle`
- **THEN** output shows:
  - Name, version, description, openspec compatibility
  - Config schema (required and optional fields)
  - Registered hooks (hook points and handler types)
  - Registered gates
  - Provided schemas
  - Source location (file path)

#### Scenario: Plugin not found
- **WHEN** user runs `openspec plugin info nonexistent`
- **THEN** output shows error message with list of available plugins

### Requirement: JSON output support

The plugin commands SHALL support `--json` flag for machine-readable output.

#### Scenario: Plugin list with --json
- **WHEN** user runs `openspec plugin list --json`
- **THEN** output is valid JSON containing an array of plugin info objects
