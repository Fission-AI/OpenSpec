## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface

The system SHALL define a `ToolCommandAdapter` interface for per-tool formatting.

#### Scenario: Adapter interface structure

- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL require:
  - `toolId`: string identifier matching `AIToolOption.value`
  - `getFilePath(commandId: string)`: returns file path for command relative from project root unless a supported scoped install resolver provides an absolute target for that adapter
  - `formatFile(content: CommandContent)`: returns complete file content with frontmatter

#### Scenario: Claude adapter formatting

- **WHEN** formatting a command for Claude Code
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.claude/commands/opsx/<id>.md`

#### Scenario: Cursor adapter formatting

- **WHEN** formatting a command for Cursor
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/opsx-<id>`, `id`, `category`, `description` fields
- **AND** file path SHALL follow pattern `.cursor/commands/opsx-<id>.md`

#### Scenario: Windsurf adapter formatting

- **WHEN** formatting a command for Windsurf
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.windsurf/workflows/opsx-<id>.md`

## ADDED Requirements

### Requirement: Codex is not a command generation target
The command-generation system SHALL exclude Codex from active command adapter lookup and generation.

#### Scenario: Codex adapter lookup
- **WHEN** callers request a command adapter for `codex`
- **THEN** the registry SHALL return no command adapter
- **AND** command-file generation callers SHALL treat Codex the same as other skills-only tools

#### Scenario: Generating commands for all registered adapters
- **WHEN** callers enumerate registered command adapters
- **THEN** the returned adapter list SHALL NOT include Codex
- **AND** no generated command path SHALL point to a Codex global prompt directory

#### Scenario: Codex command adapter module is not exported
- **WHEN** callers import supported command adapters through the command-generation adapter index
- **THEN** Codex SHALL NOT be exported as a supported command adapter

### Requirement: Skills-only command skip behavior remains valid for Codex
The system SHALL skip Codex command-file generation while still allowing Codex skill generation.

#### Scenario: Command generation requested for selected Codex tool
- **WHEN** a selected tool is Codex
- **AND** command generation would otherwise be included by delivery mode
- **THEN** the command generation step SHALL skip Codex command files
- **AND** the Codex skill generation step SHALL remain valid
