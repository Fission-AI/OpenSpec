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

#### Scenario: Commands handled apart from the move

- **WHEN** update moves a tool's skills
- **THEN** this move SHALL NOT touch the tool's command files, which the skills-only requirement covers

### Requirement: Update installs skills only and removes generated command files

Update SHALL generate no command files for any tool, whatever the `delivery` setting. For every tool with a command adapter, it SHALL remove the command files OpenSpec generated (equal to this version's output or to a released version's) and SHALL keep and list any other file at those paths.

#### Scenario: Generated command files from 1.x

- **GIVEN** a project holds command files a 1.x release generated, unedited
- **WHEN** the user runs `openspec update`
- **THEN** those files SHALL be removed and the output SHALL say how many
- **AND** folders left empty by the removal SHALL be removed, never above the project

#### Scenario: Edited command file

- **GIVEN** a command file differs from what OpenSpec generated
- **WHEN** update runs
- **THEN** the file SHALL be kept byte for byte and listed as likely edited

#### Scenario: Commands-only 1.x project

- **GIVEN** a tool has command files and no skills
- **WHEN** update runs
- **THEN** the tool SHALL be treated as set up but not current
- **AND** update SHALL install its skills and remove its generated command files

#### Scenario: Delivery set to commands

- **GIVEN** the global `delivery` setting is `commands`
- **WHEN** update runs
- **THEN** it SHALL behave as for any other setting: skills installed, no command files written

## REMOVED Requirements

### Requirement: Slash Command Updates

**Reason**: OpenSpec 2.0 generates no command files.

**Migration**: Use the skills; `openspec update` removes the old generated command files. See `docs-lab/help/upgrade-to-2.md`.
