# command-generation Specification

## Purpose
Define tool-agnostic command content and adapter contracts for generating tool-specific OpenSpec command files.

## Requirements

### Requirement: CommandContent interface

The system SHALL define a tool-agnostic `CommandContent` interface for command data.

#### Scenario: CommandContent structure

- **WHEN** defining a command to generate
- **THEN** `CommandContent` SHALL include:
  - `id`: string identifier (e.g., 'explore', 'apply')
  - `name`: human-readable name (e.g., 'OpenSpec Explore')
  - `description`: brief description of command purpose
  - `category`: grouping category (e.g., 'OpenSpec')
  - `tags`: array of tag strings
  - `body`: the command instruction content

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
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `allowed-tools`, `category`, `tags` fields
- **AND** the `allowed-tools` field SHALL have the value `Bash(openspec:*)` so Claude Code runs `openspec` commands from the slash command without prompting for approval
- **AND** file path SHALL follow pattern `.claude/commands/opsx/<id>.md`

#### Scenario: Cursor adapter formatting

- **WHEN** formatting a command for Cursor
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/opsx-<id>`, `id`, `category`, `description` fields
- **AND** file path SHALL follow pattern `.cursor/commands/opsx-<id>.md`

#### Scenario: Windsurf adapter formatting

- **GIVEN** RETIRED — Windsurf was rebranded to Devin Desktop and its config directory moved
- **WHEN** looking for a Windsurf adapter
- **THEN** none SHALL be registered — it is replaced by the Devin adapter below, not kept alongside a second adapter for the same product

#### Scenario: Devin Desktop adapter formatting

- **WHEN** formatting a command for Devin Desktop
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `.devin/workflows/opsx-<id>.md`

#### Scenario: Trae adapter formatting

- **WHEN** formatting a command for Trae
- **THEN** the adapter SHALL output YAML frontmatter with `name` and `description` fields
- **AND** file path SHALL follow pattern `.trae/commands/opsx-<id>.md`

#### Scenario: OpenCode adapter formatting

- **WHEN** formatting a command for OpenCode
- **THEN** the adapter SHALL output YAML frontmatter with `description` field
- **AND** file path SHALL follow pattern `.opencode/commands/opsx-<id>.md` using `path.join('.opencode', 'commands', ...)` for cross-platform compatibility
- **AND** the generated file body SHALL use hyphen-based command references (`/opsx-name`), rewritten from the colon-based form (`/opsx:name`) by `generateCommand` before the adapter formats it

### Requirement: Command generator function

The system SHALL provide a `generateCommand` function that combines content with adapter.

#### Scenario: Generate command file

- **WHEN** calling `generateCommand(content, adapter)`
- **THEN** it SHALL return an object with:
  - `path`: the file path from `adapter.getFilePath(content.id)`
  - `fileContent`: the formatted content from `adapter.formatFile(content)`

#### Scenario: Command references match the name the tool registers

- **WHEN** the adapter's file path names the command by filename (`opsx-<id>`)
- **THEN** `generateCommand` SHALL rewrite `/opsx:<id>` references in the body to `/opsx-<id>` before formatting
- **WHEN** the adapter's file path does not name the command by filename (for example it namespaces the command under an `opsx/` directory)
- **THEN** the body's `/opsx:<id>` references SHALL be left unchanged

#### Scenario: Command references use the tool's own invocation prefix

- **WHEN** an adapter declares an `invocationPrefix` because its files are not invoked with a slash (Amazon Q loads `.amazonq/prompts/opsx-<id>.md` into a prompt library invoked with `@`)
- **THEN** `generateCommand` SHALL rewrite `/opsx:<id>` references in the body to `<prefix>opsx-<id>` — for Amazon Q, `@opsx-<id>` — replacing the leading slash rather than adding to it
- **AND** generated skills and the `init`/`update` "Getting started" hint SHALL use the same form
- **WHEN** an adapter declares no `invocationPrefix`
- **THEN** the prefix SHALL default to `/`

#### Scenario: Generate multiple commands

- **WHEN** generating all opsx commands for a tool
- **THEN** the system SHALL iterate over command contents and generate each using the tool's adapter

### Requirement: CommandAdapterRegistry

The system SHALL provide a registry for looking up tool adapters.

#### Scenario: Get adapter by tool ID

- **WHEN** calling `CommandAdapterRegistry.get('cursor')`
- **THEN** it SHALL return the Cursor adapter or undefined if not registered

#### Scenario: Get all adapters

- **WHEN** calling `CommandAdapterRegistry.getAll()`
- **THEN** it SHALL return array of all registered adapters

#### Scenario: Adapter not found

- **WHEN** looking up an adapter for unregistered tool
- **THEN** `CommandAdapterRegistry.get()` SHALL return undefined
- **AND** caller SHALL handle missing adapter appropriately

### Requirement: Shared command body content

The body content of commands SHALL be shared across all tools.

#### Scenario: Same instructions across tools

- **WHEN** generating the 'explore' command for Claude and Cursor
- **THEN** both SHALL use the same `body` content
- **AND** only the frontmatter, the file path, and the spelling of `/opsx:*` command references SHALL differ

### Requirement: Legacy cleanup for renamed OpenCode command directory

The legacy cleanup module SHALL detect and remove old OpenCode command files from the previous singular `.opencode/command/` directory path.

#### Scenario: Detect old singular-path OpenCode command files

- **WHEN** running legacy artifact detection on a project with files matching `.opencode/command/opsx-*.md` or `.opencode/command/openspec-*.md`
- **THEN** the system SHALL include those files in the legacy slash command files list via `LEGACY_SLASH_COMMAND_PATHS`
- **AND** `LegacySlashCommandPattern.pattern` SHALL accept `string | string[]` to support multiple glob patterns per tool

#### Scenario: Clean up old OpenCode command files on init

- **WHEN** a user runs `openspec init` in a project with old `.opencode/command/` artifacts
- **THEN** the system SHALL remove the old files
- **AND** generate new command files at `.opencode/commands/`

#### Scenario: Auto-cleanup legacy artifacts in non-interactive mode

- **WHEN** a user runs `openspec init` in non-interactive mode (e.g., CI) and legacy artifacts are detected
- **THEN** the system SHALL auto-cleanup legacy artifacts without requiring `--force`
- **AND** legacy slash command files (100% OpenSpec-managed) SHALL be removed
- **AND** config file cleanup SHALL only remove OpenSpec markers (never delete user files)

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
