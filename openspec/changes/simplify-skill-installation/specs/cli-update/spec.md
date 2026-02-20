## Purpose

The update command SHALL apply global configuration changes to existing projects, syncing profile and delivery preferences without requiring full re-initialization.

## MODIFIED Requirements

### Requirement: Update respects global profile config
The update command SHALL read global config and apply profile settings to the project.

#### Scenario: Update adds missing workflows from config
- **WHEN** user runs `openspec update`
- **AND** global config specifies workflows not currently installed in the project
- **THEN** the system SHALL generate skill/command files for missing workflows
- **THEN** the system SHALL display: "Added: <workflow-names>"

#### Scenario: Update refreshes existing workflows
- **WHEN** user runs `openspec update`
- **AND** workflows are already installed in the project
- **THEN** the system SHALL refresh those workflow files with latest templates
- **THEN** the system SHALL display: "Updated: <workflow-names>"

#### Scenario: Update with no changes needed
- **WHEN** user runs `openspec update`
- **AND** installed workflows match global config
- **AND** all templates are current
- **AND** delivery setting matches installed files
- **THEN** the system SHALL display: "Already up to date."

#### Scenario: Profile or delivery drift with current templates
- **WHEN** user runs `openspec update`
- **AND** workflow templates are current for the installed skills
- **AND** project files do not match current profile and/or delivery config
- **THEN** the system SHALL treat this as an update-required state (not "Already up to date.")
- **THEN** the system SHALL add/remove files to match current profile and delivery settings

#### Scenario: Update summary output
- **WHEN** update completes with changes
- **THEN** the system SHALL display a summary:
  - "Added: propose, explore" (new workflows installed)
  - "Updated: apply, archive" (existing workflows refreshed)
  - "Removed: 4 command files" (if delivery changed)
- **THEN** the system SHALL list affected tools: "Tools: Claude Code, Cursor"

### Requirement: Update respects delivery setting
The update command SHALL add or remove files based on the delivery setting.

#### Scenario: Delivery changed to skills-only
- **WHEN** user runs `openspec update`
- **AND** global config specifies `delivery: skills`
- **AND** project has command files installed
- **THEN** the system SHALL delete command files for workflows in the profile
- **THEN** the system SHALL generate/update skill files only
- **THEN** the system SHALL display: "Removed: <count> command files (delivery: skills)"

#### Scenario: Delivery changed to commands-only
- **WHEN** user runs `openspec update`
- **AND** global config specifies `delivery: commands`
- **AND** project has skill files installed
- **THEN** the system SHALL delete skill directories for workflows in the profile
- **THEN** the system SHALL generate/update command files only
- **THEN** the system SHALL display: "Removed: <count> skill directories (delivery: commands)"

#### Scenario: Delivery is both
- **WHEN** user runs `openspec update`
- **AND** global config specifies `delivery: both`
- **THEN** the system SHALL generate/update both skill and command files

### Requirement: Update detects configured tools from skills or commands
The update command SHALL treat a tool as configured if it has either generated skill files or generated command files.

#### Scenario: Commands-only installation
- **WHEN** user runs `openspec update`
- **AND** a tool has generated OpenSpec command files
- **AND** that tool has no OpenSpec skill files (commands-only delivery)
- **THEN** the tool SHALL still be treated as configured
- **THEN** the system SHALL apply profile and delivery sync for that tool

### Requirement: One-time migration for existing users
The update command SHALL detect existing users (no `profile` in global config + existing workflows) and migrate them to `custom` profile before applying updates.

#### Scenario: First update after upgrade (existing user)
- **WHEN** user runs `openspec update`
- **AND** global config does not contain a `profile` field
- **AND** project has existing workflow files installed
- **THEN** the system SHALL scan installed workflows across all tool directories in the project
- **THEN** the system SHALL only match workflow names present in `ALL_WORKFLOWS` constant (ignoring user-created custom skills)
- **THEN** the system SHALL take the union of detected workflow names across all tools
- **THEN** the system SHALL write to global config: `profile: "custom"`, `delivery: "both"`, `workflows: [<detected>]`
- **THEN** the system SHALL display: "Migrated: custom profile with <count> workflows (<workflow-names>)"
- **THEN** the system SHALL display: "New in this version: /opsx:propose (combines new + ff). Try 'openspec config profile core' for the streamlined 4-workflow experience."
- **THEN** the system SHALL proceed with normal update logic (using the migrated config)
- **THEN** the result SHALL be template refresh only (no workflows added or removed)

