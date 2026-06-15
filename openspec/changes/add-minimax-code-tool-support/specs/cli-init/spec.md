## ADDED Requirements

### Requirement: MiniMax Code tool selection

The init command SHALL support MiniMax Code as a first-class tool target in both interactive and non-interactive flows.

#### Scenario: Interactive selection includes MiniMax Code

- **WHEN** a user runs `openspec init` interactively
- **THEN** the searchable tool selection list SHALL include MiniMax Code as a supported choice

#### Scenario: Non-interactive selection accepts MiniMax Code

- **WHEN** a user runs `openspec init --tools minimax-code`
- **THEN** OpenSpec SHALL accept `minimax-code` as a valid supported tool id

### Requirement: MiniMax Code skill installation target

The init command SHALL install MiniMax Code OpenSpec skills into the fixed MiniMax Code user-home skills directory.

#### Scenario: MiniMax Code installs to user-home global skills directory

- **WHEN** a user selects MiniMax Code during `openspec init`
- **AND** delivery includes skills
- **THEN** OpenSpec SHALL write MiniMax Code managed OpenSpec skills into `<home>/.minimax/skills`
- **AND** SHALL NOT create a repo-local `.minimax` or `.mavis` skills directory for that setup

#### Scenario: MiniMax Code overwrites OpenSpec workflow skill directories

- **WHEN** MiniMax Code skill generation writes an `openspec-*` workflow skill directory under `<home>/.minimax/skills`
- **AND** that workflow skill directory already exists
- **THEN** OpenSpec SHALL overwrite the generated `SKILL.md` content for that workflow
- **AND** it SHALL NOT require existing OpenSpec generated metadata before overwriting

#### Scenario: MiniMax Code already configured

- **WHEN** MiniMax Code managed OpenSpec skills already exist in `<home>/.minimax/skills`
- **THEN** interactive `openspec init` SHALL show MiniMax Code as already configured for refresh

#### Scenario: MiniMax Code user-home target cannot be written

- **WHEN** a user selects MiniMax Code during `openspec init`
- **AND** OpenSpec cannot create or write the `<home>/.minimax/skills` target
- **THEN** OpenSpec SHALL fail MiniMax Code setup before writing partial MiniMax Code managed files where possible
- **AND** SHALL report the filesystem error in the existing per-tool failure summary

### Requirement: MiniMax Code adapterless delivery behavior during init

The init command SHALL treat MiniMax Code like existing skills-capable tools that do not have command adapters.

#### Scenario: Delivery both writes skills and skips commands

- **WHEN** global delivery is `both`
- **AND** a user selects MiniMax Code during `openspec init`
- **THEN** OpenSpec SHALL write MiniMax Code skills into `<home>/.minimax/skills`
- **AND** SHALL skip command generation for MiniMax Code because no command adapter exists

#### Scenario: Delivery skills writes only skills

- **WHEN** global delivery is `skills`
- **AND** a user selects MiniMax Code during `openspec init`
- **THEN** OpenSpec SHALL write MiniMax Code skills into `<home>/.minimax/skills`
- **AND** SHALL NOT attempt MiniMax Code command generation

#### Scenario: Delivery commands does not create MiniMax skills

- **WHEN** global delivery is `commands`
- **AND** a user selects MiniMax Code during `openspec init`
- **THEN** OpenSpec SHALL NOT create MiniMax Code skills
- **AND** SHALL NOT remove existing MiniMax Code skills from `<home>/.minimax/skills`
- **AND** SHALL skip command generation for MiniMax Code because no command adapter exists
