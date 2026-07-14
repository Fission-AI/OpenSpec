# cli-init Delta Specification

## MODIFIED Requirements

### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with skills and slash commands using a searchable multi-select experience.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** display animated welcome screen with OpenSpec logo
- **AND** present a searchable multi-select that shows all available tools
- **AND** mark already configured tools with "(configured ✓)" indicator
- **AND** pre-select configured tools for easy refresh
- **AND** sort configured tools to appear first in the list
- **AND** allow filtering by typing to search

#### Scenario: Selecting tools to configure

- **WHEN** user selects tools and confirms
- **THEN** generate skills in `.<tool>/skills/` directory for each selected tool
- **AND** generate slash commands in `.<tool>/commands/opsx/` directory for each selected tool
- **AND** create `openspec/config.yaml` with default schema setting

#### Scenario: Installing skills for a global-install tool

- **GIVEN** a selected tool has `installDir` set (e.g., Hermes Agent with `installDir: '~/.hermes/skills'`)
- **WHEN** initialization includes skill generation
- **THEN** skills SHALL be written to the expanded `installDir` path (e.g., `~/.hermes/skills/openspec-*/SKILL.md`)
- **AND** a project-local marker directory SHALL be created at `<projectRoot>/<skillsDir>/skills/` (e.g., `.hermes/skills/`)
- **AND** the marker directory enables auto-detection and update-bookkeeping for the tool in this project

#### Scenario: Global-install tool skips command-file generation

- **GIVEN** a selected tool has `installDir` set and no registered command adapter
- **WHEN** initialization includes command generation
- **THEN** command-file generation SHALL be skipped for that tool
- **AND** the command output SHALL include `Commands skipped for: <tool-id> (no adapter)`

#### Scenario: Hermes Agent initialization

- **WHEN** the user selects Hermes Agent during initialization
- **THEN** OpenSpec SHALL treat it as a supported tool with `skillsDir: '.hermes'` and `installDir: '~/.hermes/skills'`
- **AND** skills SHALL be written to `~/.hermes/skills/openspec-*/SKILL.md`
- **AND** a marker directory SHALL be created at `.hermes/skills/`

#### Scenario: Global-install tool skips skill directory deletion

- **GIVEN** a selected tool has `installDir` set and `delivery` is set to `commands`
- **WHEN** initialization runs with `shouldGenerateSkills = false`
- **THEN** `removeSkillDirs` SHALL NOT be called on the global install path
- **AND** existing global skills SHALL be preserved
