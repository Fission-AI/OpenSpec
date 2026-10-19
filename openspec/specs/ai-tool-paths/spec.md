# ai-tool-paths Specification

## Purpose
Define AI tool path metadata used to generate OpenSpec skills and commands in tool-specific directories.

## Requirements

### Requirement: AIToolOption skillsDir field

The `AIToolOption` interface SHALL include an optional `skillsDir` field for skill generation path configuration.

#### Scenario: Interface includes skillsDir field

- **WHEN** a tool entry is defined in `AI_TOOLS` that supports skill generation
- **THEN** it SHALL include a `skillsDir` field specifying the project-local base directory (e.g., `.claude`)

#### Scenario: Skills path follows Agent Skills spec

- **WHEN** generating skills for a tool with `skillsDir: '.claude'`
- **THEN** skills SHALL be written to `<projectRoot>/<skillsDir>/skills/`
- **AND** the `/skills` suffix is appended per Agent Skills specification

### Requirement: Path configuration for supported tools

The `AI_TOOLS` array SHALL include `skillsDir` for tools that support the Agent Skills specification.

#### Scenario: Claude Code paths defined

- **WHEN** looking up the `claude` tool
- **THEN** `skillsDir` SHALL be `.claude`

#### Scenario: Cursor paths defined

- **WHEN** looking up the `cursor` tool
- **THEN** `skillsDir` SHALL be `.cursor`

#### Scenario: Devin Desktop paths defined

- **WHEN** looking up the `devin` tool
- **THEN** `skillsDir` SHALL be `.devin`

#### Scenario: Legacy Windsurf tool ID

- **WHEN** initializing with `openspec init --tools windsurf`
- **THEN** the `windsurf` alias SHALL resolve to `devin`
- **AND** when skill delivery is enabled, skills SHALL be generated under `.devin/skills/`, not `.windsurf/skills/`

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
- **AND** auto-detection SHALL require `.dsh` to be a directory
- **AND** OpenSpec SHALL write dsh skills under `<projectRoot>/.dsh/skills/` using platform-native path joining

#### Scenario: Grok Build paths defined

- **WHEN** looking up the `grok` tool
- **THEN** `skillsDir` SHALL be `.grok`

#### Scenario: Warp paths and detection defined

- **WHEN** looking up the `warp` tool
- **THEN** `skillsDir` SHALL be `.warp`
- **AND** `detectionPaths` SHALL include `.warp` and `WARP.md`

#### Scenario: Warp invokes skills without command files

- **WHEN** generating workflows for the `warp` tool with delivery set to `commands`
- **THEN** skills SHALL remain installed in `.warp/skills/`
- **AND** no command adapter or command files SHALL be required
- **AND** each skill SHALL be directly invocable by its `/openspec-*` name

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

### Requirement: Amp skills integration

OpenSpec SHALL expose Amp as a supported skills-only tool that uses Amp's project Agent Skills directory.

#### Scenario: Selecting Amp

- **WHEN** the user selects Amp in `openspec init` or passes `--tools amp`
- **THEN** OpenSpec SHALL generate the active profile's skills under `.agents/skills/`
- **AND** the generated skills SHALL use `/openspec-<skill>` references
- **AND** OpenSpec SHALL NOT generate command files for Amp

#### Scenario: Detecting an Amp project

- **WHEN** a project contains an `.amp/` directory
- **THEN** OpenSpec SHALL detect Amp as an available tool

#### Scenario: Updating an Amp-owned skill tree

- **GIVEN** `.agents/skills/.openspec-target` names `amp`
- **WHEN** `openspec update` runs
- **THEN** OpenSpec SHALL refresh the Amp skill tree through the shared skill generator

#### Scenario: Sharing the Agent Skills directory

- **WHEN** Amp is selected with another tool that writes `.agents/skills/`
- **THEN** OpenSpec SHALL write one compatible skill tree rather than letting the tools overwrite each other

### Requirement: IBM Bob tool identity

The `AI_TOOLS` entry for `bob` SHALL use the IBM Bob product name without changing its skill or command paths.

#### Scenario: IBM Bob paths and display name

- **WHEN** looking up the `bob` tool
- **THEN** `name` and `successLabel` SHALL be `IBM Bob`
- **AND** `skillsDir` SHALL be `.bob`
- **AND** generated commands SHALL remain under `.bob/commands/`

### Requirement: Shared .agents skills target

OpenSpec SHALL provide a vendor-neutral `agents` tool target rooted at the shared `.agents` directory, for assistants that read skills from the shared location rather than a vendor-specific one.

#### Scenario: Shared agents target paths defined

- **WHEN** looking up the `agents` tool
- **THEN** `skillsDir` SHALL be `.agents`

#### Scenario: Detection keys off the shared skills subtree

- **WHEN** a project contains a `.agents/skills` path
- **THEN** OpenSpec SHALL detect `agents` as an available target

#### Scenario: A bare shared root does not select the target

- **GIVEN** a project contains `.agents` but no `.agents/skills` path
- **WHEN** OpenSpec detects available tools
- **THEN** `agents` SHALL NOT be reported as available
