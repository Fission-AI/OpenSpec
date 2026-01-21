<context>
Tech stack: TypeScript, Node.js (≥20.19.0), ESM modules
Package manager: pnpm
CLI framework: Commander.js

Cross-platform requirements:
- This tool runs on macOS, Linux, AND Windows
- Always use path.join() or path.resolve() for file paths - never hardcode slashes
- Never assume forward-slash path separators
- Tests must use path.join() for expected path values, not hardcoded strings
- Consider case sensitivity differences in file systems

</context>

<rules>
- Include scenarios for Windows path handling when dealing with file paths
- Requirements involving paths must specify cross-platform behavior
</rules>

## MODIFIED Requirements

### Requirement: Init generates skills-based setup for new users
The system SHALL generate only the new skills-based setup for new projects, NOT the old AGENTS.md-based system. Generated files:
- `.claude/skills/openspec-*/SKILL.md` - Full skill instructions
- `.claude/commands/opsx/*.md` - Pointer commands referencing skills
- `openspec/config.yaml` - Project configuration

The system SHALL NOT generate for new projects:
- `CLAUDE.md` (root stub)
- `openspec/AGENTS.md` (monolithic instructions)
- `.claude/agents/` (old subagents)
- `.claude/commands/openspec/` (old slash commands)

#### Scenario: New project initialization
- **WHEN** user runs `openspec init` in a project without existing OpenSpec setup
- **THEN** system creates .claude/skills/openspec-*/ with 9 skill files
- **AND** system creates .claude/commands/opsx/ with 9 pointer command files
- **AND** system creates openspec/ directory with config.yaml
- **AND** system does NOT create CLAUDE.md, AGENTS.md, or old command files

#### Scenario: Multi-editor initialization
- **WHEN** user selects multiple editors during init (e.g., Claude Code and Cursor)
- **THEN** system generates appropriate files for each selected editor

### Requirement: Init merges artifact-experimental-setup functionality
The system SHALL include all functionality previously in `openspec artifact-experimental-setup` command. The separate command is removed; init handles everything.

#### Scenario: Init replaces artifact-experimental-setup
- **WHEN** user runs `openspec init` on a new project
- **THEN** system generates all skill files that artifact-experimental-setup would have created
- **AND** no separate setup command is needed

### Requirement: Init handles already-initialized projects gracefully
The system SHALL detect and handle projects that are already initialized without duplicating or corrupting existing setup.

#### Scenario: Init on project with old system
- **WHEN** user runs `openspec init` on a project with old AGENTS.md system
- **THEN** system offers to upgrade to new skills-based system
- **AND** system does not corrupt existing specs or changes

#### Scenario: Init on project with new system
- **WHEN** user runs `openspec init` on a project with skills already set up
- **THEN** system informs user that OpenSpec is already configured
- **AND** system suggests `openspec update` for refreshing files

### Requirement: Init supports non-interactive mode
The system SHALL support `--yes` flag for non-interactive initialization with sensible defaults.

#### Scenario: Non-interactive init with --yes
- **WHEN** user runs `openspec init --yes`
- **THEN** system initializes with default settings without prompts
- **AND** system uses detected editors or falls back to Claude Code if none detected

#### Scenario: Non-interactive init in CI environment
- **WHEN** `openspec init --yes` is run in a non-TTY environment (CI)
- **THEN** system completes initialization without hanging for input

### Requirement: Init uses cross-platform paths
The system SHALL use path.join() for all file path construction.

#### Scenario: Init on Windows
- **WHEN** user runs `openspec init` on Windows
- **THEN** system creates files with correct Windows paths
- **AND** all generated files are accessible

#### Scenario: Init on Unix-like systems
- **WHEN** user runs `openspec init` on macOS or Linux
- **THEN** system creates files with correct Unix paths
- **AND** all generated files are accessible
