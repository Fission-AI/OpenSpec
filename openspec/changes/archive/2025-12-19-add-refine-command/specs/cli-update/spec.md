## MODIFIED Requirements
### Requirement: Slash Command Updates
The update command SHALL refresh existing slash command files for configured tools without creating new ones, and ensure the OpenCode archive command accepts change ID arguments.

#### Scenario: Updating slash commands for Claude Code
- **WHEN** `.claude/commands/openspec/` contains `proposal.md`, `apply.md`, `refine.md`, and `archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for CodeBuddy Code
- **WHEN** `.codebuddy/commands/openspec/` contains `proposal.md`, `apply.md`, `refine.md`, and `archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Cline
- **WHEN** `.clinerules/` contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** include Cline-specific Markdown heading frontmatter
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Crush
- **WHEN** `.crush/commands/` contains `openspec/proposal.md`, `openspec/apply.md`, `openspec/refine.md`, and `openspec/archive.md`
- **THEN** refresh each file using shared templates
- **AND** include Crush-specific frontmatter with OpenSpec category and tags
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Cursor
- **WHEN** `.cursor/commands/` contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Factory Droid
- **WHEN** `.factory/commands/` contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **THEN** refresh each file using the shared Factory templates that include YAML frontmatter for the `description` and `argument-hint` fields
- **AND** ensure the template body retains the `$ARGUMENTS` placeholder so user input keeps flowing into droid
- **AND** update only the content inside the OpenSpec managed markers, leaving any unmanaged notes untouched
- **AND** skip creating missing files during update

#### Scenario: Updating slash commands for OpenCode
- **WHEN** `.opencode/command/` contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** ensure the archive command includes `$ARGUMENTS` placeholder in frontmatter for accepting change ID arguments

#### Scenario: Updating slash commands for Windsurf
- **WHEN** `.windsurf/workflows/` contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates wrapped in OpenSpec markers
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** skip creating missing files (the update command only refreshes what already exists)

#### Scenario: Updating slash commands for Kilo Code
- **WHEN** `.kilocode/workflows/` contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates wrapped in OpenSpec markers
- **AND** ensure templates include instructions for the relevant workflow stage
- **AND** skip creating missing files (the update command only refreshes what already exists)

#### Scenario: Updating slash commands for Codex
- **GIVEN** the global Codex prompt directory contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **WHEN** a user runs `openspec update`
- **THEN** refresh each file using the shared slash-command templates (including placeholder guidance)
- **AND** preserve any unmanaged content outside the OpenSpec marker block
- **AND** skip creation when a Codex prompt file is missing

#### Scenario: Updating slash commands for GitHub Copilot
- **WHEN** `.github/prompts/` contains `openspec-proposal.prompt.md`, `openspec-apply.prompt.md`, `openspec-refine.prompt.md`, and `openspec-archive.prompt.md`
- **THEN** refresh each file using shared templates while preserving the YAML frontmatter
- **AND** update only the OpenSpec-managed block between markers
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Updating slash commands for Gemini CLI
- **WHEN** `.gemini/commands/openspec/` contains `proposal.toml`, `apply.toml`, `refine.toml`, and `archive.toml`
- **THEN** refresh the body of each file using the shared proposal/apply/refine/archive templates
- **AND** replace only the content between `<!-- OPENSPEC:START -->` and `<!-- OPENSPEC:END -->` markers inside the `prompt = """` block so the TOML framing (`description`, `prompt`) stays intact
- **AND** skip creating any missing `.toml` files during update; only pre-existing Gemini commands are refreshed

#### Scenario: Updating slash commands for iFlow CLI
- **WHEN** `.iflow/commands/` contains `openspec-proposal.md`, `openspec-apply.md`, `openspec-refine.md`, and `openspec-archive.md`
- **THEN** refresh each file using shared templates
- **AND** preserve the YAML frontmatter with `name`, `id`, `category`, and `description` fields
- **AND** update only the OpenSpec-managed block between markers
- **AND** ensure templates include instructions for the relevant workflow stage

#### Scenario: Missing slash command file
- **WHEN** a tool lacks a slash command file
- **THEN** do not create a new file during update
