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

The command SHALL create the OpenSpec directory structure with config file.

#### Scenario: Creating OpenSpec structure

- **WHEN** `openspec init` is executed
- **THEN** create the following directory structure:
```
openspec/
├── config.yaml
├── specs/
└── changes/
    └── archive/
```

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
- **AND** generate slash commands for each selected tool with a command adapter, at that adapter's own path (for example `.claude/commands/opsx/<id>.md` or `.cursor/commands/opsx-<id>.md`)
- **AND** create `openspec/config.yaml` with default schema setting

### Requirement: Interactive Mode
The command SHALL provide an interactive menu for AI tool selection with clear navigation instructions.
#### Scenario: Displaying interactive menu
- **WHEN** run in fresh or extend mode
- **THEN** present a looping select menu that lets users toggle tools with Space and review selections with Enter
- **AND** when Enter is pressed on a highlighted selectable tool that is not already selected, automatically add it to the selection before moving to review so the highlighted tool is configured
- **AND** label already configured tools with "(already configured)" while keeping disabled options marked "coming soon"
- **AND** change the prompt copy in extend mode to "Which AI tools would you like to add or refresh?"
- **AND** display inline instructions clarifying that Space toggles tools and Enter selects the highlighted tool before reviewing selections

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
- **THEN** display categorized summary:
  - "Created: <tools>" for newly configured tools
  - "Refreshed: <tools>" for already-configured tools that were updated
  - Count of skills and commands generated
- **AND** display a getting started section naming an installed onboarding workflow (for example `/opsx:propose` - Start a change)
- **AND** spell each command the way the configured tool registers it: `/opsx-<id>` for tools whose command files are named `opsx-<id>`, and the tool's skill invocation (`$openspec-<skill>` for Codex, `/skill:openspec-<skill>` for Kimi Code, `/openspec-<skill>` otherwise) for tools that receive no command files
- **AND** print one labeled line per distinct form when the selected tools disagree
- **AND** display links to documentation and feedback

#### Scenario: Displaying restart instruction

- **WHEN** initialization completes successfully and tools were created or refreshed
- **THEN** display instruction to restart IDE for slash commands to take effect

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
`openspec init` SHALL treat extend mode without new native tool selections as a successful refresh.

#### Scenario: Allowing empty extend runs
- **WHEN** OpenSpec is already initialized and the user selects no additional natively supported tools
- **THEN** complete successfully without requiring additional tool setup
- **AND** preserve the existing OpenSpec structure and config files
- **AND** exit with code 0

### Requirement: Non-Interactive Mode

The command SHALL support non-interactive operation through command-line options.

#### Scenario: Select all tools non-interactively

- **WHEN** run with `--tools all`
- **THEN** automatically select every available AI tool without prompting
- **AND** proceed with skill and command generation

#### Scenario: Select specific tools non-interactively

- **WHEN** run with `--tools claude,cursor`
- **THEN** parse the comma-separated tool IDs
- **AND** generate skills and commands for specified tools only

#### Scenario: Skip tool configuration non-interactively

- **WHEN** run with `--tools none`
- **THEN** create only the openspec directory structure
- **AND** skip skill and command generation
- **AND** create config only when config creation conditions are met

#### Scenario: Invalid tool specification

- **WHEN** run with `--tools invalid-tool`
- **THEN** fail with exit code 1
- **AND** display an error listing available values (`all`, `none`, and supported tool IDs)

#### Scenario: Reserved value combined with tool IDs

- **WHEN** run with `--tools all,claude` or `--tools none,cursor`
- **THEN** fail with exit code 1
- **AND** display an error explaining reserved values cannot be combined with specific tool IDs

#### Scenario: Missing --tools in non-interactive mode

- **GIVEN** prompts are unavailable in non-interactive execution
- **WHEN** user runs `openspec init` without `--tools`
- **THEN** fail with exit code 1
- **AND** instruct to use `--tools all`, `--tools none`, or explicit tool IDs

