## Purpose

Define the plugin manifest: the declarative contract a package publishes so OpenSpec can discover it, surface its commands, gate its compatibility, and install its contributed artifacts — without importing the plugin's code.

## ADDED Requirements

### Requirement: Plugin manifest declaration
A plugin SHALL declare itself with a manifest, discoverable as an `"openspec"` key in the package's `package.json` or as a sibling `openspec.plugin.json` file.

#### Scenario: Manifest in package.json
- **WHEN** a package contains an `"openspec"` object in its `package.json`
- **THEN** OpenSpec SHALL treat that object as the plugin manifest

#### Scenario: Standalone manifest file
- **WHEN** a package has no `"openspec"` key but contains an `openspec.plugin.json` file at its root
- **THEN** OpenSpec SHALL load that file as the plugin manifest

#### Scenario: Both forms present
- **WHEN** a package declares both an `"openspec"` package.json key and an `openspec.plugin.json`
- **THEN** OpenSpec SHALL use the `package.json` key and SHALL ignore the standalone file

### Requirement: Required manifest fields
A plugin manifest SHALL declare the fields required to identify, surface, and gate the plugin.

#### Scenario: Minimal valid manifest
- **WHEN** a manifest declares `manifestVersion`, `id`, `namespace`, an executable (`bin` or `binArgs`), and `openspecCompat`
- **THEN** OpenSpec SHALL consider the manifest structurally valid

#### Scenario: Missing a required field
- **WHEN** a manifest omits any required field
- **THEN** OpenSpec SHALL treat the plugin as invalid
- **AND** SHALL report which field is missing

### Requirement: Declared command, skill, and workflow contributions
A manifest SHALL be able to declare the subcommands it surfaces and the skills, commands, and workflows it contributes.

#### Scenario: Declaring surfaced subcommands
- **WHEN** a manifest lists `commands` entries with a name and summary
- **THEN** OpenSpec SHALL use them only for help text and completion, not for execution routing

#### Scenario: Declaring contributed skills
- **WHEN** a manifest lists `skills` entries pointing to template paths within the package
- **THEN** OpenSpec SHALL treat those as installable into AI tool directories

#### Scenario: Declaring owned config keys
- **WHEN** a manifest lists `ownsConfigKeys`
- **THEN** OpenSpec SHALL recognize those top-level `config.yaml` keys as owned by the plugin

### Requirement: Manifest validation disables rather than crashes
Manifest validation failures SHALL disable the offending plugin without aborting OpenSpec.

#### Scenario: Invalid manifest encountered during a command
- **WHEN** a resolved plugin has an invalid manifest
- **THEN** OpenSpec SHALL skip registering that plugin
- **AND** SHALL continue executing the requested command
- **AND** SHALL make the validation error visible via `openspec plugin list`

### Requirement: Reserved namespace protection
A manifest namespace SHALL NOT collide with OpenSpec's reserved top-level command names.

#### Scenario: Namespace collides with a core command
- **WHEN** a manifest declares a `namespace` equal to a reserved core command name
- **THEN** OpenSpec SHALL treat the plugin as invalid
- **AND** SHALL report the conflicting reserved name

### Requirement: Forward-compatible manifest parsing
Manifest parsing SHALL preserve unknown fields so newer manifests remain loadable by older OpenSpec versions.

#### Scenario: Unknown field present
- **WHEN** a manifest contains fields not known to the running OpenSpec version
- **THEN** OpenSpec SHALL ignore the unknown fields
- **AND** SHALL still validate and load the known fields
