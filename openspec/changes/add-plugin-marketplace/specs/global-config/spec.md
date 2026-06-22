## ADDED Requirements

### Requirement: User-level plugin preferences in global config
Global configuration SHALL support an optional `plugins` block recording user-level plugin preferences: auto-detect behavior, registry settings, and any user/global-tier plugins.

#### Scenario: Auto-detect default
- **WHEN** configuration does not specify `plugins.autoDetect`
- **THEN** the effective value SHALL default to enabled

#### Scenario: Registry preference persisted
- **WHEN** a user configures a registry preference under `plugins`
- **THEN** it SHALL be saved to global config and used for discovery

#### Scenario: Config validation accepts plugins keys
- **WHEN** a user sets a supported key under `plugins`
- **THEN** config validation SHALL accept it
- **AND** SHALL reject unknown structural shapes with an actionable message

### Requirement: Schema-evolution safety for plugin config
Global configurations without a `plugins` block SHALL load unchanged and behave as if no user-level plugin preferences are set.

#### Scenario: Legacy config without plugins
- **WHEN** a global configuration created before plugin support is loaded
- **THEN** it SHALL load without error
- **AND** OpenSpec SHALL apply default plugin preferences

#### Scenario: Forward-compatible unknown plugin keys
- **WHEN** a global configuration contains plugin-related keys unknown to the running version
- **THEN** they SHALL be preserved on load and save