#### Scenario: Migration with partial workflows (user manually removed some)
- **WHEN** user runs `openspec update`
- **AND** global config does not contain a `profile` field
- **AND** project has fewer than the original 10 workflows installed
- **THEN** the system SHALL migrate with only the workflows that are actually present
- **THEN** the migrated `workflows` array SHALL reflect the user's current state, not the original set

#### Scenario: Migration with multiple tools having different workflow sets
- **WHEN** user runs `openspec update`
- **AND** project has multiple tools configured (e.g., Claude Code, Cursor)
- **AND** different tools have different workflows installed
- **THEN** the system SHALL take the union of all detected workflows across all tools
- **THEN** the migrated `workflows` array SHALL include any workflow that exists in at least one tool

#### Scenario: No migration needed (profile already set)
- **WHEN** user runs `openspec update`
- **AND** global config already contains a `profile` field
- **THEN** the system SHALL NOT perform migration
- **THEN** the system SHALL proceed with normal update logic using existing config

#### Scenario: No migration needed (no existing workflows)
- **WHEN** user runs `openspec update`
- **AND** global config does not contain a `profile` field
- **AND** project has no existing workflow files
- **THEN** the system SHALL NOT perform migration
- **THEN** the system SHALL use `core` profile defaults

#### Scenario: Migration is idempotent
- **WHEN** user runs `openspec update` multiple times
- **THEN** migration SHALL only occur on the first run (when `profile` field is absent)
- **THEN** subsequent runs SHALL use the existing global config without re-scanning

#### Scenario: Non-interactive migration
- **WHEN** user runs `openspec update` non-interactively (e.g., in CI)
- **AND** migration is triggered
- **THEN** the system SHALL perform migration without prompting
- **THEN** the system SHALL display the migration summary to stdout

### Requirement: Update detects new tool directories
The update command SHALL notify the user if new AI tool directories are detected that aren't currently configured.

#### Scenario: New tool directory detected
- **WHEN** user runs `openspec update`
- **AND** a new tool directory is detected (e.g., `.windsurf/` exists but Windsurf is not configured)
- **THEN** the system SHALL display: "Detected new tool: Windsurf. Run 'openspec init' to add it."
- **THEN** the system SHALL NOT automatically add the new tool
- **THEN** the system SHALL proceed with update for currently configured tools only

#### Scenario: No new tool directories
- **WHEN** user runs `openspec update`
- **AND** no new tool directories are detected
- **THEN** the system SHALL NOT display any tool detection message

### Requirement: Update requires an OpenSpec project
The update command SHALL only run inside an initialized OpenSpec project.

#### Scenario: Update outside a project
- **WHEN** user runs `openspec update`
- **AND** no `openspec/` directory exists in the current working directory
- **THEN** the system SHALL display: "No OpenSpec project found. Run 'openspec init' to set up."
- **THEN** the system SHALL exit with code 1

### Requirement: Extra workflows preserved
The update command SHALL NOT remove workflow files that aren't in the current profile.

#### Scenario: Extra workflows from previous profile
- **WHEN** user runs `openspec update`
- **AND** project has workflows not in current profile (e.g., user switched from custom to core)
- **THEN** the system SHALL NOT delete those extra workflow files
- **THEN** the system SHALL only add/update workflows in the current profile
- **THEN** the system SHALL display a note: "Note: <count> extra workflows not in profile (use `openspec config profile` to manage)"

#### Scenario: Delivery change with extra workflows
- **WHEN** user runs `openspec update`
- **AND** delivery changed (e.g., `both` → `skills`)
- **AND** project has extra workflows not in current profile
- **THEN** the system SHALL delete files for extra workflows that match the removed delivery type
- **THEN** for example: if switching to `skills`, all command files are deleted (including for extra workflows)
