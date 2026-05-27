## MODIFIED Requirements

### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating slash commands for Claude Code
- **WHEN** the user selects Claude Code during initialization
- **THEN** create `.claude/commands/pastelsdd/proposal.md`, `.claude/commands/pastelsdd/apply.md`, and `.claude/commands/pastelsdd/archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage

#### Scenario: Generating slash commands for Cursor
- **WHEN** the user selects Cursor during initialization
- **THEN** create `.cursor/commands/pastelsdd-proposal.md`, `.cursor/commands/pastelsdd-apply.md`, and `.cursor/commands/pastelsdd-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage

#### Scenario: Generating slash commands for OpenCode
- **WHEN** the user selects OpenCode during initialization
- **THEN** create `.opencode/commands/pastelsdd-proposal.md`, `.opencode/commands/pastelsdd-apply.md`, and `.opencode/commands/pastelsdd-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage

#### Scenario: Generating slash commands for Windsurf
- **WHEN** the user selects Windsurf during initialization
- **THEN** create `.windsurf/workflows/pastelsdd-proposal.md`, `.windsurf/workflows/pastelsdd-apply.md`, and `.windsurf/workflows/pastelsdd-archive.md`
- **AND** populate each file from shared templates (wrapped in Pastelsdd markers) so workflow text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage

#### Scenario: Generating slash commands for Kilo Code
- **WHEN** the user selects Kilo Code during initialization
- **THEN** create `.kilocode/workflows/pastelsdd-proposal.md`, `.kilocode/workflows/pastelsdd-apply.md`, and `.kilocode/workflows/pastelsdd-archive.md`
- **AND** populate each file from shared templates (wrapped in Pastelsdd markers) so workflow text matches other tools
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage

#### Scenario: Generating slash commands for Codex
- **WHEN** the user selects Codex during initialization
- **THEN** create global prompt files at `~/.codex/prompts/pastelsdd-proposal.md`, `~/.codex/prompts/pastelsdd-apply.md`, and `~/.codex/prompts/pastelsdd-archive.md` (or under `$CODEX_HOME/prompts` if set)
- **AND** populate each file from shared templates that map the first numbered placeholder (`$1`) to the primary user input (e.g., change identifier or question text)
- **AND** wrap the generated content in Pastelsdd markers so `pastelsdd update` can refresh the prompts without touching surrounding custom notes

#### Scenario: Generating slash commands for GitHub Copilot
- **WHEN** the user selects GitHub Copilot during initialization
- **THEN** create `.github/prompts/pastelsdd-proposal.prompt.md`, `.github/prompts/pastelsdd-apply.prompt.md`, and `.github/prompts/pastelsdd-archive.prompt.md`
- **AND** populate each file with YAML frontmatter containing a `description` field that summarizes the workflow stage
- **AND** include `$ARGUMENTS` placeholder to capture user input
- **AND** wrap the shared template body with Pastelsdd markers so `pastelsdd update` can refresh the content
- **AND** each template includes instructions for the relevant Pastelsdd workflow stage
