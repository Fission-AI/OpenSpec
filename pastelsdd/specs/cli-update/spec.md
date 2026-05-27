# Update Command Specification

## Purpose

As a developer using Pastelsdd, I want to update the Pastelsdd instructions in my project when new versions are released, so that I can benefit from improvements to AI agent instructions.
## Requirements
### Requirement: Update Behavior
The update command SHALL update Pastelsdd instruction files to the latest templates in a team-friendly manner.

#### Scenario: Running update command
- **WHEN** a user runs `pastelsdd update`
- **THEN** replace `pastelsdd/AGENTS.md` with the latest template
- **AND** if a root-level stub (`AGENTS.md`/`CLAUDE.md`) exists, refresh it so it points to `@/pastelsdd/AGENTS.md`

### Requirement: Prerequisites

The command SHALL require an existing Pastelsdd structure before allowing updates.

#### Scenario: Checking prerequisites

- **GIVEN** the command requires an existing `pastelsdd` directory (created by `pastelsdd init`)
- **WHEN** the `pastelsdd` directory does not exist
- **THEN** display error: "No Pastelsdd directory found. Run 'pastelsdd init' first."
- **AND** exit with code 1

### Requirement: File Handling
The update command SHALL handle file updates in a predictable and safe manner.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `pastelsdd/AGENTS.md` with the latest template
- **AND** if a root-level stub exists, update the managed block content so it keeps directing teammates to `@/pastelsdd/AGENTS.md`

### Requirement: Tool-Agnostic Updates
The update command SHALL refresh Pastelsdd-managed files in a predictable manner while respecting each team's chosen tooling.

#### Scenario: Updating files
- **WHEN** updating files
- **THEN** completely replace `pastelsdd/AGENTS.md` with the latest template
- **AND** create or refresh the root-level `AGENTS.md` stub using the managed marker block, even if the file was previously absent
- **AND** update only the Pastelsdd-managed sections inside existing AI tool files, leaving user-authored content untouched
- **AND** avoid creating new native-tool configuration files (slash commands, CLAUDE.md, etc.) unless they already exist

### Requirement: Core Files Always Updated
The update command SHALL always update the core Pastelsdd files and display an ASCII-safe success message.

#### Scenario: Successful update
- **WHEN** the update completes successfully
- **THEN** replace `pastelsdd/AGENTS.md` with the latest template
- **AND** if a root-level stub exists, refresh it so it still directs contributors to `@/pastelsdd/AGENTS.md`

### Requirement: Slash Command Updates

The update command SHALL refresh existing slash command files for configured tools without creating new ones, and ensure the OpenCode archive command accepts change ID arguments.

#### Scenario: Updating slash commands for Antigravity
- **WHEN** `.agent/workflows/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh the Pastelsdd-managed portion of each file so the workflow copy matches other tools while preserving the existing single-field `description` frontmatter
- **AND** skip creating any missing workflow files during update, mirroring the behavior for Windsurf and other IDEs

#### Scenario: Updating slash commands for Claude Code
- **WHEN** `.claude/commands/pastelsdd/` contains `proposal.md`, `apply.md`, and `archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for CodeBuddy Code
- **WHEN** `.codebuddy/commands/pastelsdd/` contains `proposal.md`, `apply.md`, and `archive.md`
- **THEN** refresh each file using the shared CodeBuddy templates that include YAML frontmatter for the `description` and `argument-hint` fields
- **AND** use square bracket format for `argument-hint` parameters (e.g., `[change-id]`)
- **AND** preserve any user customizations outside the Pastelsdd managed markers

#### Scenario: Updating slash commands for Cline
- **WHEN** `.clinerules/workflows/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh each file using shared templates
- **AND** include Cline-specific Markdown heading frontmatter
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Continue
- **WHEN** `.continue/prompts/` contains `pastelsdd-proposal.prompt`, `pastelsdd-apply.prompt`, and `pastelsdd-archive.prompt`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Crush
- **WHEN** `.crush/commands/` contains `pastelsdd/proposal.md`, `pastelsdd/apply.md`, and `pastelsdd/archive.md`
- **THEN** refresh each file using shared templates
- **AND** include Crush-specific frontmatter with Pastelsdd category and tags
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Cursor
- **WHEN** `.cursor/commands/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Factory Droid
- **WHEN** `.factory/commands/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh each file using the shared Factory templates that include YAML frontmatter for the `description` and `argument-hint` fields
- **AND** ensure the template body retains the `$ARGUMENTS` placeholder so user input keeps flowing into droid
- **AND** update only the content inside the Pastelsdd managed markers, leaving any unmanaged notes untouched
- **AND** skip creating missing files during update

#### Scenario: Updating slash commands for OpenCode
- **WHEN** `.opencode/command/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** ensure the archive command includes `$ARGUMENTS` placeholder in frontmatter for accepting change ID arguments

