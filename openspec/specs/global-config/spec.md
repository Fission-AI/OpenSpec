# global-config Specification

## Purpose

This spec defines how OpenSpec resolves, reads, and writes user-level global configuration. It governs the `src/core/global-config.ts` module, which provides the foundation for storing user preferences, feature flags, and settings that persist across projects. The spec ensures cross-platform compatibility by following XDG Base Directory Specification with platform-specific fallbacks, and guarantees forward/backward compatibility through schema evolution rules.
## Requirements
### Requirement: Global Config Directory Path

The system SHALL resolve the global configuration directory path following XDG Base Directory Specification with platform-specific fallbacks.

#### Scenario: Unix/macOS with XDG_CONFIG_HOME set
- **WHEN** `$XDG_CONFIG_HOME` environment variable is set to `/custom/config`
- **THEN** `getGlobalConfigDir()` returns `/custom/config/openspec`

#### Scenario: Unix/macOS without XDG_CONFIG_HOME
- **WHEN** `$XDG_CONFIG_HOME` environment variable is not set
- **AND** the platform is Unix or macOS
- **THEN** `getGlobalConfigDir()` returns `~/.config/openspec` (expanded to absolute path)

#### Scenario: Windows platform
- **WHEN** the platform is Windows
- **AND** `%APPDATA%` is set to `C:\Users\User\AppData\Roaming`
- **THEN** `getGlobalConfigDir()` returns `C:\Users\User\AppData\Roaming\openspec`

### Requirement: Global Config Loading

The system SHALL load global configuration from the config directory with sensible defaults when the config file does not exist or cannot be parsed.

#### Scenario: Config file exists and is valid
- **WHEN** `config.json` exists in the global config directory
- **AND** the file contains valid JSON matching the config schema
- **THEN** `getGlobalConfig()` returns the parsed configuration

#### Scenario: Config file does not exist
- **WHEN** `config.json` does not exist in the global config directory
- **THEN** `getGlobalConfig()` returns the default configuration
- **AND** no directory or file is created

#### Scenario: Config file is invalid JSON
- **WHEN** `config.json` exists but contains invalid JSON
- **THEN** `getGlobalConfig()` returns the default configuration
- **AND** a warning is logged to stderr

### Requirement: Global Config Saving

The system SHALL save global configuration to the config directory, creating the directory if it does not exist.

#### Scenario: Save config to new directory
- **WHEN** `saveGlobalConfig(config)` is called
- **AND** the global config directory does not exist
- **THEN** the directory is created
- **AND** `config.json` is written with the provided configuration

#### Scenario: Save config to existing directory
- **WHEN** `saveGlobalConfig(config)` is called
- **AND** the global config directory already exists
- **THEN** `config.json` is written (overwriting if exists)

### Requirement: Default Configuration

The system SHALL provide a default configuration that is used when no config file exists.

#### Scenario: Default config structure
- **WHEN** no config file exists
- **THEN** the default configuration includes an empty `featureFlags` object

### Requirement: Config Schema Evolution

The system SHALL merge loaded configuration with default values to ensure new config fields are available even when loading older config files.

#### Scenario: Config file missing new fields
- **WHEN** `config.json` exists with `{ "featureFlags": {} }`
- **AND** the current schema includes a new field `defaultAiTool`
- **THEN** `getGlobalConfig()` returns `{ featureFlags: {}, defaultAiTool: <default> }`
- **AND** the loaded values take precedence over defaults for fields that exist in both

#### Scenario: Config file has extra unknown fields
- **WHEN** `config.json` contains fields not in the current schema
- **THEN** the unknown fields are preserved in the returned configuration
- **AND** no error or warning is raised

