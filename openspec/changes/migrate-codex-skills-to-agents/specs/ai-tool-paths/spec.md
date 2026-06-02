## ADDED Requirements

### Requirement: Codex legacy skill path metadata
The system SHALL keep explicit legacy Codex skill path metadata so existing `.codex/skills` installations can be detected and migrated.

#### Scenario: Detecting current Codex skills
- **WHEN** tool detection checks a project containing `.agents/skills`
- **THEN** Codex SHALL be considered configured

#### Scenario: Detecting legacy Codex skills
- **WHEN** tool detection checks a project containing `.codex/skills`
- **THEN** Codex SHALL be considered configured
- **AND** Codex skill generation SHALL still target `.agents/skills`

#### Scenario: Building Codex paths across platforms
- **WHEN** constructing current or legacy Codex skill paths
- **THEN** the system SHALL use platform-aware path handling

## MODIFIED Requirements

### Requirement: Path configuration for supported tools

The `AI_TOOLS` array SHALL include `skillsDir` for tools that support the Agent Skills specification.

#### Scenario: Claude Code paths defined

- **WHEN** looking up the `claude` tool
- **THEN** `skillsDir` SHALL be `.claude`

#### Scenario: Cursor paths defined

- **WHEN** looking up the `cursor` tool
- **THEN** `skillsDir` SHALL be `.cursor`

#### Scenario: Windsurf paths defined

- **WHEN** looking up the `windsurf` tool
- **THEN** `skillsDir` SHALL be `.windsurf`

#### Scenario: Kimi CLI paths defined

- **WHEN** looking up the `kimi` tool
- **THEN** `skillsDir` SHALL be `.kimi`

#### Scenario: Codex paths defined

- **WHEN** looking up the `codex` tool
- **THEN** `skillsDir` SHALL be `.agents`
- **AND** legacy Codex skill detection SHALL include `.codex/skills`

#### Scenario: Tools without skillsDir

- **WHEN** a tool has no `skillsDir` defined
- **THEN** skill generation SHALL error with message indicating the tool is not supported
