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
