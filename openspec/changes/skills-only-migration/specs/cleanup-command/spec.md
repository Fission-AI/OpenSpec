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

### Requirement: Cleanup command removes old OpenSpec artifacts
The system SHALL provide an `openspec cleanup` command that removes old OpenSpec artifacts from the project. The command SHALL remove:
- `CLAUDE.md` (root stub file)
- `openspec/AGENTS.md` (monolithic instruction file)
- `.claude/agents/` directory (old subagent definitions)
- `.claude/commands/openspec/` directory (old slash commands)

The command SHALL NOT remove:
- `.claude/skills/` (new skills)
- `.claude/commands/opsx/` (new pointer commands)
- `openspec/config.yaml`, `openspec/specs/`, `openspec/changes/` (user data)
- Any non-OpenSpec files in `.claude/`

#### Scenario: Successful cleanup with all old artifacts present
- **WHEN** user runs `openspec cleanup --yes` in a project with all old artifacts
- **THEN** system removes CLAUDE.md, openspec/AGENTS.md, .claude/agents/, and .claude/commands/openspec/
- **AND** system preserves .claude/skills/, .claude/commands/opsx/, and openspec/ user data

#### Scenario: Cleanup with partial old artifacts
- **WHEN** user runs `openspec cleanup --yes` and only some old artifacts exist
- **THEN** system removes only the old artifacts that exist
- **AND** system does not error on missing artifacts

### Requirement: Cleanup requires confirmation by default
The system SHALL require interactive confirmation before removing files when run without flags.

#### Scenario: Interactive confirmation prompt
- **WHEN** user runs `openspec cleanup` without --yes flag
- **THEN** system displays list of files that will be removed
- **AND** system prompts user for confirmation before proceeding

#### Scenario: Abort on declined confirmation
- **WHEN** user declines the confirmation prompt
- **THEN** system exits without removing any files
- **AND** system displays "Cleanup cancelled" message

### Requirement: Cleanup supports --yes flag for non-interactive mode
The system SHALL support a `--yes` flag to skip confirmation prompts for CI/script usage.

#### Scenario: Skip confirmation with --yes flag
- **WHEN** user runs `openspec cleanup --yes`
- **THEN** system removes old artifacts without prompting for confirmation

### Requirement: Cleanup supports --dry-run flag for preview
The system SHALL support a `--dry-run` flag that shows what would be removed without making changes.

#### Scenario: Preview cleanup with --dry-run
- **WHEN** user runs `openspec cleanup --dry-run`
- **THEN** system displays list of files that would be removed
- **AND** system does not remove any files
- **AND** system indicates this is a dry run

### Requirement: Cleanup requires new system to be set up
The system SHALL verify that the new skills-based system is set up before allowing cleanup. This prevents users from accidentally removing instructions without having the replacement in place.

#### Scenario: Error when new system not set up
- **WHEN** user runs `openspec cleanup` and .claude/skills/openspec-* does not exist
- **THEN** system displays error "New skills-based system not found. Run `openspec update` first."
- **AND** system exits without removing any files

#### Scenario: Proceed when new system exists
- **WHEN** user runs `openspec cleanup --yes` and .claude/skills/openspec-* exists
- **THEN** system proceeds with cleanup

### Requirement: Cleanup uses cross-platform paths
The system SHALL use path.join() for all file path operations to ensure cross-platform compatibility.

#### Scenario: Cleanup on Windows
- **WHEN** user runs `openspec cleanup --yes` on Windows
- **THEN** system correctly handles backslash path separators
- **AND** system successfully removes old artifacts

#### Scenario: Cleanup on Unix-like systems
- **WHEN** user runs `openspec cleanup --yes` on macOS or Linux
- **THEN** system correctly handles forward-slash path separators
- **AND** system successfully removes old artifacts
