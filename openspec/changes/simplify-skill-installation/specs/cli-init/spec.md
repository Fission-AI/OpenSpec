## Purpose

The init command SHALL provide a streamlined setup experience that auto-detects tools and uses smart defaults, getting users to their first change in under a minute.

## MODIFIED Requirements

### Requirement: Skill generation per tool (REPLACES fixed 9-skill mandate)
The init command SHALL generate skills based on the active profile, not a fixed set.

#### Scenario: Core profile skill generation
- **WHEN** user runs init with profile `core`
- **THEN** the system SHALL generate skills for workflows in CORE_WORKFLOWS constant: propose, explore, apply, archive
- **THEN** the system SHALL NOT generate skills for workflows outside the profile

#### Scenario: Custom profile skill generation
- **WHEN** user runs init with profile `custom`
- **THEN** the system SHALL generate skills only for workflows listed in config `workflows` array

#### Scenario: Propose workflow included in skill templates
- **WHEN** generating skills
- **THEN** the system SHALL include the `propose` workflow as an available skill template

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

#### Scenario: Propose workflow included in command templates
- **WHEN** generating commands
- **THEN** the system SHALL include the `propose` workflow as an available command template

### Requirement: Tool auto-detection
The init command SHALL detect installed AI tools by scanning for their configuration directories in the project root.

#### Scenario: Detection from directories
- **WHEN** scanning for tools
- **THEN** the system SHALL check for directories matching each supported AI tool's configuration directory (e.g., `.claude/`, `.cursor/`, `.windsurf/`)
- **THEN** all tools with a matching directory SHALL be returned as detected

#### Scenario: Detection covers all supported tools
- **WHEN** scanning for tools
- **THEN** the system SHALL check for all tools defined in the supported tools configuration that have a configuration directory

#### Scenario: No tools detected
- **WHEN** no tool configuration directories exist in project root
- **THEN** the system SHALL return an empty list of detected tools

### Requirement: Smart defaults init flow
The init command SHALL work with sensible defaults and tool confirmation, minimizing required user input.

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

#### Scenario: Interactive with explicit tools
- **WHEN** user runs `openspec init --tools claude` interactively
- **THEN** the system SHALL use specified tools (ignoring auto-detection)
- **THEN** the system SHALL NOT prompt for tool selection
- **THEN** the system SHALL proceed with default profile and delivery

#### Scenario: Init success message (propose installed)
- **WHEN** init completes successfully
- **AND** `propose` is in the active profile
- **THEN** the system SHALL display a tool-appropriate success message
- **THEN** for tools using colon syntax (Claude Code): "Start your first change: /opsx:propose \"your idea\""
- **THEN** for tools using hyphen syntax (Cursor, others): "Start your first change: /opsx-propose \"your idea\""

#### Scenario: Init success message (propose not installed, new installed)
- **WHEN** init completes successfully
- **AND** `propose` is NOT in the active profile
- **AND** `new` is in the active profile
- **THEN** for tools using colon syntax: "Start your first change: /opsx:new \"your idea\""
- **THEN** for tools using hyphen syntax: "Start your first change: /opsx-new \"your idea\""

#### Scenario: Init success message (neither propose nor new)
- **WHEN** init completes successfully
- **AND** neither `propose` nor `new` is in the active profile
- **THEN** the system SHALL display: "Done. Run 'openspec config profile' to configure your workflows."

### Requirement: Init performs migration on existing projects
The init command SHALL perform one-time migration when re-initializing an existing project, using the same shared migration logic as the update command.

#### Scenario: Re-init on existing project (no profile set)
- **WHEN** user runs `openspec init` on a project with existing workflow files
- **AND** global config does not contain a `profile` field
- **THEN** the system SHALL perform one-time migration before proceeding (see `specs/cli-update/spec.md`)
- **THEN** the system SHALL proceed with init using the migrated config

