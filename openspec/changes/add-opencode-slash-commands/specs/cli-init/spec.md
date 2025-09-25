## MODIFIED Requirements
### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with OpenSpec instructions based on user selection.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** prompt the user with "Which AI tools do you use?" using a multi-select menu
- **AND** list every available tool with a checkbox:
  - Claude Code (creates or refreshes CLAUDE.md and slash commands)
  - Cursor (creates or refreshes `.cursor/commands/*` slash commands)
  - OpenCode (creates or refreshes `.opencode/command/openspec-*.md` slash commands)
  - AGENTS.md standard (creates or refreshes AGENTS.md with OpenSpec markers)
- **AND** show "(already configured)" beside tools whose managed files exist so users understand selections will refresh content
- **AND** treat disabled tools as "coming soon" and keep them unselectable
- **AND** allow confirming with Enter after selecting one or more tools

### Requirement: AI Tool Configuration Details

The command SHALL properly configure selected AI tools with OpenSpec-specific instructions using a marker system.

#### Scenario: Configuring OpenCode

- **WHEN** OpenCode is selected
- **THEN** create or update `.opencode/command/openspec-proposal.md`, `.opencode/command/openspec-apply.md`, and `.opencode/command/openspec-archive.md`
- **AND** ensure the `command/` directory exists before writing files
- **AND** place OpenSpec markers around the shared command body while leaving any YAML frontmatter intact for user customization
- **AND** align visible slash names, filenames, and any frontmatter identifiers (e.g., `/openspec-proposal`, `openspec-proposal.md`)

### Requirement: Interactive Mode

The command SHALL provide an interactive menu for AI tool selection with clear navigation instructions.

#### Scenario: Displaying interactive menu

- **WHEN** run
- **THEN** prompt the user with: "Which AI tools do you use?"
- **AND** show a checkbox-based multi-select menu with available tools (Claude Code, Cursor, OpenCode, AGENTS.md standard)
- **AND** show disabled options as "coming soon" (not selectable)
- **AND** display inline help indicating Space toggles selections and Enter confirms

## MODIFIED Requirements
### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating slash commands for Claude Code
- **WHEN** the user selects Claude Code during initialization
- **THEN** create `.claude/commands/openspec/proposal.md`, `.claude/commands/openspec/apply.md`, and `.claude/commands/openspec/archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for Cursor
- **WHEN** the user selects Cursor during initialization
- **THEN** create `.cursor/commands/openspec-proposal.md`, `.cursor/commands/openspec-apply.md`, and `.cursor/commands/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

#### Scenario: Generating slash commands for OpenCode
- **WHEN** the user selects OpenCode during initialization
- **THEN** create `.opencode/command/openspec-proposal.md`, `.opencode/command/openspec-apply.md`, and `.opencode/command/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage
- **AND** place OpenSpec markers after any YAML frontmatter so updates remain idempotent
