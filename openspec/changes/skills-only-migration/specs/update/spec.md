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

### Requirement: Update creates new skills for existing users
The system SHALL create new skills-based files when run on projects with the old system. This provides a non-destructive upgrade path.

#### Scenario: Update on project with old system only
- **WHEN** user runs `openspec update` on a project with AGENTS.md but no skills
- **THEN** system creates .claude/skills/openspec-*/ with 9 skill files
- **AND** system creates .claude/commands/opsx/ with 9 pointer command files
- **AND** system preserves existing old files (AGENTS.md, etc.)

#### Scenario: Update on project with both systems
- **WHEN** user runs `openspec update` on a project with both old and new files
- **THEN** system updates/refreshes the skill files to latest version
- **AND** system preserves old files

### Requirement: Update provides informative upgrade messaging
The system SHALL display clear information about what changed during an upgrade from old to new system.

#### Scenario: Informative upgrade output
- **WHEN** user runs `openspec update` and new skills are created
- **THEN** system displays header indicating new skills-based workflow
- **AND** system lists all created skill and command files
- **AND** system explains how to use the new system (natural language + shortcuts)
- **AND** system mentions `openspec cleanup` for removing old files

#### Scenario: No changes needed output
- **WHEN** user runs `openspec update` and skills are already up to date
- **THEN** system indicates that files are already current
- **AND** system does not display upgrade messaging

### Requirement: Update does not remove old files automatically
The system SHALL NOT automatically remove old OpenSpec files during update. Cleanup is a separate, explicit action.

#### Scenario: Old files preserved after update
- **WHEN** user runs `openspec update` on a project with old system
- **THEN** system creates new skills
- **AND** system does NOT remove CLAUDE.md, AGENTS.md, .claude/agents/, or .claude/commands/openspec/

### Requirement: Update supports non-interactive mode
The system SHALL complete without prompts when run in non-interactive contexts.

#### Scenario: Update in CI environment
- **WHEN** `openspec update` is run in a non-TTY environment
- **THEN** system completes update without hanging for input
- **AND** system outputs status information to stdout

### Requirement: Update uses cross-platform paths
The system SHALL use path.join() for all file path operations.

#### Scenario: Update on Windows
- **WHEN** user runs `openspec update` on Windows
- **THEN** system correctly handles Windows paths for all file operations

#### Scenario: Update on Unix-like systems
- **WHEN** user runs `openspec update` on macOS or Linux
- **THEN** system correctly handles Unix paths for all file operations
