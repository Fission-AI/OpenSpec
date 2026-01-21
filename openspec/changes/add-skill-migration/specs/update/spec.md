<rules>
- Include scenarios for Windows path handling when dealing with file paths
- Requirements involving paths must specify cross-platform behavior
</rules>

## MODIFIED Requirements

### Requirement: Update generates skills for projects without them
The system SHALL generate skills when running update on a project that has the old OpenSpec system but lacks the new skills.

#### Scenario: Update project with old system only
- **WHEN** user runs `openspec update` on a project with openspec/AGENTS.md but no .claude/skills/openspec-*
- **THEN** system creates .claude/skills/openspec-*/ directories with SKILL.md files
- **AND** system creates .claude/commands/opsx/*.md pointer commands
- **AND** system preserves existing old artifacts (no automatic removal)

#### Scenario: Update project already on new system
- **WHEN** user runs `openspec update` on a project with .claude/skills/openspec-*
- **THEN** system updates skill files to latest version
- **AND** system displays "Skills updated" message

### Requirement: Update displays informative upgrade messaging
The system SHALL explain what changed when upgrading from the old system to the new skills-based system.

Output format:
```
OpenSpec has a new skills-based workflow!

Created:
  .claude/skills/openspec-*/ (9 skills)
  .claude/commands/opsx/* (9 shortcut commands)

These replace the old system. You can now use:
  Natural language: "I want to start a new change"
  Shortcuts: /opsx:new, /opsx:apply, /opsx:archive

Old files are still present. Run `openspec cleanup` when ready.
```

#### Scenario: Display upgrade information
- **WHEN** user runs `openspec update` and skills are created
- **THEN** system displays list of created files
- **AND** system displays usage hints for new system
- **AND** system displays cleanup hint if old artifacts exist

#### Scenario: No upgrade needed
- **WHEN** user runs `openspec update` and project is already up to date
- **THEN** system displays "Already up to date" message
- **AND** system does not display upgrade information

### Requirement: Update preserves old files
The system SHALL NOT remove old artifacts during update. Cleanup is a separate, opt-in operation.

#### Scenario: Old artifacts preserved after update
- **WHEN** user runs `openspec update` on a project with old artifacts
- **THEN** system creates new skills
- **AND** system does NOT remove CLAUDE.md
- **AND** system does NOT remove openspec/AGENTS.md
- **AND** system does NOT remove .claude/agents/
- **AND** system does NOT remove .claude/commands/openspec/

### Requirement: Update works in non-interactive mode
The system SHALL support non-interactive operation for CI/scripts.

#### Scenario: Update in CI environment
- **WHEN** user runs `openspec update` in a non-TTY environment
- **THEN** system completes update without prompts
- **AND** system outputs results to stdout
