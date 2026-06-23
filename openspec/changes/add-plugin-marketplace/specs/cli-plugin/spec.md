## Purpose

Define the `openspec plugin` command group for inspecting, enabling, disabling, and discovering plugins.

## ADDED Requirements

### Requirement: List installed plugins
The CLI SHALL provide `openspec plugin list` to show resolved plugins and their status.

#### Scenario: Listing plugins
- **WHEN** a user runs `openspec plugin list`
- **THEN** output SHALL include each resolved plugin's id, namespace, version, source tier, and enabled/compatibility status

#### Scenario: Machine-readable listing
- **WHEN** a user runs `openspec plugin list --json`
- **THEN** output SHALL be JSON suitable for programmatic use

#### Scenario: No plugins installed
- **WHEN** no plugins are resolved
- **THEN** the command SHALL report that no plugins are installed without error

### Requirement: Inspect a single plugin
The CLI SHALL provide `openspec plugin info <id>` to show details for one plugin.

#### Scenario: Showing plugin details
- **WHEN** a user runs `openspec plugin info <id>` for a resolved plugin
- **THEN** output SHALL include manifest details and, when available, registry metadata

#### Scenario: Unknown plugin id
- **WHEN** the id matches no resolved or registry plugin
- **THEN** the command SHALL report the id was not found with guidance

### Requirement: Enable a plugin
The CLI SHALL provide `openspec plugin add <id>` to enable a plugin and install its contributed artifacts.

#### Scenario: Enabling a compatible plugin
- **WHEN** a user runs `openspec plugin add <id>` for a compatible plugin
- **THEN** OpenSpec SHALL record the plugin as enabled in configuration
- **AND** SHALL install its contributed skills and commands into configured AI tools

#### Scenario: Enabling an incompatible plugin
- **WHEN** the target plugin is incompatible with the running OpenSpec version
- **THEN** the command SHALL refuse to enable it and report the required version range
- **AND** SHALL proceed only when `--force` is provided

#### Scenario: Enabling a non-registry plugin
- **WHEN** the target plugin is not present in the curated registry
- **THEN** the command SHALL display a trust notice before enabling

#### Scenario: Install instructions for a missing package
- **WHEN** the target package is not yet installed
- **THEN** the command SHALL print the install command by default
- **AND** SHALL run the install only when `--install` is provided

#### Scenario: Enabling preserves existing config
- **WHEN** `openspec plugin add <id>` records enablement in `openspec/config.yaml`
- **THEN** it SHALL preserve all existing configuration keys, including unknown third-party blocks such as `openlore`

### Requirement: Disable or remove a plugin
The CLI SHALL provide `openspec plugin remove <id>`, `openspec plugin disable <id>`, and `openspec plugin enable <id>`.

#### Scenario: Removing a plugin
- **WHEN** a user runs `openspec plugin remove <id>`
- **THEN** OpenSpec SHALL disable the plugin in configuration
- **AND** SHALL clean up only that plugin's managed artifacts

#### Scenario: Toggling without uninstalling
- **WHEN** a user runs `openspec plugin disable <id>` then `openspec plugin enable <id>`
- **THEN** OpenSpec SHALL toggle the plugin's enabled state without uninstalling the package

### Requirement: Discover plugins from the registry
The CLI SHALL provide `openspec plugin search [query]` to discover registry plugins.

#### Scenario: Searching the registry
- **WHEN** a user runs `openspec plugin search`
- **THEN** output SHALL list curated registry plugins with id, summary, and compatibility

#### Scenario: Filtered search
- **WHEN** a user runs `openspec plugin search <query>`
- **THEN** output SHALL include only registry plugins matching the query
