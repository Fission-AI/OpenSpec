## ADDED Requirements

### Requirement: Codex legacy skill migration
The update command SHALL migrate legacy Codex OpenSpec skills from `.codex/skills` to `.agents/skills`.

#### Scenario: Updating current Codex skills
- **WHEN** a project has Codex OpenSpec skills under `.agents/skills`
- **AND** the user runs `openspec update`
- **THEN** OpenSpec SHALL refresh Codex OpenSpec skills under `.agents/skills`

#### Scenario: Migrating legacy Codex skills
- **WHEN** a project has Codex OpenSpec skills under `.codex/skills`
- **AND** the user runs `openspec update`
- **THEN** OpenSpec SHALL generate refreshed Codex OpenSpec skills under `.agents/skills`
- **AND** remove OpenSpec-managed legacy `.codex/skills/openspec-*` directories after the replacement succeeds
- **AND** report that legacy Codex skills were migrated

#### Scenario: Preserving unmanaged legacy Codex skills
- **WHEN** a project has non-OpenSpec or unmanaged content under `.codex/skills`
- **AND** the user runs `openspec update`
- **THEN** OpenSpec SHALL leave that unmanaged content untouched

#### Scenario: Failed Codex migration
- **WHEN** writing Codex OpenSpec skills to `.agents/skills` fails
- **THEN** OpenSpec SHALL leave legacy `.codex/skills` content untouched
- **AND** surface the write failure with the affected path

#### Scenario: Constructing migration paths across platforms
- **WHEN** the update command migrates Codex OpenSpec skills
- **THEN** the system SHALL construct `.agents/skills` and `.codex/skills` paths using platform-aware path handling