### Requirement: Skill Generation

The command SHALL generate Agent Skills for selected AI tools.

#### Scenario: Generating skills for a tool

- **WHEN** a tool is selected during initialization
- **THEN** create 9 skill directories under the tool's configured skills directory, `<skillsDir>/skills/` (for example `.claude/skills/` for Claude Code, or the shared `.agents/skills/` for Amp):
  - `openspec-explore/SKILL.md`
  - `openspec-new-change/SKILL.md`
  - `openspec-continue-change/SKILL.md`
  - `openspec-apply-change/SKILL.md`
  - `openspec-ff-change/SKILL.md`
  - `openspec-verify-change/SKILL.md`
  - `openspec-sync-specs/SKILL.md`
  - `openspec-archive-change/SKILL.md`
  - `openspec-bulk-archive-change/SKILL.md`
- **AND** each SKILL.md SHALL contain YAML frontmatter with name and description
- **AND** each SKILL.md SHALL contain the skill instructions

#### Scenario: Pre-approving the OpenSpec CLI in skill frontmatter

- **WHEN** generating a skill's YAML frontmatter
- **THEN** the frontmatter SHALL include an `allowed-tools` field with the value `Bash(openspec:*)`
- **AND** an agent that honors `allowed-tools` SHALL run `openspec` commands from the skill without prompting for approval
- **AND** because `allowed-tools` pre-approves rather than restricts, any other tool the skill uses SHALL remain available under the user's existing permission settings

#### Scenario: Devin skills reference skills rather than workflows

- **GIVEN** the Devin Local agent does not support workflows and its documentation directs users to skills instead
- **WHEN** generating skills for the `devin` tool
- **THEN** rewrite `/opsx:<id>` references in the skill body to the matching `/openspec-<skill>` invocation, which both Devin agents accept
- **AND** the getting-started hint SHALL name `/openspec-propose` rather than a workflow
- **AND** under commands-only delivery, where no Devin skills are written, both the workflow bodies and the hint SHALL fall back to `/opsx-<id>`

### Requirement: Slash Command Generation

The command SHALL generate opsx slash commands only for selected tools that have a registered command adapter, while keeping adapterless tools valid for skill generation.

#### Scenario: Generating slash commands for a tool with a registered adapter

- **WHEN** a tool with a registered command adapter is selected during initialization
- **THEN** create 9 slash command files using the tool's command adapter:
  - `/opsx:explore`
  - `/opsx:new`
  - `/opsx:continue`
  - `/opsx:apply`
  - `/opsx:ff`
  - `/opsx:verify`
  - `/opsx:sync`
  - `/opsx:archive`
  - `/opsx:bulk-archive`
- **AND** use tool-specific path conventions (e.g., `.claude/commands/opsx/` for Claude)
- **AND** include tool-specific frontmatter format

#### Scenario: Selected tool has no command adapter

- **GIVEN** a selected tool has `skillsDir` configured but no registered command adapter
- **WHEN** initialization includes command generation
- **THEN** skill generation for that tool SHALL still remain valid
- **AND** command-file generation SHALL be skipped for that tool
- **AND** the command output SHALL include `Commands skipped for: <tool-id> (no adapter)`

#### Scenario: Kimi Code skips command-file generation

- **WHEN** the user selects Kimi Code during initialization
- **THEN** OpenSpec SHALL treat it as a supported tool with `skillsDir: '.kimi-code'`
- **AND** command-file generation SHALL be skipped because no Kimi adapter is registered

#### Scenario: Grok Build skips command-file generation

- **WHEN** the user selects Grok Build during initialization
- **THEN** OpenSpec SHALL treat it as a supported tool with `skillsDir: '.grok'`
- **AND** command-file generation SHALL be skipped because no Grok adapter is registered

#### Scenario: Generating workflows for Devin Desktop

