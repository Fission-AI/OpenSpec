## ADDED Requirements

### Requirement: Update moves per-tool skill copies into the shared folder

Update SHALL treat each tool's own `<skillsDir>/skills/openspec-*` folders from earlier releases as a former location of its skills.

#### Scenario: Untouched copy

- **GIVEN** `.cursor/skills/openspec-propose/SKILL.md` is unchanged output of an earlier release
- **WHEN** the user runs `openspec update`
- **THEN** the shared copy SHALL be written to `.agents/skills/openspec-propose/`
- **AND** the `.cursor` copy SHALL be removed

#### Scenario: Linked tool

- **GIVEN** `.claude/skills/openspec-propose/` is unchanged output of an earlier release
- **WHEN** the user runs `openspec update`
- **THEN** it SHALL be replaced by a link to the shared copy

#### Scenario: Edited copy

- **GIVEN** a user edited `.kiro/skills/openspec-explore/SKILL.md`
- **WHEN** the user runs `openspec update`
- **THEN** the file SHALL be kept and reported
- **AND** no link SHALL be made in its place

#### Scenario: Commands untouched

- **WHEN** update moves a tool's skills
- **THEN** that tool's command files SHALL NOT be moved or removed by this move
