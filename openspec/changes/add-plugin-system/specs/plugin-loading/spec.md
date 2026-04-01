## ADDED Requirements

### Requirement: Plugin manifest parsing

The system SHALL parse `plugin.yaml` manifests from plugin directories and validate them against a Zod schema.

#### Scenario: Valid plugin manifest
- **WHEN** a plugin directory contains a valid `plugin.yaml` with name, version, description, and openspec fields
- **THEN** the system returns a parsed PluginManifest object

#### Scenario: Missing required fields
- **WHEN** a `plugin.yaml` is missing the `name` field
- **THEN** the system reports a validation error identifying the missing field

#### Scenario: Invalid YAML syntax
- **WHEN** a `plugin.yaml` contains malformed YAML
- **THEN** the system logs a warning and skips this plugin

### Requirement: Three-tier plugin resolution

The system SHALL resolve plugins from three locations in priority order: project-local, user-global, package built-in.

#### Scenario: Project-local plugin found
- **WHEN** a plugin named "my-plugin" exists at `openspec/plugins/my-plugin/plugin.yaml`
- **AND** a plugin named "my-plugin" exists at `~/.local/share/openspec/plugins/my-plugin/plugin.yaml`
- **THEN** the system uses the project-local version

#### Scenario: Falls back to user-global
- **WHEN** a plugin named "my-plugin" does NOT exist at `openspec/plugins/my-plugin/`
- **AND** a plugin named "my-plugin" exists at `~/.local/share/openspec/plugins/my-plugin/plugin.yaml`
- **THEN** the system uses the user-global version

#### Scenario: Falls back to package built-in
- **WHEN** a plugin named "git" does NOT exist at project-local or user-global
- **AND** a plugin named "git" exists at `<package>/plugins/git/plugin.yaml`
- **THEN** the system uses the package built-in version

#### Scenario: Cross-platform path resolution
- **WHEN** resolving plugin paths on Windows
- **THEN** the system uses `path.join()` for all path construction
- **AND** handles backslash separators correctly

### Requirement: Whitelist enforcement

The system SHALL only load plugins explicitly listed in `config.yaml`'s `plugins` array.

#### Scenario: Plugin in whitelist and exists on disk
- **WHEN** `config.yaml` contains `plugins: ["odoo-lifecycle"]`
- **AND** `openspec/plugins/odoo-lifecycle/plugin.yaml` exists
- **THEN** the system loads this plugin

#### Scenario: Plugin exists on disk but not in whitelist
- **WHEN** `openspec/plugins/secret-plugin/plugin.yaml` exists
- **AND** `config.yaml` does NOT list "secret-plugin" in `plugins`
- **THEN** the system does NOT load this plugin

#### Scenario: Plugin in whitelist but not found on disk
- **WHEN** `config.yaml` contains `plugins: ["missing-plugin"]`
- **AND** "missing-plugin" does not exist in any resolution tier
- **THEN** the system reports an error identifying the missing plugin

#### Scenario: No plugins field in config
- **WHEN** `config.yaml` does not contain a `plugins` field
- **THEN** no plugins are loaded (empty whitelist)

### Requirement: Plugin execution order

The system SHALL execute plugin hooks in the order plugins are listed in `config.yaml`'s `plugins` array.

#### Scenario: Two plugins with hooks on same point
- **WHEN** `config.yaml` contains `plugins: ["alpha", "beta"]`
- **AND** both plugins register `archive.post` hooks
- **THEN** alpha's hooks execute before beta's hooks

### Requirement: Version compatibility check

The system SHALL verify that each plugin's declared `openspec` version range is compatible with the running OpenSpec version.

#### Scenario: Compatible version
- **WHEN** plugin declares `openspec: ">=1.2.0"`
- **AND** running OpenSpec version is `1.3.0`
- **THEN** the plugin loads successfully

#### Scenario: Incompatible version
- **WHEN** plugin declares `openspec: ">=2.0.0"`
- **AND** running OpenSpec version is `1.2.0`
- **THEN** the system reports an error with the version mismatch details
- **AND** the plugin is NOT loaded

#### Scenario: No version constraint
- **WHEN** plugin does not declare an `openspec` field
- **THEN** the system loads the plugin with a warning about missing version constraint
