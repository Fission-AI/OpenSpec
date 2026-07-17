## MODIFIED Requirements

### Requirement: AI Tool Configuration
The command SHALL configure AI coding assistants with OpenSpec instructions using a marker system.

#### Scenario: Prompting for AI tool selection
- **WHEN** run interactively
- **THEN** prompt the user with "Which AI tools do you use?" using a multi-select menu
- **AND** list every available tool with a checkbox:
  - Claude Code (creates or refreshes CLAUDE.md and slash commands)
  - Cursor (creates or refreshes `.cursor/commands/*` slash commands)
  - OpenCode (creates or refreshes `.opencode/command/openspec-*.md` slash commands)
  - Devin Desktop (creates or refreshes `.devin/workflows/opsx-*.md` workflows)
  - Windsurf (creates or refreshes `.windsurf/workflows/opsx-*.md` workflows)
  - AGENTS.md standard (creates or refreshes AGENTS.md with OpenSpec markers)
- **AND** show "(already configured)" beside tools whose managed files exist so users understand selections will refresh content
- **AND** treat disabled tools as "coming soon" and keep them unselectable
- **AND** allow confirming with Enter after selecting one or more tools

### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating workflows for Devin Desktop
- **WHEN** the user selects Devin Desktop during initialization
- **THEN** create `.devin/workflows/opsx-propose.md`, `.devin/workflows/opsx-apply.md`, and `.devin/workflows/opsx-archive.md`
- **AND** populate each file from shared templates (wrapped in OpenSpec markers) so workflow text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage
- **AND** use the same frontmatter structure as Windsurf (name, description, category, tags)

#### Scenario: Generating workflows for Windsurf
- **WHEN** the user selects Windsurf during initialization
- **THEN** create `.windsurf/workflows/opsx-propose.md`, `.windsurf/workflows/opsx-apply.md`, and `.windsurf/workflows/opsx-archive.md`
- **AND** populate each file from shared templates (wrapped in OpenSpec markers) so workflow text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage
