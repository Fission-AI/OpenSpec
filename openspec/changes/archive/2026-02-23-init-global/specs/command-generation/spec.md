## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface

The system SHALL define a `ToolCommandAdapter` interface for per-tool formatting.

#### Scenario: Adapter interface structure

- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL require:
  - `toolId`: string identifier matching `AIToolOption.value`
  - `getFilePath(commandId: string)`: returns file path for command (relative from project root)
  - `formatFile(content: CommandContent)`: returns complete file content with frontmatter
- **AND** `ToolCommandAdapter` SHALL optionally support:
  - `getGlobalRoot()`: returns absolute path to the tool's global configuration directory, or `null` if the tool has no global filesystem path

#### Scenario: Claude adapter formatting

- **WHEN** formatting a command for Claude Code
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.claude/commands/opsx/<id>.md`
- **AND** `getGlobalRoot()` SHALL return `~/.claude/` (macOS/Linux) or `%APPDATA%\Claude\` (Windows)

#### Scenario: Cursor adapter formatting

- **WHEN** formatting a command for Cursor
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/opsx-<id>`, `id`, `category`, `description` fields
- **AND** file path SHALL follow pattern `.cursor/commands/opsx-<id>.md`
- **AND** `getGlobalRoot()` SHALL return `null`

#### Scenario: Windsurf adapter formatting

- **WHEN** formatting a command for Windsurf
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.windsurf/workflows/opsx-<id>.md`
- **AND** `getGlobalRoot()` SHALL return `null`

## ADDED Requirements

### Requirement: CommandAdapterRegistry global filtering

The registry SHALL support filtering adapters by global installation support.

#### Scenario: Get adapters with global support

- **WHEN** calling `CommandAdapterRegistry.getGlobalAdapters()`
- **THEN** it SHALL return an array of adapters where `getGlobalRoot()` returns a non-null value

### Requirement: Codex adapter migration

The Codex adapter SHALL separate project-local and global path concerns.

#### Scenario: Codex project-local path

- **WHEN** calling `getFilePath()` on the Codex adapter
- **THEN** it SHALL return a project-relative path: `.codex/prompts/opsx-<id>.md`

#### Scenario: Codex global path

- **WHEN** calling `getGlobalRoot()` on the Codex adapter
- **THEN** it SHALL return the absolute path to the Codex home directory (respecting `$CODEX_HOME`, defaulting to `~/.codex/`)
