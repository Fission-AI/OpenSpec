## ADDED Requirements

### Requirement: MiniMax Code configured-tool detection during update

The update command SHALL recognize MiniMax Code from its fixed user-home OpenSpec skill target.

#### Scenario: MiniMax Code is detected from user-home global skills

- **WHEN** a user runs `openspec update`
- **AND** MiniMax Code managed OpenSpec skills exist in `<home>/.minimax/skills`
- **THEN** OpenSpec SHALL treat MiniMax Code as a configured tool even when no repo-local MiniMax directory exists

### Requirement: MiniMax Code managed skill refresh

The update command SHALL refresh MiniMax Code managed OpenSpec skills in the fixed user-home global skills directory.

#### Scenario: MiniMax Code refreshes managed skills in place

- **WHEN** a user runs `openspec update`
- **AND** MiniMax Code is configured
- **AND** delivery includes skills
- **THEN** OpenSpec SHALL refresh MiniMax Code managed OpenSpec skills in `<home>/.minimax/skills`
- **AND** SHALL overwrite existing `openspec-*` workflow skill `SKILL.md` files without requiring OpenSpec generated metadata
- **AND** SHALL leave non-OpenSpec MiniMax files outside the `openspec-*` workflow skill targets untouched

#### Scenario: MiniMax Code update does not create repo-local fallback directories

- **WHEN** a user runs `openspec update` for a project with MiniMax Code configured
- **THEN** OpenSpec SHALL NOT create a repo-local `.minimax` or `.mavis` skills directory as part of the refresh

#### Scenario: MiniMax Code user-home target cannot be written during update

- **WHEN** MiniMax Code is selected for refresh during `openspec update`
- **AND** OpenSpec cannot create or write the `<home>/.minimax/skills` target
- **THEN** OpenSpec SHALL fail MiniMax Code refresh before writing partial MiniMax Code managed files where possible
- **AND** SHALL report the filesystem error in the existing per-tool failure summary

### Requirement: MiniMax Code adapterless delivery behavior during update

The update command SHALL treat MiniMax Code like existing skills-capable tools that do not have command adapters.

#### Scenario: Delivery both refreshes skills and skips commands

- **WHEN** global delivery is `both`
- **AND** MiniMax Code is configured
- **THEN** OpenSpec SHALL refresh MiniMax Code skills in `<home>/.minimax/skills`
- **AND** SHALL skip command generation for MiniMax Code because no command adapter exists

#### Scenario: Delivery skills refreshes only skills

- **WHEN** global delivery is `skills`
- **AND** MiniMax Code is configured
- **THEN** OpenSpec SHALL refresh MiniMax Code skills in `<home>/.minimax/skills`
- **AND** SHALL NOT attempt MiniMax Code command generation

#### Scenario: Delivery commands preserves global MiniMax skills

- **WHEN** global delivery is `commands`
- **AND** MiniMax Code is configured
- **THEN** OpenSpec SHALL NOT remove existing MiniMax Code skills from `<home>/.minimax/skills`
- **AND** SHALL skip command generation for MiniMax Code because no command adapter exists

#### Scenario: MiniMax Code cleanup removes OpenSpec workflow skill directories by name

- **WHEN** OpenSpec removes MiniMax Code workflow skill directories during profile cleanup or explicit managed cleanup
- **THEN** it SHALL remove known `openspec-*` workflow skill directories by directory name
- **AND** it SHALL NOT require `SKILL.md` to contain OpenSpec generated metadata before removal
- **AND** it SHALL preserve non-OpenSpec MiniMax files outside the `openspec-*` workflow skill targets
