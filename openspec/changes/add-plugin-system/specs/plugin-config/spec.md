## ADDED Requirements

### Requirement: Plugin config schema declaration

Plugins SHALL declare their required and optional configuration fields in `plugin.yaml` under a `config` key.

#### Scenario: Plugin declares required config
- **WHEN** a plugin's `plugin.yaml` contains `config.obsidian.vault` with `required: true`
- **THEN** the system validates that `plugin_config.<plugin-name>.obsidian.vault` exists in `config.yaml`

#### Scenario: Plugin declares optional config with default
- **WHEN** a plugin's `plugin.yaml` contains `config.git.auto_branch` with `type: boolean` and `default: true`
- **AND** `config.yaml` does not specify `plugin_config.<plugin-name>.git.auto_branch`
- **THEN** the system uses the default value `true`

### Requirement: Plugin config validation at load time

The system SHALL validate all plugin config requirements when loading plugins.

#### Scenario: Required config missing
- **WHEN** a plugin declares `config.obsidian.vault` as `required: true`
- **AND** `config.yaml` does not contain `plugin_config.<plugin-name>.obsidian.vault`
- **THEN** the system reports an error identifying the missing required config
- **AND** the plugin is NOT loaded

#### Scenario: Config type mismatch
- **WHEN** a plugin declares `config.git.auto_branch` with `type: boolean`
- **AND** `config.yaml` contains `plugin_config.<plugin-name>.git.auto_branch: "yes"` (string instead of boolean)
- **THEN** the system reports a type mismatch error

#### Scenario: All required config present
- **WHEN** all required config fields are present with correct types
- **THEN** the plugin loads successfully

### Requirement: Plugin config namespace isolation

Each plugin's config SHALL be namespaced under `plugin_config.<plugin-name>` in `config.yaml`.

#### Scenario: Two plugins with same config key names
- **WHEN** plugin "alpha" declares `config.enabled` and plugin "beta" declares `config.enabled`
- **AND** `config.yaml` contains `plugin_config.alpha.enabled: true` and `plugin_config.beta.enabled: false`
- **THEN** each plugin receives its own value without collision

### Requirement: Config accessible in handlers

Plugin config values SHALL be accessible in both command and prompt handlers.

#### Scenario: Config in command handler
- **WHEN** a command handler runs for plugin "odoo-lifecycle"
- **THEN** plugin config values SHALL be available as environment variables:
  - `OPENSPEC_PLUGIN_CONFIG_OBSIDIAN_VAULT` for `plugin_config.odoo-lifecycle.obsidian.vault`

#### Scenario: Config in prompt handler
- **WHEN** a prompt template contains `{{plugin.config.obsidian.vault}}`
- **THEN** the system substitutes the value from `plugin_config.odoo-lifecycle.obsidian.vault`
