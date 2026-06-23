## Purpose

Define how OpenSpec discovers installed plugins and resolves which ones are active, including precedence across sources, version-compatibility gating, and collision handling — mirroring the existing schema resolution model.

## ADDED Requirements

### Requirement: Three-tier plugin resolution
OpenSpec SHALL resolve plugins from three sources in a fixed precedence order: project configuration, the user/global plugins directory, then auto-detected packages.

#### Scenario: Project-configured plugin
- **WHEN** a plugin id is listed in `openspec/config.yaml` under `plugins.enabled`
- **AND** the package is resolvable from the project's dependencies
- **THEN** OpenSpec SHALL resolve that plugin from the project tier

#### Scenario: User/global plugin
- **WHEN** a plugin manifest is present in the user/global plugins directory
- **AND** it is not overridden by a project-tier plugin of the same id
- **THEN** OpenSpec SHALL resolve that plugin from the user tier

#### Scenario: Precedence on duplicate id across tiers
- **WHEN** the same plugin id is available in more than one tier
- **THEN** OpenSpec SHALL use the highest-precedence tier (project over user over auto-detect)
- **AND** SHALL record the resolved source tier for reporting

### Requirement: Auto-detection of installed plugins
OpenSpec SHALL be able to auto-detect installed plugin packages by their manifests, controlled by configuration.

#### Scenario: Auto-detect enabled
- **WHEN** `plugins.autoDetect` is enabled
- **AND** a project dependency carries a valid plugin manifest
- **THEN** OpenSpec SHALL resolve that plugin even if it is not listed in `plugins.enabled`

#### Scenario: Auto-detect disabled
- **WHEN** `plugins.autoDetect` is disabled
- **THEN** OpenSpec SHALL resolve only plugins explicitly enabled in configuration or present in the user tier

### Requirement: Version compatibility gating
OpenSpec SHALL register only plugins whose declared `openspecCompat` range includes the running OpenSpec version.

#### Scenario: Compatible plugin
- **WHEN** a resolved plugin's `openspecCompat` range includes the current OpenSpec version
- **THEN** OpenSpec SHALL register the plugin's command namespace

#### Scenario: Incompatible plugin
- **WHEN** a resolved plugin's `openspecCompat` range excludes the current OpenSpec version
- **THEN** OpenSpec SHALL NOT register the plugin's command namespace
- **AND** SHALL list the plugin as incompatible with its required range

### Requirement: Collision detection across plugins
OpenSpec SHALL detect and report conflicts when two resolved plugins claim the same id or namespace.

#### Scenario: Duplicate namespace
- **WHEN** two enabled plugins declare the same namespace
- **THEN** OpenSpec SHALL report a namespace collision
- **AND** SHALL NOT register either conflicting namespace until resolved

### Requirement: Resolution reads manifests only
Plugin resolution SHALL NOT import or execute plugin code.

#### Scenario: Resolving without execution
- **WHEN** OpenSpec resolves the set of active plugins
- **THEN** it SHALL read and validate manifests only
- **AND** SHALL NOT load any plugin module into the OpenSpec process

### Requirement: Cross-platform plugin directory resolution
The user/global plugins directory SHALL resolve to the platform-appropriate data location.

#### Scenario: User plugins directory on Windows
- **WHEN** OpenSpec resolves the user/global plugins directory on Windows
- **THEN** it SHALL use the platform data directory with Windows path conventions
- **AND** SHALL NOT assume POSIX home-relative paths
