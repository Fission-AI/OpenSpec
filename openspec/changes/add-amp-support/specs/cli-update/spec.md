## MODIFIED Requirements
### Requirement: Slash Command Updates
The update command SHALL refresh existing slash command files for configured tools without creating new ones, and ensure the OpenCode archive command accepts change ID arguments.

#### Scenario: Updating slash commands for Amp
- **WHEN** `.agents/skills/` contains `openspec-proposal/SKILL.md`, `openspec-apply/SKILL.md`, and `openspec-archive/SKILL.md`
- **THEN** refresh the OpenSpec-managed portion of each file so the skill copy matches other tools while preserving the existing `name` and `description` frontmatter
- **AND** skip creating any missing skill files during update, mirroring the behavior for other IDEs