- **WHEN** the user selects Devin Desktop during initialization
- **THEN** create one workflow file per profile workflow at `.devin/workflows/opsx-<id>.md`
- **AND** include frontmatter with `name`, `description`, `category`, and `tags`
- **AND** rewrite `/opsx:<id>` references in the body to `/opsx-<id>`, the name Devin registers for a workflow file

### Requirement: Config File Generation

The command SHALL create an OpenSpec config file with schema settings.

#### Scenario: Creating config.yaml

- **WHEN** initialization completes
- **AND** config.yaml does not exist
- **THEN** create `openspec/config.yaml` with default schema setting
- **AND** display config location in output

#### Scenario: Preserving existing config.yaml

- **WHEN** initialization runs in extend mode
- **AND** `openspec/config.yaml` already exists
- **THEN** preserve the existing config file
- **AND** display "(exists)" indicator in output

### Requirement: Artifact Language Configuration

The command SHALL let users configure the artifact language during initialization without changing existing project guidance.

#### Scenario: Configuring language for a new project

- **WHEN** the user runs `openspec init --language <language>` and no OpenSpec config exists
- **THEN** create `openspec/config.yaml` with context instructing agents to write artifacts in the selected language
- **AND** keep OpenSpec structural headings and `SHALL`/`MUST` requirement keywords in English
- **AND** make the language context available to artifact instructions

#### Scenario: Protecting existing project context

- **WHEN** the user runs `openspec init --language <language>` and an OpenSpec config already exists without the same generated language guidance
- **THEN** fail before changing project files
- **AND** direct the user to edit the existing config context

#### Scenario: Rejecting an unsafe language value

- **WHEN** the `--language` value is empty, multiline, contains control characters, or would exceed the project context size limit
- **THEN** fail before creating OpenSpec files
- **AND** explain why the value is invalid

#### Scenario: Language config cannot be written

- **WHEN** the user runs `openspec init --language <language>` and the new config cannot be written
- **THEN** fail instead of reporting successful initialization
- **AND** avoid creating unrelated tool files when writability can be determined in advance

### Requirement: Experimental Command Alias

The command SHALL maintain backward compatibility with the experimental command.

#### Scenario: Running openspec experimental

- **WHEN** user runs `openspec experimental`
- **THEN** delegate to `openspec init`
- **AND** the command SHALL be hidden from help output

### Requirement: Oh My Pi tool supported in init
The `openspec init` command SHALL support Oh My Pi as a configurable tool, generating both skill files and command files using Oh My Pi's conventions when selected.

#### Scenario: Selecting Oh My Pi during init
- **WHEN** a user selects Oh My Pi during `openspec init`
- **THEN** skill files are written to `.omp/skills/openspec-<id>/SKILL.md` for each active command
- **AND** command files are written to `.omp/commands/opsx-<id>.md` for each active command
- **AND** skill file bodies use hyphen-based `/opsx-<id>` command references
- **AND** command file bodies have `**Provided arguments**: $@` injected after any `**Input**:` heading

#### Scenario: Oh My Pi listed when .omp directory is detected
- **WHEN** the project root contains a `.omp/` directory
- **THEN** Oh My Pi is pre-checked in the tool selection during `openspec init`

### Requirement: Shared .agents target initialization

`openspec init` SHALL accept the shared `agents` target wherever tool IDs are selected, and SHALL treat it as a skills-only tool.

#### Scenario: Non-interactive selection of the shared target

- **WHEN** the user runs `openspec init --tools agents`
- **THEN** OpenSpec SHALL generate skills for the `agents` target
- **AND** initialization SHALL NOT fail because `agents` has no registered command adapter

#### Scenario: Shared agents target skips command-file generation

- **GIVEN** the configured delivery includes command generation
- **WHEN** the user selects the shared `agents` target during initialization
- **THEN** command-file generation SHALL be skipped because no `agents` adapter is registered
- **AND** `agents` SHALL be listed among the tools reported as having commands skipped

### Requirement: Codex initialization uses the skills-invocable command surface
`openspec init` SHALL treat Codex as a skills-invocable tool, not as an adapter-backed command-file tool.

