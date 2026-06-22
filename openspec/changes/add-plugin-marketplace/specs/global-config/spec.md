## ADDED Requirements

### Requirement: Plugin preferences in global config
Global configuration SHALL support an optional `plugins` block recording enabled plugins, auto-detect behavior, and registry settings.

#### Scenario: Enabled plugins persisted
- **WHEN** a user enables a plugin
- **THEN** its id SHALL be recorded under `plugins.enabled` in configuration

#### Scenario: Auto-detect default
- **WHEN** configuration does not specify `plugins.autoDetect`
- **THEN** the effective value SHALL default to enabled

#### Scenario: Config validation accepts plugins keys
- **WHEN** a user sets a supported key under `plugins`
- **THEN** config validation SHALL accept it
- **AND** SHALL reject unknown structural shapes with an actionable message

### Requirement: Schema-evolution safety for plugin config
Configurations without a `plugins` block SHALL load unchanged and behave as if no plugins are configured.

#### Scenario: Legacy config without plugins
- **WHEN** a configuration created before plugin support is loaded
- **THEN** it SHALL load without error
- **AND** OpenSpec SHALL behave identically to having no plugins enabled

#### Scenario: Forward-compatible unknown plugin keys
- **WHEN** a configuration contains plugin-related keys unknown to the running version
- **THEN** they SHALL be preserved on load and save
