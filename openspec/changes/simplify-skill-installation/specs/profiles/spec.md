## ADDED Requirements

### Requirement: Profile definitions
The system SHALL support three workflow profiles: `core`, `extended`, and `custom`.

#### Scenario: Core profile contents
- **WHEN** profile is set to `core`
- **THEN** the profile SHALL include workflows: `propose`, `explore`, `apply`, `archive`

#### Scenario: Extended profile contents
- **WHEN** profile is set to `extended`
- **THEN** the profile SHALL include all 11 workflows: `propose`, `explore`, `apply`, `archive`, `new`, `ff`, `continue`, `verify`, `sync`, `bulk-archive`, `onboard`

#### Scenario: Custom profile contents
- **WHEN** profile is set to `custom`
- **THEN** the profile SHALL include only the workflows specified in global config `workflows` array

### Requirement: Profile CLI commands
The system SHALL provide CLI commands for managing profiles.

#### Scenario: Set profile (config-only)
- **WHEN** user runs `openspec profile set <name>` without `--apply-profile`
- **THEN** the system SHALL update the global config profile setting
- **THEN** the system SHALL NOT modify the filesystem (no workflow files added or removed)
- **THEN** the system SHALL output confirmation of the change

#### Scenario: Set profile with apply
- **WHEN** user runs `openspec profile set <name> --apply-profile`
- **THEN** the system SHALL update the global config profile setting
- **THEN** the system SHALL remove workflow files not in new profile (via SKILL_NAMES and COMMAND_IDS lookups)
- **THEN** the system SHALL install any missing workflow files for the new profile
- **THEN** the system SHALL ask for confirmation before removing files

#### Scenario: Invalid profile name
- **WHEN** user runs `openspec profile set <name>` where name is not `core`, `extended`, or `custom`
- **THEN** the system SHALL display an error listing valid profile names
- **THEN** the system SHALL NOT modify the global config

#### Scenario: Install individual workflow
- **WHEN** user runs `openspec profile install <workflow>`
- **THEN** the system SHALL set profile to `custom` if not already
- **THEN** the system SHALL inform user if profile changed (e.g., "Profile changed from core to custom")
- **THEN** the system SHALL add the workflow to the global config `workflows` array
- **THEN** the system SHALL detect all configured tools in current project
- **THEN** the system SHALL immediately generate skill/command files for the workflow across all detected tools
- **THEN** the system SHALL display confirmation with installed locations

#### Scenario: Install unknown workflow
- **WHEN** user runs `openspec profile install <workflow>` where workflow is not recognized
- **THEN** the system SHALL display an error listing valid workflow names
- **THEN** the system SHALL NOT modify the global config or filesystem

#### Scenario: Uninstall individual workflow
- **WHEN** user runs `openspec profile uninstall <workflow>`
- **THEN** the system SHALL set profile to `custom` if not already
- **THEN** the system SHALL inform user if profile changed (e.g., "Profile changed from core to custom")
- **THEN** the system SHALL remove the workflow from the global config `workflows` array
- **THEN** the system SHALL detect all configured tools in current project
- **THEN** the system SHALL immediately delete skill directories for the workflow (via SKILL_NAMES lookup)
- **THEN** the system SHALL immediately delete command files for the workflow (via COMMAND_IDS lookup)
- **THEN** the system SHALL only delete items whose names/IDs exist in SKILL_NAMES or COMMAND_IDS constants
- **THEN** the system SHALL display confirmation with removed locations

#### Scenario: Uninstall workflow from current profile
- **WHEN** user runs `openspec profile uninstall <workflow>` where workflow is part of current non-custom profile
- **THEN** the system SHALL change profile to `custom`
- **THEN** the system SHALL set `workflows` array to current profile's workflows minus the uninstalled one
- **THEN** the system SHALL inform user: "Profile changed from <old> to custom. Remaining workflows: [...]"
- **THEN** the system SHALL proceed with deletion

#### Scenario: List available profiles
- **WHEN** user runs `openspec profile list`
- **THEN** the system SHALL display all available profiles with their workflow counts
- **THEN** the system SHALL mark the currently active profile (e.g., "core (active)")

#### Scenario: Show current installation
- **WHEN** user runs `openspec profile show`
- **THEN** the system SHALL read the filesystem to show actually installed workflows
- **THEN** the system SHALL indicate which profile the installation matches (if any)

### Requirement: Profile defaults
The system SHALL use `core` as the default profile for new users.

#### Scenario: No global config exists
- **WHEN** global config file does not exist
- **THEN** the system SHALL behave as if profile is `core`

#### Scenario: Global config exists but profile field absent
- **WHEN** global config file exists but does not contain a `profile` field
- **THEN** the system SHALL behave as if profile is `core`