#### Scenario: Codex command surface resolution
- **WHEN** a user runs `openspec init` and selects Codex
- **THEN** the command SHALL resolve Codex command surface capability as `skills-invocable`
- **AND** it SHALL apply delivery behavior through the shared command-surface capability model when that model is available
- **AND** it SHALL NOT use a Codex-specific delivery predicate that duplicates command-surface capability rules

### Requirement: Codex initialization uses skills only
`openspec init` SHALL configure Codex through generated OpenSpec skills without generating Codex custom prompt files.

#### Scenario: Initializing Codex with default delivery
- **WHEN** a user runs `openspec init` and selects Codex
- **AND** the active delivery mode is `both`
- **THEN** the command SHALL create the selected OpenSpec skill files under `.codex/skills/`
- **AND** it SHALL NOT create Codex prompt files under `$CODEX_HOME/prompts` or the default Codex prompt directory

#### Scenario: Initializing Codex with skills delivery
- **WHEN** a user runs `openspec init` and selects Codex
- **AND** the active delivery mode is `skills`
- **THEN** the command SHALL create the selected OpenSpec skill files under `.codex/skills/`
- **AND** it SHALL NOT create Codex prompt files

#### Scenario: Initializing Codex with commands delivery
- **WHEN** a user runs `openspec init` and selects Codex
- **AND** the active delivery mode is `commands`
- **THEN** the command SHALL still create the selected OpenSpec skill files under `.codex/skills/`
- **AND** it SHALL skip Codex command-file generation because Codex is `skills-invocable`

### Requirement: Codex initialization cleanup removes managed legacy prompts
`openspec init` SHALL remove previously managed global Codex prompt files only after replacement Codex skills exist, without deleting user-authored Codex prompts.

#### Scenario: Cleanup removes allowlisted global Codex prompt files after replacement exists
- **WHEN** initialization cleanup runs
- **AND** the Codex prompt directory contains exact allowlisted managed global Codex prompt files
- **AND** replacement Codex skills exist for the workflows represented by those prompt filenames
- **THEN** the command SHALL remove those managed Codex prompt files
- **AND** it SHALL leave other Codex prompt files unchanged

#### Scenario: Non-interactive initialization preserves unreplaced global Codex prompts
- **WHEN** `openspec init` runs without interaction and without `--force`
- **AND** the resolved global Codex prompt directory contains exact allowlisted managed Codex prompt files
- **AND** replacement Codex skills do not yet exist for at least one detected prompt workflow
- **THEN** the command SHALL preserve the unreplaced Codex prompt files
- **AND** it SHALL continue to leave unmanaged Codex prompt files unchanged

#### Scenario: Non-interactive initialization removes replaced global Codex prompts
- **WHEN** `openspec init` runs without interaction and without `--force`
- **AND** the resolved global Codex prompt directory contains exact allowlisted managed Codex prompt files
- **AND** replacement Codex skills exist for the workflows represented by those prompt filenames
- **THEN** the command SHALL remove those managed Codex prompt files
- **AND** it SHALL leave unmanaged Codex prompt files unchanged

#### Scenario: Initialization preview lists deferred global prompts cleanup separately
- **WHEN** `openspec init` detects managed global Codex prompt files before tool setup
- **THEN** the command SHALL present deferred global prompts cleanup in a separate section from immediate repo-local removals
- **AND** that section SHALL list the concrete prompt paths
- **AND** it SHALL explain that those global prompts are removed only after matching replacement skills are installed

#### Scenario: Cleanup reports Codex skills as the replacement
- **WHEN** initialization cleanup reports removed Codex prompt files
- **THEN** the cleanup summary SHALL indicate that the removed prompt files are replaced by Codex skills

## Why

Manual creation of OpenSpec structure is error-prone and creates adoption friction. A standardized init command ensures:
- Consistent structure across all projects
- Proper AI instruction files are always included
- Quick onboarding for new projects
- Clear conventions from the start
