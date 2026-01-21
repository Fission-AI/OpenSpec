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

## ADDED Requirements

### Requirement: Multi-editor skill generation via adapters
The system SHALL use an adapter pattern to generate appropriate files for each supported editor.

Supported editors:
- Claude Code: `.claude/skills/` and `.claude/commands/opsx/`
- Cursor: `.cursor/rules/`
- Windsurf: `.windsurf/rules/`
- Cline: `.cline/rules/`

#### Scenario: Generate for Claude Code
- **WHEN** Claude Code is selected during generation
- **THEN** system creates .claude/skills/openspec-*/ directories with SKILL.md
- **AND** system creates .claude/commands/opsx/*.md pointer commands

#### Scenario: Generate for Cursor
- **WHEN** Cursor is selected during generation
- **THEN** system creates .cursor/rules/openspec-*.mdc rule files
- **AND** rule files contain equivalent skill instructions

#### Scenario: Generate for Windsurf
- **WHEN** Windsurf is selected during generation
- **THEN** system creates .windsurf/rules/openspec-*.md rule files
- **AND** rule files contain equivalent skill instructions

#### Scenario: Generate for Cline
- **WHEN** Cline is selected during generation
- **THEN** system creates .cline/rules/openspec-*.md rule files
- **AND** rule files contain equivalent skill instructions

### Requirement: Generate for multiple editors simultaneously
The system SHALL generate files for all selected editors in a single operation.

#### Scenario: Generate for multiple editors
- **WHEN** multiple editors are selected (e.g., Claude Code and Cursor)
- **THEN** system generates files for Claude Code
- **AND** system generates files for Cursor
- **AND** skill content is equivalent across editors

### Requirement: Editor adapters use cross-platform paths
Each editor adapter SHALL use path.join() for all file path construction.

#### Scenario: Multi-editor generation on Windows
- **WHEN** generation runs for multiple editors on Windows
- **THEN** all adapters create files with correct paths
- **AND** all files are accessible and valid

#### Scenario: Multi-editor generation on Unix-like systems
- **WHEN** generation runs for multiple editors on macOS or Linux
- **THEN** all adapters create files with correct paths
- **AND** all files are accessible and valid

### Requirement: Adapters transform content appropriately
Each editor adapter SHALL transform the SkillDefinition content into the editor's expected format.

#### Scenario: Content equivalence across editors
- **WHEN** skills are generated for multiple editors
- **THEN** all editors receive the same skill names
- **AND** all editors receive equivalent instruction content
- **AND** format differs per editor conventions (SKILL.md vs .mdc vs .md)
