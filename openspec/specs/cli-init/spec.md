# CLI Init Specification

## Purpose

The `openspec init` command SHALL create a complete OpenSpec directory structure in any project, enabling immediate adoption of OpenSpec conventions with support for multiple AI coding assistants.
## Requirements
### Requirement: Progress Indicators

The command SHALL display progress indicators during initialization to provide clear feedback about each step.

#### Scenario: Displaying initialization progress

- **WHEN** executing initialization steps
- **THEN** validate environment silently in background (no output unless error)
- **AND** display progress with ora spinners:
  - Show spinner: "⠋ Creating OpenSpec structure..."
  - Then success: "✔ OpenSpec structure created"
  - Show spinner: "⠋ Configuring AI tools..."
  - Then success: "✔ AI tools configured"

### Requirement: Directory Creation
The command SHALL create the complete OpenSpec directory structure with all required directories and files.

#### Scenario: Creating OpenSpec structure
- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── project.md
├── AGENTS.md
├── specs/
└── changes/
    └── archive/
```

### Requirement: File Generation
The command SHALL generate required template files with appropriate content for immediate use.

#### Scenario: Generating template files
- **WHEN** initializing OpenSpec
- **THEN** generate `openspec/AGENTS.md` containing complete OpenSpec instructions for AI assistants
- **AND** generate `project.md` with project context template

### Requirement: AI Tool Configuration

The command SHALL configure AI coding assistants with OpenSpec instructions based on user selection.

#### Scenario: Prompting for AI tool selection

- **WHEN** run interactively
- **THEN** prompt the user with "Which AI tools do you use?" using a multi-select menu
- **AND** list every available tool with a checkbox:
  - Claude Code (creates or refreshes CLAUDE.md and slash commands)
  - Cursor (creates or refreshes `.cursor/commands/*` slash commands)
  - AGENTS.md standard (creates or refreshes AGENTS.md stub with OpenSpec markers)
- **AND** show "(already configured)" beside tools whose managed files exist so users understand selections will refresh content
- **AND** treat disabled tools as "coming soon" and keep them unselectable
- **AND** allow confirming with Enter after selecting one or more tools

### Requirement: AI Tool Configuration Details

The command SHALL properly configure selected AI tools with OpenSpec-specific instructions using a marker system.

#### Scenario: Configuring Claude Code

- **WHEN** Claude Code is selected
- **THEN** create or update `CLAUDE.md` in the project root directory (not inside openspec/)
- **AND** populate the managed block with a short stub that points teammates to `@/openspec/AGENTS.md`

#### Scenario: Creating new CLAUDE.md

- **WHEN** CLAUDE.md does not exist
- **THEN** create new file with stub instructions wrapped in markers so the full workflow stays in `openspec/AGENTS.md`:
```markdown
<!-- OPENSPEC:START -->
# OpenSpec Instructions

This project uses OpenSpec to manage AI assistant workflows.

- Full guidance lives in '@/openspec/AGENTS.md'.
- Keep this managed block so 'openspec update' can refresh the instructions.
<!-- OPENSPEC:END -->
```

### Requirement: Interactive Mode
The command SHALL provide an interactive menu for AI tool selection with clear navigation instructions.

#### Scenario: Displaying interactive menu
- **WHEN** run in fresh or extend mode
- **THEN** present a looping select menu that lets users toggle tools with Enter and finish via a "Done" option
- **AND** label already configured tools with "(already configured)" while keeping disabled options marked "coming soon"
- **AND** change the prompt copy in extend mode to "Which AI tools would you like to add or refresh?"
- **AND** display inline instructions clarifying that Enter toggles a tool and selecting "Done" confirms the list

### Requirement: Safety Checks
The command SHALL perform safety checks to prevent overwriting existing structures and ensure proper permissions.

#### Scenario: Detecting existing initialization
- **WHEN** the `openspec/` directory already exists
- **THEN** inform the user that OpenSpec is already initialized, skip recreating the base structure, and enter an extend mode
- **AND** continue to the AI tool selection step so additional tools can be configured
- **AND** display the existing-initialization error message only when the user declines to add any AI tools

### Requirement: Success Output

The command SHALL provide clear, actionable next steps upon successful initialization.

#### Scenario: Displaying success message
- **WHEN** initialization completes successfully
- **THEN** include prompt: "Please explain the OpenSpec workflow from openspec/AGENTS.md and how I should work with you on this project"

### Requirement: Exit Codes

The command SHALL use consistent exit codes to indicate different failure modes.

#### Scenario: Returning exit codes

- **WHEN** the command completes
- **THEN** return appropriate exit code:
  - 0: Success
  - 1: General error (including when OpenSpec directory already exists)
  - 2: Insufficient permissions (reserved for future use)
  - 3: User cancelled operation (reserved for future use)

### Requirement: Additional AI Tool Initialization
`openspec init` SHALL allow users to add configuration files for new AI coding assistants after the initial setup.

#### Scenario: Configuring an extra tool after initial setup
- **GIVEN** an `openspec/` directory already exists and at least one AI tool file is present
- **WHEN** the user runs `openspec init` and selects a different supported AI tool
- **THEN** generate that tool's configuration files with OpenSpec markers the same way as during first-time initialization
- **AND** leave existing tool configuration files unchanged except for managed sections that need refreshing
- **AND** exit with code 0 and display a success summary highlighting the newly added tool files

### Requirement: Success Output Enhancements
`openspec init` SHALL summarize tool actions when initialization or extend mode completes.

#### Scenario: Showing tool summary
- **WHEN** the command completes successfully
- **THEN** display a categorized summary of tools that were created, refreshed, or skipped (including already-configured skips)
- **AND** personalize the "Next steps" header using the names of the selected tools, defaulting to a generic label when none remain

### Requirement: Exit Code Adjustments
`openspec init` SHALL treat extend mode with no selected tools as a guarded error.

#### Scenario: Preventing empty extend runs
- **WHEN** OpenSpec is already initialized and the user selects no additional tools
- **THEN** exit with code 1 after showing the existing-initialization guidance message

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
- **THEN** create `.opencode/commands/openspec-proposal.md`, `.opencode/commands/openspec-apply.md`, and `.opencode/commands/openspec-archive.md`
- **AND** populate each file from shared templates so command text matches other tools
- **AND** each template includes instructions for the relevant OpenSpec workflow stage

## Why

Manual creation of OpenSpec structure is error-prone and creates adoption friction. A standardized init command ensures:
- Consistent structure across all projects
- Proper AI instruction files are always included
- Quick onboarding for new projects
- Clear conventions from the start
