## MODIFIED Requirements

### Requirement: Skill generation per tool (REPLACES fixed 9-skill mandate)
The init command SHALL generate skills based on the active profile, not a fixed set.

#### Scenario: Core profile skill generation
- **WHEN** user runs init with profile `core`
- **THEN** the system SHALL generate skills for workflows in CORE_WORKFLOWS constant: propose, explore, apply, archive
- **THEN** the system SHALL NOT generate skills for workflows outside the profile

#### Scenario: Extended profile skill generation
- **WHEN** user runs init with profile `extended`
- **THEN** the system SHALL generate skills for all workflows in SKILL_NAMES constant

#### Scenario: Custom profile skill generation
- **WHEN** user runs init with profile `custom`
- **THEN** the system SHALL generate skills only for workflows listed in config `workflows` array

### Requirement: Command generation per tool (REPLACES fixed 9-command mandate)
The init command SHALL generate commands based on profile AND delivery settings.

#### Scenario: Skills-only delivery
- **WHEN** delivery is set to `skills`
- **THEN** the system SHALL NOT generate any command files

#### Scenario: Commands-only delivery
- **WHEN** delivery is set to `commands`
- **THEN** the system SHALL NOT generate any skill files

#### Scenario: Both delivery
- **WHEN** delivery is set to `both`
- **THEN** the system SHALL generate both skill and command files for profile workflows

### Requirement: Zero-question init flow
The init command SHALL work with sensible defaults, minimizing required user input.

#### Scenario: Init with detected tools (interactive)
- **WHEN** user runs `openspec init` interactively and tool directories are detected
- **THEN** the system SHALL show detected tools pre-selected
- **THEN** the system SHALL ask for confirmation (not full selection)
- **THEN** the system SHALL use default profile (`core`) and delivery (`both`)

#### Scenario: Init with no detected tools (interactive)
- **WHEN** user runs `openspec init` interactively and no tool directories are detected
- **THEN** the system SHALL prompt for tool selection
- **THEN** the system SHALL use default profile (`core`) and delivery (`both`)

#### Scenario: Non-interactive with detected tools
- **WHEN** user runs `openspec init` non-interactively (e.g., in CI)
- **AND** tool directories are detected
- **THEN** the system SHALL use detected tools automatically without prompting
- **THEN** the system SHALL use default profile and delivery

#### Scenario: Non-interactive with no detected tools
- **WHEN** user runs `openspec init` non-interactively
- **AND** no tool directories are detected
- **THEN** the system SHALL fail with exit code 1
- **AND** display message to use `--tools` flag

#### Scenario: Non-interactive with explicit tools
- **WHEN** user runs `openspec init --tools claude`
- **THEN** the system SHALL use specified tools
- **THEN** the system SHALL NOT prompt for any input

#### Scenario: Init success message
- **WHEN** init completes successfully
- **THEN** the system SHALL display: "Start your first change: /opsx:propose \"your idea\""

### Requirement: Init respects global config
The init command SHALL read and apply settings from global config.

#### Scenario: User has profile preference
- **WHEN** global config contains `profile: "extended"`
- **THEN** init SHALL install extended profile workflows

#### Scenario: User has delivery preference
- **WHEN** global config contains `delivery: "skills"`
- **THEN** init SHALL install only skill files, not commands

#### Scenario: Override via flags
- **WHEN** user runs `openspec init --profile extended`
- **THEN** the system SHALL use the flag value instead of config value
- **THEN** the system SHALL NOT update the global config

### Requirement: Init preserves existing workflows
The init command SHALL NOT remove workflows that are already installed.

#### Scenario: Existing extended installation
- **WHEN** user has extended profile installed and runs `openspec init` with core profile
- **THEN** the system SHALL NOT remove extra workflows
- **THEN** the system SHALL refresh/update the core workflows

### Requirement: Apply profile deletion via constant lookups
The `--apply-profile` flag SHALL remove workflows by checking SKILL_NAMES and COMMAND_IDS constants.

#### Scenario: Apply profile flag
- **WHEN** user runs `openspec init --apply-profile`
- **THEN** the system SHALL iterate through SKILL_NAMES constant for skill directories
- **AND** iterate through COMMAND_IDS constant for command files
- **AND** delete skill directories matching names in SKILL_NAMES but not in current profile
- **AND** delete command files matching IDs in COMMAND_IDS but not in current profile
- **AND** ignore all directories/files not in these constants (user-created)
- **AND** ask for confirmation before removing, listing each item to be deleted

#### Scenario: Apply profile confirmation declined
- **WHEN** user declines the deletion confirmation
- **THEN** the system SHALL skip all deletions
- **THEN** the system SHALL proceed with installing/refreshing profile workflows
- **THEN** the system SHALL display: "Skipped deletion. Extra workflows preserved."

#### Scenario: Skill deletion scope
- **WHEN** evaluating skill directories for deletion
- **THEN** the system SHALL only consider directories whose names exist in SKILL_NAMES
- **THEN** the system SHALL NOT use pattern matching or regex

#### Scenario: Command deletion scope
- **WHEN** evaluating command files for deletion
- **THEN** the system SHALL only consider files whose IDs exist in COMMAND_IDS
- **THEN** the system SHALL use tool adapter to resolve file paths from command IDs
- **THEN** the system SHALL NOT use pattern matching or regex

### Requirement: Init tool confirmation UX
The init command SHALL show detected tools and ask for confirmation.

#### Scenario: Confirmation prompt
- **WHEN** tools are detected in interactive mode
- **THEN** the system SHALL display: "Detected: Claude Code, Cursor"
- **THEN** the system SHALL show pre-selected checkboxes for confirmation
- **THEN** the system SHALL allow user to deselect unwanted tools
