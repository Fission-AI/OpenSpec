## ADDED Requirements

### Requirement: Global installation mode

The `openspec init` command SHALL support a `--global` flag that installs skills and commands to tool global directories instead of project directories.

#### Scenario: Global init for a specific tool

- **WHEN** `openspec init --global --tools claude` is executed
- **THEN** the system SHALL write skills and commands to Claude Code's global directory (`~/.claude/`)
- **AND** the system SHALL NOT write any files to the current working directory
- **AND** the system SHALL NOT create the `openspec/` directory structure

#### Scenario: Global init for multiple tools

- **WHEN** `openspec init --global --tools claude,opencode` is executed
- **THEN** the system SHALL write skills and commands to each tool's respective global directory

#### Scenario: Global init for all supported tools

- **WHEN** `openspec init --global --tools all` is executed
- **THEN** the system SHALL install for all tools where `getGlobalRoot()` returns non-null
- **AND** the system SHALL print a summary listing installed tools and skipped tools (those without global support)

#### Scenario: Global init without --tools

- **WHEN** `openspec init --global` is executed without `--tools`
- **THEN** the system SHALL exit with a non-zero error code
- **AND** display: "--tools is required with --global. Use --tools all to install for all tools with a known global path."

#### Scenario: Global init for tool without global support

- **WHEN** `openspec init --global --tools cursor` is executed
- **AND** Cursor has no known global filesystem path
- **THEN** the system SHALL exit with a non-zero error code
- **AND** display a clear message that the specified tool does not support global installation

#### Scenario: Global init success output

- **WHEN** global initialization completes successfully
- **THEN** the system SHALL display a summary of files written per tool
- **AND** display the global directory paths used
- **AND** SHALL NOT display project-local "next steps" instructions

### Requirement: Help text for global flag

The `openspec init --help` output SHALL document the `--global` flag.

#### Scenario: Help text content

- **WHEN** `openspec init --help` is displayed
- **THEN** the output SHALL document the `--global` flag
- **AND** note that `--tools` is required when using `--global`
- **AND** list which tools support global installation
