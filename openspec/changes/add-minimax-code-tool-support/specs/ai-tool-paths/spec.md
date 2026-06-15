## MODIFIED Requirements

### Requirement: AIToolOption skill target fields

The `AIToolOption` interface SHALL support both fixed project-local skill targets and fixed user-home global skill targets for skill generation.

#### Scenario: Interface includes project-local skillsDir field

- **WHEN** a tool entry is defined in `AI_TOOLS` that supports project-local skill generation
- **THEN** it SHALL include a `skillsDir` field specifying the project-local base directory (for example `.claude`)

#### Scenario: Interface includes user-home global skill target metadata

- **WHEN** a tool entry in `AI_TOOLS` stores OpenSpec-managed skills in a fixed user-home global location
- **THEN** it SHALL include a `globalSkillsDir` field that lets OpenSpec derive that home-relative global skill target before detection, init, or update
- **AND** OpenSpec SHALL NOT require a project-local `skillsDir` for that tool

#### Scenario: Skills path follows Agent Skills spec for project-local tools

- **WHEN** generating skills for a tool with `skillsDir: '.claude'`
- **THEN** skills SHALL be written to `<projectRoot>/<skillsDir>/skills/`
- **AND** the `/skills` suffix is appended per Agent Skills specification

#### Scenario: Skills path follows fixed global target metadata

- **WHEN** generating skills for a tool with a home-relative global skill target
- **THEN** skills SHALL be written to the resolved user-home global skill directory
- **AND** OpenSpec SHALL NOT prepend the project root to that target

#### Scenario: Tool supports skills when either skill target field exists

- **WHEN** OpenSpec builds a list of skill-capable tools for selection, validation, help, completion, detection, init, update, or workspace setup/update
- **THEN** a tool SHALL be considered skill-capable when it has either `skillsDir` or `globalSkillsDir`
- **AND** path resolution SHALL still distinguish project-local `skillsDir` from user-home global `globalSkillsDir`

### Requirement: Path configuration for supported tools

The `AI_TOOLS` array SHALL include skill-target metadata for tools that support the Agent Skills specification.

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

#### Scenario: MiniMax Code path strategy defined

- **WHEN** looking up the `minimax-code` tool
- **THEN** its tool metadata SHALL include `globalSkillsDir: '.minimax'`
- **AND** OpenSpec SHALL derive its managed skill directory as `<home>/.minimax/skills`

#### Scenario: MiniMax Code path works with Windows user homes

- **WHEN** tool is `minimax-code`
- **AND** the current user home is a Windows-style path
- **THEN** OpenSpec SHALL derive the managed OpenSpec skill target with platform path joining
- **AND** the resulting target SHALL be equivalent to `%USERPROFILE%\.minimax\skills`

#### Scenario: Tools without skill target metadata

- **WHEN** a tool has neither `skillsDir` nor `globalSkillsDir` defined
- **THEN** skill generation SHALL error with a message indicating the tool is not supported
