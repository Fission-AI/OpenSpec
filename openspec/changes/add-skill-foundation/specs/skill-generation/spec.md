<rules>
- Include scenarios for Windows path handling when dealing with file paths
- Requirements involving paths must specify cross-platform behavior
</rules>

## MODIFIED Requirements

### Requirement: Skill generation uses unified SkillDefinition pattern
The system SHALL use a single `SkillDefinition[]` array as the source of truth for all skill and command generation. This replaces the 18 separate template functions.

The SkillDefinition interface SHALL include:
- `id`: string - Unique identifier (e.g., "new-change")
- `name`: string - Full skill name for folder (e.g., "openspec-new-change")
- `shortcut`: string - Command path (e.g., "opsx/new")
- `description`: string - Used in frontmatter for both skill and command
- `instructions`: string - Full instruction content (single source of truth)

#### Scenario: Generate skill from definition
- **WHEN** skill generation runs for a SkillDefinition
- **THEN** system creates .claude/skills/{name}/SKILL.md
- **AND** skill file contains YAML frontmatter with name and description
- **AND** skill file contains full instructions from definition

#### Scenario: Generate pointer command from definition
- **WHEN** skill generation runs for a SkillDefinition
- **THEN** system creates .claude/commands/{shortcut}.md
- **AND** command file contains YAML frontmatter with name and description
- **AND** command file references the skill instead of duplicating instructions

### Requirement: Pointer commands reference skills
The system SHALL generate pointer commands that reference skills rather than duplicating instruction content.

Pointer command format:
```markdown
---
name: <display name>
description: <description>
---

Use the **<skill-name>** skill to handle this request.

Argument: <argument description>
```

#### Scenario: Pointer command references correct skill
- **WHEN** pointer command is generated for "new-change" skill
- **THEN** command contains "Use the **openspec-new-change** skill"
- **AND** command does NOT contain the full workflow instructions

#### Scenario: Pointer command is concise
- **WHEN** any pointer command is generated
- **THEN** command file is less than 15 lines
- **AND** command file only contains reference and argument hint

### Requirement: All 9 OpenSpec skills are generated
The system SHALL generate the complete set of OpenSpec skills:
1. openspec-explore
2. openspec-new-change
3. openspec-continue-change
4. openspec-apply-change
5. openspec-ff-change
6. openspec-sync-specs
7. openspec-archive-change
8. openspec-verify-change
9. openspec-bulk-archive-change

#### Scenario: Complete skill set generation
- **WHEN** skill generation runs
- **THEN** system creates 9 skill directories under .claude/skills/
- **AND** each skill directory contains SKILL.md
- **AND** system creates 9 command files under .claude/commands/opsx/

### Requirement: Skill generation is idempotent
The system SHALL safely overwrite existing skill files with updated content. Running generation multiple times produces the same result.

#### Scenario: Regenerate existing skills
- **WHEN** skill generation runs on a project with existing skills
- **THEN** system overwrites skill files with current content
- **AND** no duplicate files are created
- **AND** skill content reflects latest template version

### Requirement: Skill generation uses cross-platform paths
The system SHALL use path.join() for all file path construction during generation.

#### Scenario: Generate skills on Windows
- **WHEN** skill generation runs on Windows
- **THEN** system creates skill directories with correct paths
- **AND** all skill files are accessible and valid

#### Scenario: Generate skills on Unix-like systems
- **WHEN** skill generation runs on macOS or Linux
- **THEN** system creates skill directories with correct paths
- **AND** all skill files are accessible and valid
