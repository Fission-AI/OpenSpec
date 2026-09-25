## MODIFIED Requirements

### Requirement: ToolCommandAdapter interface

The system SHALL define a `ToolCommandAdapter` interface for per-tool formatting and install-context-aware path resolution.

#### Scenario: Adapter interface structure

- **WHEN** implementing a tool adapter
- **THEN** `ToolCommandAdapter` SHALL require:
  - `toolId`: string identifier matching `AIToolOption.value`
  - `getInstallRoot(context: InstallContext)`: returns the concrete absolute installation root for the resolved effective scope
  - `getFilePath(commandId: string, context: InstallContext)`: returns the concrete absolute command path for the resolved effective scope
  - `formatFile(content: CommandContent)`: returns complete file content with frontmatter
- **AND** `InstallContext` SHALL provide requested/effective scope, project root, user home, platform, and relevant environment values
- **AND** the returned command path SHALL remain within the installation root returned for the same context

#### Scenario: Claude adapter formatting

- **WHEN** formatting a command for Claude Code with project install context
- **THEN** the adapter SHALL output YAML frontmatter with `name`, `description`, `category`, `tags` fields
- **AND** file path SHALL follow pattern `<projectRoot>/.claude/commands/opsx/<id>.md`

#### Scenario: Cursor adapter formatting

- **WHEN** formatting a command for Cursor with project install context
- **THEN** the adapter SHALL output YAML frontmatter with `name` as `/opsx-<id>`, `id`, `category`, `description` fields
- **AND** file path SHALL follow pattern `<projectRoot>/.cursor/commands/opsx-<id>.md`

#### Scenario: Windsurf adapter formatting

- **WHEN** formatting a command for the current Devin Desktop integration with project install context
- **THEN** the adapter SHALL output its supported frontmatter
- **AND** file path SHALL follow pattern `<projectRoot>/.devin/workflows/opsx-<id>.md`
- **AND** the retired `windsurf` alias SHALL resolve to that adapter rather than write new `.windsurf` files

#### Scenario: Trae adapter formatting

- **WHEN** formatting a command for Trae with project install context
- **THEN** the adapter SHALL output YAML frontmatter with `name` and `description` fields
- **AND** file path SHALL follow pattern `<projectRoot>/.trae/commands/opsx-<id>.md`

#### Scenario: Project-scoped adapter path

- **WHEN** effective command scope is `project`
- **THEN** the adapter SHALL return its matrix-recorded concrete project installation root and file path
- **AND** the caller SHALL validate both paths within the project root

#### Scenario: Global-scoped adapter path

- **WHEN** a registered adapter whose command surface declares global support receives effective command scope `global`
- **THEN** it SHALL return the concrete user-level installation root and file path from install context
- **AND** the returned layout SHALL be the officially verified user-level layout recorded in the matrix
- **AND** the installation root SHALL be contained within the documented platform-correct user root for that adapter
- **AND** preflight SHALL reject the returned command path unless it is contained within the installation root returned for the same context

#### Scenario: Adapter command scopes are complete

- **WHEN** enumerating the currently registered command adapters
- **THEN** every adapter-backed surface SHALL accept `project` install context
- **AND** only adapters with an officially verified user-level command path SHALL accept `global` install context
- **AND** tools without a registered adapter SHALL NOT gain a command-file surface from install-scope resolution

#### Scenario: Project-only adapter falls back before path resolution

- **WHEN** requested command scope is `global`
- **AND** the selected registered adapter does not declare global command support
- **THEN** the shared scope resolver SHALL select its declared project scope with an explicit fallback reason before constructing install context
- **AND** the adapter SHALL receive effective command scope `project`
- **AND** explicit `--tools` selection SHALL NOT bypass the matrix or opt the adapter into unverified global support

### Requirement: Command generator function

The system SHALL provide `generateCommand` and `generateCommands` functions that combine content with an adapter using one resolved install context.

#### Scenario: Generate command file

- **WHEN** calling `generateCommand(content, adapter, context)`
- **THEN** it SHALL return an object with:
  - `path`: the concrete absolute file path from `adapter.getFilePath(content.id, context)`
  - `fileContent`: the formatted content from `adapter.formatFile(content)` after invocation transformation
- **AND** it SHALL reuse `adapter.getInstallRoot(context)` for containment rather than reconstructing a root from the file path

#### Scenario: Command references match the name the tool registers

- **WHEN** the adapter's scoped file path names the command by filename (`opsx-<id>`)
- **THEN** `generateCommand` SHALL rewrite `/opsx:<id>` references in the body to `/opsx-<id>` before formatting
- **WHEN** the adapter's scoped file path does not name the command by filename (for example it namespaces the command under an `opsx/` directory)
- **THEN** the body's `/opsx:<id>` references SHALL be left unchanged

#### Scenario: Command references use the tool's own invocation prefix

- **WHEN** an adapter declares an `invocationPrefix` because its files are not invoked with a slash
- **THEN** `generateCommand` SHALL rewrite `/opsx:<id>` references in the body to `<prefix>opsx-<id>` by replacing the leading slash
- **AND** tool-installed skill artifacts and init/update getting-started hints SHALL use that same adapter-registered form only when the resolved install plan also generates the referenced adapter-backed commands for that tool
- **AND** when those command files are not generated, tool-installed skill artifacts and hints SHALL use the applicable skill-reference transformation instead of pointing to nonexistent commands
- **WHEN** an adapter declares no `invocationPrefix`
- **THEN** the prefix SHALL default to `/`

#### Scenario: Committed skill distribution and source templates remain canonical

- **WHEN** generating the committed `skills/<skill-name>/SKILL.md` distribution
- **THEN** generation SHALL continue to use `transformToSkillReferences`
- **AND** SHALL NOT apply an adapter-specific `invocationPrefix` or install-scope transformation
- **WHEN** authoring or storing command and workflow source templates
- **THEN** their bodies SHALL retain canonical `/opsx:<id>` references
- **AND** adapter-specific transformation SHALL occur only while producing tool-installed artifacts or init/update getting-started hints, without modifying the source templates

#### Scenario: Generate multiple commands

- **WHEN** generating all OPSX commands for a tool
- **THEN** the system SHALL iterate over command contents and generate each with the same adapter and resolved install context

#### Scenario: Invocation derivation uses scoped adapter path

- **WHEN** command invocation spelling is derived from adapter path shape
- **THEN** derivation SHALL pass the same install context used for generation
- **AND** project and global layouts that register the same command name SHALL produce the same invocation spelling

#### Scenario: Scoped path is used by all command consumers

- **WHEN** generated commands are detected, compared for freshness, reported, or removed
- **THEN** those consumers SHALL reuse the adapter-returned installation root and command path from the same resolved install plan
- **AND** SHALL NOT fall back to an unscoped `getFilePath` call
