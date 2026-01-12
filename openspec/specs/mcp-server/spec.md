# mcp-server Specification

## Purpose
TBD - created by archiving change add-mcp-server. Update Purpose after archive.
## Requirements
### Requirement: Expose Tools
The server SHALL expose core OpenSpec capabilities as MCP tools.

#### Scenario: List Tools
- **WHEN** the client requests `tools/list`
- **THEN** return `openspec_list`, `openspec_show`, `openspec_validate`, `openspec_archive` tools
- **AND** include descriptions and JSON schemas for arguments

### Requirement: Expose Resources
The server SHALL expose specs and changes as MCP resources.

#### Scenario: List Resources
- **WHEN** the client requests `resources/list`
- **THEN** return a list of available specs and changes with `openspec://` URIs

#### Scenario: Read Resource
- **WHEN** the client requests `resources/read` for a valid URI
- **THEN** return the content of the corresponding file (markdown or JSON)

### Requirement: Expose Prompts
The server SHALL expose standard OpenSpec prompts.

#### Scenario: List Prompts
- **WHEN** the client requests `prompts/list`
- **THEN** return `proposal`, `apply`, `archive` prompts

### Requirement: Shared Core Logic
The server SHALL use the same core logic modules as the CLI to ensure consistent behavior.

#### Scenario: Using pure core modules
- **WHEN** the server executes a tool (e.g., `openspec_init`)
- **THEN** it SHALL call the pure logic function from `src/core` (e.g., `runInit`)
- **AND** it SHALL NOT invoke CLI-specific command wrappers

### Requirement: Shared Core Implementation
The MCP server and the CLI SHALL share the same underlying business logic implementation for all operations.

#### Scenario: Consistency between CLI and MCP
- **WHEN** an operation (e.g., init, list, archive) is performed via CLI
- **AND** the same operation is performed via MCP
- **THEN** both SHALL yield consistent results by calling the same core functions.

### Requirement: Project Initialization Tool
The MCP server SHALL provide a tool `openspec_init` to initialize the OpenSpec structure.

#### Scenario: Initializing project via MCP
- **WHEN** the `openspec_init` tool is called
- **THEN** execute the shared `runInit` logic
- **AND** return a structured summary of created items.

### Requirement: Change Creation Tool
The MCP server SHALL provide a tool `openspec_create_change` to scaffold a new change directory.

#### Scenario: Creating a new change via MCP
- **WHEN** the `openspec_create_change` tool is called with `name`
- **THEN** execute the shared `runCreateChange` logic
- **AND** return the paths of created files.

### Requirement: MCP-First Instructions
The MCP server SHALL provide prompts that prioritize MCP tools while maintaining CLI references as a secondary option for human readability.

#### Scenario: Guidance in MCP prompts
- **WHEN** an agent retrieves a prompt via MCP
- **THEN** the instructions SHALL explicitly list MCP tool calls as the primary action (e.g., "Use openspec_list_changes to view state")
- **AND** the instructions MAY provide the CLI equivalent for reference.

### Requirement: Test Coverage
The MCP server SHALL have dedicated unit and integration tests.

#### Scenario: Tool Testing
- **WHEN** running tests
- **THEN** verify that all exposed tools perform their intended core logic invocations.

#### Scenario: Resource Testing
- **WHEN** running tests
- **THEN** verify that resources are correctly listed and readable.

#### Scenario: Prompt Testing
- **WHEN** running tests
- **THEN** verify that prompts are correctly exposed and populated.