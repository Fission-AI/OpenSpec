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

### Requirement: Init generates skills-only setup for new projects
The system SHALL generate a skills-based setup for new projects using Claude Code. New projects SHALL NOT receive legacy artifacts.

Generated for new projects:
- `openspec/` directory structure
- `openspec/config.yaml`
- `openspec/project.md`
- `.claude/skills/openspec-*/SKILL.md` (9 skills)
- `.claude/commands/opsx/*.md` (9 pointer commands)

NOT generated for new projects:
- `CLAUDE.md` (root stub file)
- `openspec/AGENTS.md`
- `.claude/agents/`
- `.claude/commands/openspec/`

#### Scenario: Initialize fresh project
- **WHEN** user runs `openspec init` on a project without OpenSpec
- **THEN** system creates openspec/ directory structure
- **AND** system creates .claude/skills/openspec-*/ directories with SKILL.md files
- **AND** system creates .claude/commands/opsx/*.md pointer commands
- **AND** system does NOT create CLAUDE.md at project root
- **AND** system does NOT create openspec/AGENTS.md
- **AND** system does NOT create .claude/agents/ directory

#### Scenario: Initialize with --yes flag
- **WHEN** user runs `openspec init --yes` on a fresh project
- **THEN** system initializes without prompts
- **AND** system creates skills-only setup
- **AND** all default options are applied

### Requirement: Init integrates skill generation
The system SHALL generate skills as part of the init flow, replacing the separate `artifact-experimental-setup` command for new users.

#### Scenario: Skills generated during init
- **WHEN** user completes `openspec init`
- **THEN** system generates all 9 skills automatically
- **AND** system generates all 9 pointer commands automatically
- **AND** no separate command is needed to set up skills

### Requirement: Init uses cross-platform paths
The system SHALL use path.join() for all file path operations during initialization.

#### Scenario: Init on Windows
- **WHEN** user runs `openspec init` on Windows
- **THEN** system creates all directories with correct paths
- **AND** all files are accessible and valid

#### Scenario: Init on Unix-like systems
- **WHEN** user runs `openspec init` on macOS or Linux
- **THEN** system creates all directories with correct paths
- **AND** all files are accessible and valid
