## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface

The system SHALL define a `ToolCommandAdapter` interface for per-tool formatting.

#### Scenario: Adapter interface structure

- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL require:
  - `toolId`: string identifier matching `AIToolOption.value`
  - `getFilePath(commandId: string)`: returns file path for command (relative from project root, or absolute for global-scoped tools like Codex)
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

#### Scenario: OpenCode adapter formatting

- **WHEN** formatting a command for OpenCode
- **THEN** the adapter SHALL output YAML frontmatter with `description` field
- **AND** file path SHALL follow pattern `.opencode/commands/opsx-<id>.md` using `path.join('.opencode', 'commands', ...)` for cross-platform compatibility
- **AND** the adapter SHALL transform colon-based command references (`/opsx:name`) to hyphen-based (`/opsx-name`) in the body

## ADDED Requirements

### Requirement: Legacy cleanup for renamed OpenCode command directory

The legacy cleanup module SHALL detect and remove old OpenCode command files from the previous singular `.opencode/command/` directory path.

#### Scenario: Detect old singular-path OpenCode command files

- **WHEN** running legacy artifact detection on a project with files matching `.opencode/command/openspec-*.md` or `.opencode/command/opsx-*.md`
- **THEN** the system SHALL include those files in the legacy slash command files list via `LEGACY_SLASH_COMMAND_PATHS`

#### Scenario: Clean up old OpenCode command files on init

- **WHEN** a user runs `openspec init` in a project with old `.opencode/command/` artifacts
- **THEN** the system SHALL remove the old files
- **AND** generate new command files at `.opencode/commands/`
