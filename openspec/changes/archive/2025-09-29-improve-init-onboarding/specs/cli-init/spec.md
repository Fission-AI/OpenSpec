## MODIFIED Requirements
### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with Pastelsdd instructions based on user selection.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** prompt the user with "Which AI tools do you use?" using a multi-select menu
- **AND** list every available tool with a checkbox:
  - Claude Code (creates or refreshes CLAUDE.md and slash commands)
  - Cursor (creates or refreshes `.cursor/commands/*` slash commands)
  - AGENTS.md standard (creates or refreshes AGENTS.md with Pastelsdd markers)
- **AND** show "(already configured)" beside tools whose managed files exist so users understand selections will refresh content
- **AND** treat disabled tools as "coming soon" and keep them unselectable
- **AND** allow confirming with Enter after selecting one or more tools

### Requirement: AI Tool Configuration Details

The command SHALL properly configure selected AI tools with Pastelsdd-specific instructions using a marker system.

#### Scenario: Configuring Claude Code

- **WHEN** Claude Code is selected
- **THEN** create or update `CLAUDE.md` in the project root directory (not inside pastelsdd/)

#### Scenario: Creating new CLAUDE.md

- **WHEN** CLAUDE.md does not exist
- **THEN** create new file with Pastelsdd content wrapped in markers:
```markdown
<!-- PASTELSDD:START -->
# Pastelsdd Instructions

Instructions for AI coding assistants using Pastelsdd for spec-driven development.

## TL;DR Quick Checklist
- Search existing work: `pastelsdd spec list --long`, `pastelsdd list`
- Decide scope: new capability vs modify existing capability
- Pick a unique `change-id`: verb-led kebab-case (`add-`, `update-`, `remove-`, `refactor-`)
- Scaffold: `proposal.md`, `tasks.md`, optional `design.md`, and spec deltas
- Validate with `pastelsdd validate [change-id] --strict`
- Request approval before implementation
<!-- PASTELSDD:END -->
```

#### Scenario: Updating existing CLAUDE.md

- **WHEN** CLAUDE.md already exists
- **THEN** preserve all existing content
- **AND** insert Pastelsdd content at the beginning of the file using markers
- **AND** ensure markers don't duplicate if they already exist

#### Scenario: Managing content with markers

- **WHEN** using the marker system
- **THEN** use `<!-- PASTELSDD:START -->` to mark the beginning of managed content
- **AND** use `<!-- PASTELSDD:END -->` to mark the end of managed content
- **AND** allow Pastelsdd to update its content without affecting user customizations
- **AND** preserve all content outside the markers intact

### Requirement: Interactive Mode

The command SHALL provide an interactive menu for AI tool selection with clear navigation instructions.

#### Scenario: Displaying interactive menu

- **WHEN** run
- **THEN** prompt the user with: "Which AI tools do you use?"
- **AND** show a checkbox-based multi-select menu with available tools (Claude Code, Cursor, AGENTS.md standard)
- **AND** show disabled options as "coming soon" (not selectable)
- **AND** display inline help indicating Space toggles selections and Enter confirms

#### Scenario: Navigating the menu

- **WHEN** the user is in the menu
- **THEN** allow arrow keys to move between options
- **AND** allow Spacebar to toggle the highlighted option
- **AND** allow Enter key to confirm all current selections

### Requirement: Success Output

The command SHALL provide clear, actionable next steps upon successful initialization.

#### Scenario: Displaying success message

- **WHEN** initialization completes successfully
- **THEN** display a success banner followed by actionable prompts tailored to the selected tools
- **AND** summarize which assistant files were created versus refreshed (e.g., `CLAUDE.md (created)`, `.cursor/commands/pastelsdd-apply.md (refreshed)`)
- **AND** include copy-pasteable onboarding prompts for each configured assistant, replacing placeholder text ([YOUR FEATURE HERE]) with real guidance to customize
- **AND** reference AGENTS.md-compatible assistants when no tool-specific file exists (e.g., when only AGENTS.md standard is selected)

