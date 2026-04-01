## ADDED Requirements

### Requirement: Plugins field in project config

The system SHALL support an optional `plugins` field in `config.yaml` — an array of plugin names (strings) that form the plugin whitelist.

#### Scenario: Valid plugins field
- **WHEN** `config.yaml` contains `plugins: ["odoo-lifecycle", "codex-review"]`
- **THEN** the parsed config includes `plugins: ["odoo-lifecycle", "codex-review"]`

#### Scenario: Plugins field missing
- **WHEN** `config.yaml` does not contain a `plugins` field
- **THEN** the parsed config has `plugins` as undefined (no plugins loaded)

#### Scenario: Plugins field is not an array
- **WHEN** `config.yaml` contains `plugins: "odoo-lifecycle"` (string instead of array)
- **THEN** the system logs a warning and ignores the plugins field

#### Scenario: Plugins array contains non-string elements
- **WHEN** `config.yaml` contains `plugins: ["valid", 123, "also-valid"]`
- **THEN** the system logs a warning about element at index 1
- **AND** includes only the valid string elements

### Requirement: Plugin config field in project config

The system SHALL support an optional `plugin_config` field — a record mapping plugin names to their configuration objects.

#### Scenario: Valid plugin_config
- **WHEN** `config.yaml` contains:
  ```yaml
  plugin_config:
    odoo-lifecycle:
      obsidian:
        vault: "esmith-specs"
  ```
- **THEN** the parsed config includes the nested plugin config structure

#### Scenario: Plugin config for unknown plugin
- **WHEN** `config.yaml` contains `plugin_config.unknown-plugin` but `plugins` does not list "unknown-plugin"
- **THEN** the system logs a warning about config for non-whitelisted plugin

#### Scenario: Plugin config field missing
- **WHEN** `config.yaml` does not contain a `plugin_config` field
- **THEN** the parsed config has `plugin_config` as undefined
