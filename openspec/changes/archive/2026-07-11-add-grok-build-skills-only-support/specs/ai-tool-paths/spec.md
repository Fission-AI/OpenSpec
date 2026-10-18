# ai-tool-paths Delta Specification

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

#### Scenario: Grok Build paths defined

- **WHEN** looking up the `grok` tool
- **THEN** `skillsDir` SHALL be `.grok`

#### Scenario: Tools without skillsDir

- **WHEN** a tool has no `skillsDir` defined
- **THEN** skill generation SHALL error with message indicating the tool is not supported
