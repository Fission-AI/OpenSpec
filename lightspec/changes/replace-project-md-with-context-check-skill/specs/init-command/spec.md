## ADDED Requirements

### Requirement: Context-Check Skill Installation
The init command SHALL install the `/lightspec:context-check` skill as a Codex prompt during initialization.

#### Scenario: Initialization
- **WHEN** user runs `lightspec init` in a project without LightSpec
- **THEN** the context-check skill is installed in all the agents selected by the userin `<AGENT_FOLDER>/skills/lightspec-context-check/SKILL.md` (e.g. .claude/skills/lightspec-context-check/SKILL.md or .codex/skills/lightspec-context-check/SKILL.md)

## REMOVED Requirements

### Requirement: Project.md Template Generation
**Reason**: Replaced with context-check skill that validates context in agent files (CLAUDE.md or AGENTS.md)
**Migration**: Users run `/lightspec:context-check` to populate context in their agent file

The init command previously generated a `lightspec/project.md` template file with placeholder sections for project context. This file is no longer generated.

#### Scenario: No longer applicable
- **WHEN** user runs `lightspec init`
- **THEN** `lightspec/project.md` is NOT created
