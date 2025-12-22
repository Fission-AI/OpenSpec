# cli-config Specification

## Purpose

Provide a CLI interface for viewing and modifying global OpenSpec configuration. Enables users to manage settings without manually editing JSON files, with support for scripting and automation.

## ADDED Requirements

### Requirement: Command Structure

The config command SHALL provide subcommands for all configuration operations.

#### Scenario: Available subcommands

- **WHEN** user executes `openspec config --help`
- **THEN** display available subcommands:
  - `path` - Show config file location
  - `list` - Show all current settings
  - `get <key>` - Get a specific value
  - `set <key> <value>` - Set a value
  - `unset <key>` - Remove a key (revert to default)
  - `reset` - Reset configuration to defaults
  - `edit` - Open config in editor

### Requirement: Config Path

The config command SHALL display the config file location.

#### Scenario: Show config path

- **WHEN** user executes `openspec config path`
- **THEN** print the absolute path to the config file
- **AND** exit with code 0

### Requirement: Config List

The config command SHALL display all current configuration values.

#### Scenario: List config in human-readable format

- **WHEN** user executes `openspec config list`
- **THEN** display all config values in YAML-like format
- **AND** show nested objects with indentation

#### Scenario: List config as JSON

- **WHEN** user executes `openspec config list --json`
- **THEN** output the complete config as valid JSON
- **AND** output only JSON (no additional text)

### Requirement: Config Get

The config command SHALL retrieve specific configuration values.

#### Scenario: Get top-level key

- **WHEN** user executes `openspec config get <key>` with a valid top-level key
- **THEN** print the raw value only (no labels or formatting)
- **AND** exit with code 0

#### Scenario: Get nested key with dot notation

- **WHEN** user executes `openspec config get featureFlags.someFlag`
- **THEN** traverse the nested structure using dot notation
- **AND** print the value at that path

#### Scenario: Get non-existent key

- **WHEN** user executes `openspec config get <key>` with a key that does not exist
- **THEN** print nothing (empty output)
- **AND** exit with code 1

#### Scenario: Get object value

- **WHEN** user executes `openspec config get <key>` where the value is an object
- **THEN** print the object as JSON

### Requirement: Config Set

The config command SHALL set configuration values with automatic type coercion.

#### Scenario: Set string value

- **WHEN** user executes `openspec config set <key> <value>`
- **AND** value does not match boolean or number patterns
- **THEN** store value as a string
- **AND** display confirmation message

#### Scenario: Set boolean value

- **WHEN** user executes `openspec config set <key> true` or `openspec config set <key> false`
- **THEN** store value as boolean (not string)
- **AND** display confirmation message

#### Scenario: Set numeric value

- **WHEN** user executes `openspec config set <key> <value>`
- **AND** value is a valid number (integer or float)
- **THEN** store value as number (not string)

#### Scenario: Force string with --string flag

- **WHEN** user executes `openspec config set <key> <value> --string`
- **THEN** store value as string regardless of content
- **AND** this allows storing literal "true" or "123" as strings

#### Scenario: Set nested key

- **WHEN** user executes `openspec config set featureFlags.newFlag true`
- **THEN** create intermediate objects if they don't exist
- **AND** set the value at the nested path

### Requirement: Config Unset

The config command SHALL remove configuration overrides.

#### Scenario: Unset existing key

- **WHEN** user executes `openspec config unset <key>`
- **AND** the key exists in the config
- **THEN** remove the key from the config file
- **AND** the value reverts to its default
- **AND** display confirmation message

#### Scenario: Unset non-existent key

- **WHEN** user executes `openspec config unset <key>`
- **AND** the key does not exist in the config
- **THEN** display message indicating key was not set
- **AND** exit with code 0

### Requirement: Config Reset

The config command SHALL reset configuration to defaults.

#### Scenario: Reset all with confirmation

- **WHEN** user executes `openspec config reset --all`
- **THEN** prompt for confirmation before proceeding
- **AND** if confirmed, delete the config file or reset to defaults
- **AND** display confirmation message

#### Scenario: Reset all with -y flag

- **WHEN** user executes `openspec config reset --all -y`
- **THEN** reset without prompting for confirmation

#### Scenario: Reset without --all flag

- **WHEN** user executes `openspec config reset` without `--all`
- **THEN** display error indicating `--all` is required
- **AND** exit with code 1

### Requirement: Config Edit

The config command SHALL open the config file in the user's editor.

#### Scenario: Open editor successfully

- **WHEN** user executes `openspec config edit`
- **AND** `$EDITOR` or `$VISUAL` environment variable is set
- **THEN** open the config file in that editor
- **AND** create the config file with defaults if it doesn't exist
- **AND** wait for the editor to close before returning

#### Scenario: No editor configured

- **WHEN** user executes `openspec config edit`
- **AND** neither `$EDITOR` nor `$VISUAL` is set
- **THEN** display error message suggesting to set `$EDITOR`
- **AND** exit with code 1

### Requirement: Key Naming Convention

The config command SHALL use camelCase keys matching the JSON structure.

#### Scenario: Keys match JSON structure

- **WHEN** accessing configuration keys via CLI
- **THEN** use camelCase matching the actual JSON property names
- **AND** support dot notation for nested access (e.g., `featureFlags.someFlag`)

### Requirement: Schema Validation

The config command SHALL validate configuration writes against the config schema using zod, while allowing unknown fields for forward compatibility.

#### Scenario: Unknown key accepted

- **WHEN** user executes `openspec config set someFutureKey 123`
- **THEN** the value is saved successfully
- **AND** exit with code 0

#### Scenario: Invalid feature flag value rejected

- **WHEN** user executes `openspec config set featureFlags.someFlag notABoolean`
- **THEN** display a descriptive error message
- **AND** do not modify the config file
- **AND** exit with code 1

### Requirement: Reserved Scope Flag

The config command SHALL reserve the `--scope` flag for future extensibility.

#### Scenario: Scope flag defaults to global

- **WHEN** user executes any config command without `--scope`
- **THEN** operate on global configuration (default behavior)

#### Scenario: Project scope not yet implemented

- **WHEN** user executes `openspec config --scope project <subcommand>`
- **THEN** display error message: "Project-local config is not yet implemented"
- **AND** exit with code 1
