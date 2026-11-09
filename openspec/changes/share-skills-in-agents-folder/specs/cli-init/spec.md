## ADDED Requirements

### Requirement: Init writes one shared copy of the skills

Init SHALL write each selected workflow's skill once, to `.agents/skills/`, with wording that names other workflows by skill name rather than by any tool's command syntax.

#### Scenario: Several tools selected

- **WHEN** a user runs `openspec init --tools claude,cursor,codex`
- **THEN** `.agents/skills/openspec-propose/SKILL.md` SHALL be the only real copy of that skill
- **AND** `.claude/skills/openspec-propose` SHALL link to it
- **AND** nothing SHALL be written to `.cursor/skills/`

#### Scenario: Union of workflows

- **WHEN** tools with different delivery needs are selected
- **THEN** the shared copy SHALL hold every workflow any selected tool needs as a skill