#### Scenario: Updating slash commands for Windsurf
- **WHEN** `.windsurf/workflows/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh each file using shared templates wrapped in Pastelsdd markers
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** skip creating missing files (the update command only refreshes what already exists)

#### Scenario: Updating slash commands for Kilo Code
- **WHEN** `.kilocode/workflows/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh each file using shared templates wrapped in Pastelsdd markers
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** skip creating missing files (the update command only refreshes what already exists)

#### Scenario: Updating slash commands for Codex
- **GIVEN** the global Codex prompt directory contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **WHEN** a user runs `pastelsdd update`
- **THEN** refresh each file using the shared slash-command templates (including placeholder guidance)
- **AND** preserve any unmanaged content outside the Pastelsdd marker block
- **AND** skip creation when a Codex prompt file is missing

#### Scenario: Updating slash commands for GitHub Copilot
- **WHEN** `.github/prompts/` contains `pastelsdd-proposal.prompt.md`, `pastelsdd-apply.prompt.md`, and `pastelsdd-archive.prompt.md`
- **THEN** refresh each file using shared templates while preserving the YAML frontmatter
- **AND** update only the Pastelsdd-managed block between markers
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Gemini CLI
- **WHEN** `.gemini/commands/pastelsdd/` contains `proposal.toml`, `apply.toml`, and `archive.toml`
- **THEN** refresh the body of each file using the shared proposal/apply/archive templates
- **AND** replace only the content between `<!-- PASTELSDD:START -->` and `<!-- PASTELSDD:END -->` markers inside the `prompt = """` block so the TOML framing (`description`, `prompt`) stays intact
- **AND** skip creating any missing `.toml` files during update; only pre-existing Gemini commands are refreshed

#### Scenario: Updating slash commands for iFlow CLI
- **WHEN** `.iflow/commands/` contains `pastelsdd-proposal.md`, `pastelsdd-apply.md`, and `pastelsdd-archive.md`
- **THEN** refresh each file using shared templates
- **AND** preserve the YAML frontmatter with `name`, `id`, `category`, and `description` fields
- **AND** update only the Pastelsdd-managed block between markers
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Missing slash command file
- **WHEN** a tool lacks a slash command file
- **THEN** do not create a new file during update

### Requirement: Archive Command Argument Support
The archive slash command template SHALL support optional change ID arguments for tools that support `$ARGUMENTS` placeholder.

#### Scenario: Archive command with change ID argument
- **WHEN** a user invokes `/pastelsdd:archive <change-id>` with a change ID
- **THEN** the template SHALL instruct the AI to validate the provided change ID against `pastelsdd list`
- **AND** use the provided change ID for archiving if valid
- **AND** fail fast if the provided change ID doesn't match an archivable change

#### Scenario: Archive command without argument (backward compatibility)
- **WHEN** a user invokes `/pastelsdd:archive` without providing a change ID
- **THEN** the template SHALL instruct the AI to identify the change ID from context or by running `pastelsdd list`
- **AND** proceed with the existing behavior (maintaining backward compatibility)

#### Scenario: OpenCode archive template generation
- **WHEN** generating the OpenCode archive slash command file
- **THEN** include the `$ARGUMENTS` placeholder in the frontmatter
- **AND** wrap it in a clear structure like `<ChangeId>\n  $ARGUMENTS\n</ChangeId>` to indicate the expected argument
- **AND** include validation steps in the template body to check if the change ID is valid

### Requirement: Repo update redirects from workspace planning homes
The repo-local `pastelsdd update` command SHALL not silently treat a workspace planning home as a repo-local Pastelsdd project.

#### Scenario: Running update from a workspace root
- **GIVEN** the command runs from an Pastelsdd workspace root
- **WHEN** the user runs `pastelsdd update`
- **THEN** Pastelsdd SHALL not generate repo-local project files in the workspace root
- **AND** it SHALL tell the user to run `pastelsdd workspace update`

#### Scenario: Running update from inside a workspace planning directory
- **GIVEN** the command runs from a subdirectory of an Pastelsdd workspace planning home
- **WHEN** the user runs `pastelsdd update`
- **THEN** Pastelsdd SHALL not run repo-local update behavior
- **AND** it SHALL tell the user to run `pastelsdd workspace update`

#### Scenario: Running update from a repo-local project
- **GIVEN** the command runs from inside a repo-local Pastelsdd project
- **WHEN** the user runs `pastelsdd update`
- **THEN** Pastelsdd SHALL preserve existing repo-local update behavior

## Edge Cases

### Error Handling

The command SHALL handle edge cases gracefully.

#### Scenario: File permission errors

- **WHEN** file write fails
- **THEN** let the error bubble up naturally with file path

#### Scenario: Missing AI tool files

- **WHEN** an AI tool configuration file doesn't exist
- **THEN** skip updating that file
- **AND** do not create it

#### Scenario: Custom directory names

- **WHEN** considering custom directory names
- **THEN** not supported in this change
- **AND** the default directory name `pastelsdd` SHALL be used

## Success Criteria

Users SHALL be able to:
- Update Pastelsdd instructions with a single command
- Get the latest AI agent instructions
- See clear confirmation of the update

The update process SHALL be:
- Simple and fast (no version checking)
- Predictable (same result every time)
- Self-contained (no network required)
