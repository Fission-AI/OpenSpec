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

#### Scenario: Kimi Code paths defined

- **WHEN** looking up the `kimi` tool
- **THEN** `skillsDir` SHALL be `.kimi-code`
- **AND** OpenSpec-managed skills remaining under the legacy `.kimi/skills` directory SHALL be migrated to `.kimi-code/skills` during init and update, preserving user files

#### Scenario: Hermes Agent paths defined

- **WHEN** looking up the `hermes` tool
- **THEN** `skillsDir` SHALL be `.hermes`
- **AND** `setupNote` SHALL explain that project `.hermes/skills` must be added to `skills.external_dirs` in `~/.hermes/config.yaml`
- **AND** `openspec init` and `openspec update` SHALL display the note whenever `hermes` is configured

#### Scenario: DeepSeek Harness paths defined

- **WHEN** looking up the `dsh` tool
- **THEN** `skillsDir` SHALL be `.dsh`
- **AND** `detectionPaths` SHALL include `.dsh/skills` and `.dsh`
- **AND** OpenSpec SHALL write dsh skills under `<projectRoot>/.dsh/skills/` using platform-native path joining

#### Scenario: Tools without skillsDir

- **WHEN** a tool has no `skillsDir` defined
- **THEN** skill generation SHALL error with message indicating the tool is not supported
