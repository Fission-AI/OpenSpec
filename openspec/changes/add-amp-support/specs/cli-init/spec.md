## MODIFIED Requirements
### Requirement: Slash Command Configuration
The init command SHALL generate slash command files for supported editors using shared templates.

#### Scenario: Generating slash commands for Amp
- **WHEN** the user selects Amp during initialization
- **THEN** create `.agents/skills/openspec-proposal/SKILL.md`, `.agents/skills/openspec-apply/SKILL.md`, and `.agents/skills/openspec-archive/SKILL.md`
- **AND** ensure each file begins with YAML frontmatter that contains `name: <skill name>` and `description: <stage summary>` fields followed by the shared OpenSpec workflow instructions wrapped in managed markers
- **AND** populate the skill body with the same proposal/apply/archive guidance used for other tools so Amp behaves like other AI coding assistants while pointing to the `.agents/skills/` directory
