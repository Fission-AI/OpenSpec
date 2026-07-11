# ai-tool-paths Delta Specification

## MODIFIED Requirements

### Requirement: AIToolOption skillsDir field

The `AIToolOption` interface SHALL include an optional `skillsDir` field for skill generation path configuration, and an optional `installDir` field for overriding the skill installation directory.

#### Scenario: Interface includes skillsDir field

- **WHEN** a tool entry is defined in `AI_TOOLS` that supports skill generation
- **THEN** it SHALL include a `skillsDir` field specifying the project-local base directory (e.g., `.claude`)

#### Scenario: Skills path follows Agent Skills spec

- **WHEN** generating skills for a tool with `skillsDir: '.claude'` and no `installDir`
- **THEN** skills SHALL be written to `<projectRoot>/<skillsDir>/skills/`
- **AND** the `/skills` suffix is appended per Agent Skills specification

#### Scenario: installDir overrides installation path

- **WHEN** a tool has `installDir` set (e.g., `'~/.hermes/skills'`)
- **THEN** skills SHALL be written to the expanded `installDir` path (with `~` expanded to the user home directory)
- **AND** the `skillsDir` field SHALL still be used as the project-local detection marker

#### Scenario: installDir supports tilde expansion

- **WHEN** `installDir` starts with `~`
- **THEN** the `~` SHALL be expanded to the operating system home directory
- **AND** the resulting path SHALL be absolute

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

#### Scenario: Hermes Agent paths defined

- **WHEN** looking up the `hermes` tool
- **THEN** `skillsDir` SHALL be `.hermes`
- **AND** `installDir` SHALL be `'~/.hermes/skills'`

#### Scenario: Tools without skillsDir

- **WHEN** a tool has no `skillsDir` defined
- **THEN** skill generation SHALL error with message indicating the tool is not supported

### Requirement: Cross-platform path handling

The system SHALL handle paths correctly across operating systems.

#### Scenario: Path construction on Windows

- **WHEN** constructing skill paths on Windows
- **THEN** the system SHALL use `path.join()` for all path construction
- **AND** SHALL NOT hardcode forward slashes

#### Scenario: Path construction on Unix

- **WHEN** constructing skill paths on macOS or Linux
- **THEN** the system SHALL use `path.join()` for consistency

### Requirement: Skills directory resolution helpers

The system SHALL provide shared helper functions to resolve skill installation and marker directories consistently across all consumers.

#### Scenario: Resolving skills directory for project-local tools

- **WHEN** a tool has no `installDir` set
- **THEN** `resolveSkillsDir` SHALL return `<projectRoot>/<skillsDir>/skills`

#### Scenario: Resolving skills directory for global-install tools

- **WHEN** a tool has `installDir` set (e.g., `'~/.hermes/skills'`)
- **THEN** `resolveSkillsDir` SHALL return the expanded absolute path
- **AND** SHALL ignore `projectRoot`

#### Scenario: Resolving marker directory

- **WHEN** resolving the project-local marker directory for any tool
- **THEN** `resolveMarkerDir` SHALL always return `<projectRoot>/<skillsDir>/skills`
- **AND** SHALL ignore `installDir`
