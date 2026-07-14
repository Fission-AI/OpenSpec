# cli-update Delta Specification

## MODIFIED Requirements

### Requirement: Slash Command Updates

The update command SHALL refresh existing slash command files for configured tools without creating new ones, and ensure the OpenCode archive command accepts change ID arguments.

#### Scenario: Updating slash commands for Antigravity

- **WHEN** `.agent/workflows/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh the OpenSpec-managed portion of each file so the workflow copy matches other tools while preserving the existing single-field `description` frontmatter
- **AND** skip creating any missing workflow files during update, mirroring the behavior for Windsurf and other IDEs

#### Scenario: Updating slash commands for Claude Code

- **WHEN** `.claude/commands/openspec/` contains `proposal.md`, `apply.md`, and `archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for CodeBuddy Code

- **WHEN** `.codebuddy/commands/openspec/` contains `proposal.md`, `apply.md`, and `archive.md`
- **THEN** refresh each file using the shared CodeBuddy templates that include YAML frontmatter for the `description` and `argument-hint` fields
- **AND** use square bracket format for `argument-hint` parameters (e.g., `[change-id]`)
- **AND** preserve any user customizations outside the OpenSpec managed markers

#### Scenario: Updating slash commands for Cline

- **WHEN** `.clinerules/workflows/` contains `openspec-proposal.md`, `openspec-apply.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** include Cline-specific Markdown heading frontmatter
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Continue

- **WHEN** `.continue/prompts/` contains `openspec-proposal.prompt`, `openspec-apply.prompt`, and `openspec-archive.prompt`
- **THEN** refresh each file using shared templates

#### Scenario: Updating skills for a global-install tool

- **GIVEN** a configured tool has `installDir` set (e.g., Hermes Agent with `installDir: '~/.hermes/skills'`)
- **WHEN** the update command refreshes skills for that tool
- **THEN** skills SHALL be regenerated at the expanded `installDir` path
- **AND** the project-local marker directory SHALL be created or maintained at `<projectRoot>/<skillsDir>/skills/`

#### Scenario: Hermes Agent update

- **WHEN** updating Hermes Agent skills
- **THEN** skills SHALL be regenerated at `~/.hermes/skills/openspec-*/SKILL.md`
- **AND** the marker directory at `.hermes/skills/` SHALL be created if it does not exist
- **AND** command-file generation SHALL be skipped because no Hermes adapter is registered

#### Scenario: Global-install tool skips skill directory deletion on profile change

- **GIVEN** a configured tool has `installDir` set and the active profile excludes workflows that were previously installed
- **WHEN** the update command runs skill regeneration
- **THEN** skill directories for non-profile workflows SHALL NOT be removed from the global install path
- **AND** only skill directories in the active profile SHALL be overwritten or created

#### Scenario: Global-install tool skips skill directory deletion on delivery change

- **GIVEN** a configured tool has `installDir` set and `delivery` is set to `commands`
- **WHEN** the update command runs
- **THEN** `removeSkillDirs` SHALL NOT be called on the global install path
- **AND** existing skills SHALL remain in place
