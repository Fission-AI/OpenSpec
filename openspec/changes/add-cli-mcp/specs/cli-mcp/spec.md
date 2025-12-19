## ADDED Requirements

### Requirement: MCP Server Subcommand

The CLI SHALL provide an `openspec mcp` subcommand that starts a stdio-based MCP (Model Context Protocol) server for AI agent integration.

#### Scenario: Starting the MCP server

- **WHEN** executing `openspec mcp`
- **THEN** start a stdio-based MCP server
- **AND** register all resources, tools, and prompts
- **AND** output startup confirmation to stderr: `[openspec-mcp] Server started on stdio`

#### Scenario: Debug mode

- **WHEN** executing `openspec mcp --debug`
- **THEN** enable debug logging to stderr
- **AND** output path configuration details

#### Scenario: Graceful shutdown

- **WHEN** receiving SIGINT signal
- **THEN** close the MCP server gracefully
- **AND** exit with code 0

### Requirement: MCP Resources

The MCP server SHALL expose 10 read-only resources for accessing OpenSpec data.

#### Scenario: Instructions resource

- **WHEN** fetching `openspec://instructions`
- **THEN** return the content of `openspec/AGENTS.md`
- **AND** return a default template if the file does not exist

#### Scenario: Project resource

- **WHEN** fetching `openspec://project`
- **THEN** return the content of `openspec/project.md`
- **AND** return an empty template if the file does not exist

#### Scenario: Specs list resource

- **WHEN** fetching `openspec://specs`
- **THEN** return a markdown list of all specification directories in `openspec/specs/`
- **AND** include links to individual spec resources

#### Scenario: Individual spec resource

- **WHEN** fetching `openspec://specs/{capability}`
- **THEN** return the content of `openspec/specs/{capability}/spec.md`
- **AND** return a "not found" message if the spec does not exist

#### Scenario: Changes list resource

- **WHEN** fetching `openspec://changes`
- **THEN** return a markdown list of all active change directories
- **AND** exclude the `archive/` subdirectory
- **AND** include links to individual change resources

#### Scenario: Individual change resource

- **WHEN** fetching `openspec://changes/{changeId}`
- **THEN** return all available files (proposal.md, tasks.md, design.md) as multiple content items
- **AND** return a "not found" message if the change does not exist

#### Scenario: Change proposal resource

- **WHEN** fetching `openspec://changes/{changeId}/proposal`
- **THEN** return the content of `openspec/changes/{changeId}/proposal.md`

#### Scenario: Change tasks resource

- **WHEN** fetching `openspec://changes/{changeId}/tasks`
- **THEN** return the content of `openspec/changes/{changeId}/tasks.md`

#### Scenario: Change design resource

- **WHEN** fetching `openspec://changes/{changeId}/design`
- **THEN** return the content of `openspec/changes/{changeId}/design.md`

#### Scenario: Archive resource

- **WHEN** fetching `openspec://archive`
- **THEN** return a markdown list of archived changes sorted by date (newest first)

### Requirement: MCP Tools

The MCP server SHALL expose 6 tools that map to CLI commands and provide structured JSON responses.

#### Scenario: Init tool

- **WHEN** invoking the `init` tool
- **THEN** create the OpenSpec directory structure
- **AND** return JSON with success status, created files, and next steps
- **AND** return an error if OpenSpec is already initialized

#### Scenario: List tool for changes

- **WHEN** invoking the `list` tool with `specs=false`
- **THEN** return JSON with change list including id, file presence, and optional progress
- **AND** exclude archived changes

#### Scenario: List tool for specs

- **WHEN** invoking the `list` tool with `specs=true`
- **THEN** return JSON with spec list including capability names and optional summaries

#### Scenario: Show tool for change

- **WHEN** invoking the `show` tool with `type='change'`
- **THEN** return JSON with change details including proposal, tasks, design, and spec deltas
- **AND** include task progress calculation

#### Scenario: Show tool for spec

- **WHEN** invoking the `show` tool with `type='spec'`
- **THEN** return JSON with spec content

#### Scenario: Validate tool

- **WHEN** invoking the `validate` tool
- **THEN** check for required files and sections
- **AND** return JSON with valid status, errors, and warnings
- **AND** support `strict` mode that fails on warnings

#### Scenario: Archive tool

- **WHEN** invoking the `archive` tool
- **THEN** check task completion status
- **AND** support dry-run mode for preview
- **AND** merge spec deltas when `updateSpecs=true`
- **AND** move change to archive with date prefix
- **AND** support `force` mode to bypass task completion check

#### Scenario: Update project context tool

- **WHEN** invoking the `update_project_context` tool
- **THEN** write content to `openspec/project.md`
- **AND** support `merge` mode to append instead of replace
- **AND** support `section` parameter to update specific sections

### Requirement: MCP Prompts

The MCP server SHALL expose 3 guided workflow prompts.

#### Scenario: Propose prompt

- **WHEN** using the `openspec-propose` prompt
- **THEN** return a message instructing the AI to:
  - Read required resources (instructions, project, specs, changes)
  - Analyze the request for conflicts
  - Create the proposal directory structure
  - Validate the proposal

#### Scenario: Apply prompt

- **WHEN** using the `openspec-apply` prompt with a `changeId`
- **THEN** return a message instructing the AI to:
  - Read the change resources
  - Implement tasks sequentially
  - Update task checkboxes as work completes
  - Validate continuously

#### Scenario: Archive prompt

- **WHEN** using the `openspec-archive` prompt with a `changeId`
- **THEN** return a message instructing the AI to:
  - Verify all tasks are complete
  - Run validation
  - Preview the archive operation
  - Execute the archive
  - Verify post-archive specs

### Requirement: Path Resolution

The MCP server SHALL support flexible path resolution for OpenSpec directories.

#### Scenario: Default path resolution

- **WHEN** no environment variables are set
- **THEN** use the current working directory as the project root
- **AND** look for OpenSpec in `{cwd}/openspec/`

#### Scenario: Fixed root path resolution

- **WHEN** `OPENSPEC_ROOT` is set and `OPENSPEC_AUTO_PROJECT_ROOT` is not `true`
- **THEN** use `OPENSPEC_ROOT` as the specs root
- **AND** look for OpenSpec in `{OPENSPEC_ROOT}/openspec/`

#### Scenario: Auto project root path resolution

- **WHEN** `OPENSPEC_ROOT` is set and `OPENSPEC_AUTO_PROJECT_ROOT` is `true`
- **THEN** derive a relative path from the home directory to the current project
- **AND** use `{OPENSPEC_ROOT}/{relative-path}/openspec/` as the specs location
- **AND** create the directory if it does not exist

### Requirement: Server Configuration

The MCP server SHALL provide standard MCP server metadata.

#### Scenario: Server identification

- **WHEN** an MCP client connects
- **THEN** identify the server as `openspec` with version matching the CLI version

#### Scenario: Stdio transport

- **WHEN** the server starts
- **THEN** use stdio transport for MCP communication
- **AND** output all logs and debug messages to stderr