#### Scenario: Init on new project (no existing workflows)
- **WHEN** user runs `openspec init` on a project with no existing workflow files
- **AND** global config does not contain a `profile` field
- **THEN** the system SHALL NOT perform migration
- **THEN** the system SHALL use `core` profile defaults

### Requirement: Init respects global config
The init command SHALL read and apply settings from global config.

#### Scenario: User has profile preference
- **WHEN** global config contains `profile: "custom"` with custom workflows
- **THEN** init SHALL install custom profile workflows

#### Scenario: User has delivery preference
- **WHEN** global config contains `delivery: "skills"`
- **THEN** init SHALL install only skill files, not commands

#### Scenario: Override via flags
- **WHEN** user runs `openspec init --profile core`
- **THEN** the system SHALL use the flag value instead of config value
- **THEN** the system SHALL NOT update the global config

#### Scenario: Invalid profile override
- **WHEN** user runs `openspec init --profile <invalid>`
- **AND** `<invalid>` is not one of `core` or `custom`
- **THEN** the system SHALL exit with code 1
- **THEN** the system SHALL display a validation error listing allowed profile values

### Requirement: Init shows profile confirmation for non-default profiles
The init command SHALL show what profile is being applied when it differs from `core`, allowing the user to adjust before proceeding.

#### Scenario: Init with custom profile (interactive)
- **WHEN** user runs `openspec init` interactively
- **AND** global config specifies `profile: "custom"` with workflows
- **THEN** the system SHALL display: "Applying custom profile (<count> workflows): <workflow-names>"
- **THEN** the system SHALL prompt: "Proceed? (y/n) Or run 'openspec config profile' to change."
- **WHEN** user confirms
- **THEN** the system SHALL proceed with init using the custom profile

#### Scenario: Init with custom profile — user declines
- **WHEN** user declines the profile confirmation prompt
- **THEN** the system SHALL display: "Run 'openspec config profile' to update your profile, then try again."
- **THEN** the system SHALL exit with code 0 (no error)

#### Scenario: Init with core profile (no confirmation needed)
- **WHEN** user runs `openspec init` interactively
- **AND** profile is `core` (default)
- **THEN** the system SHALL NOT show a profile confirmation prompt
- **THEN** the system SHALL proceed directly

#### Scenario: Non-interactive init with custom profile
- **WHEN** user runs `openspec init` non-interactively
- **AND** global config specifies a custom profile
- **THEN** the system SHALL proceed without confirmation (CI assumes intentional config)

### Requirement: Init preserves existing workflows
The init command SHALL NOT remove workflows that are already installed, but SHALL respect delivery setting.

#### Scenario: Existing custom installation
- **WHEN** user has custom profile with extra workflows and runs `openspec init` with core profile
- **THEN** the system SHALL NOT remove extra workflows
- **THEN** the system SHALL regenerate core workflow files, overwriting existing content with latest templates

#### Scenario: Init with different delivery setting
- **WHEN** user runs `openspec init` on existing project
- **AND** delivery setting differs from what's installed (e.g., was `both`, now `skills`)
- **THEN** the system SHALL generate files matching current delivery setting
- **THEN** the system SHALL delete files that don't match delivery (e.g., commands removed if `skills`)
- **THEN** this applies to all workflows, including extras not in profile

#### Scenario: Re-init applies delivery cleanup even when templates are current
- **WHEN** user runs `openspec init` on an existing project
- **AND** existing files are already on current template versions
- **AND** delivery changed since the previous init
- **THEN** the system SHALL still remove files that no longer match delivery
- **THEN** for example, switching from `both` to `skills` SHALL remove generated command files

### Requirement: Init tool confirmation UX
The init command SHALL show detected tools and ask for confirmation.

#### Scenario: Confirmation prompt
- **WHEN** tools are detected in interactive mode
- **THEN** the system SHALL display: "Detected: Claude Code, Cursor"
- **THEN** the system SHALL show pre-selected checkboxes for confirmation
- **THEN** the system SHALL allow user to deselect unwanted tools
