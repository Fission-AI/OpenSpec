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
The MCP server implementation SHALL have unit and integration tests.

#### Scenario: Testing Tool Definitions
- **WHEN** the test suite runs
- **THEN** it SHALL verify that all exposed tools have correct names, descriptions, and schemas.

#### Scenario: Testing Resource Resolution
- **WHEN** the test suite runs
- **THEN** it SHALL verify that `openspec://` URIs are correctly parsed and resolved to file paths.

#### Scenario: Testing Prompt Content
- **WHEN** the test suite runs
- **THEN** it SHALL verify that prompts can be retrieved and contain expected placeholders.

### Requirement: Testability of Core Logic
The core logic used by the MCP server SHALL be testable independently of the CLI or MCP transport layer.

#### Scenario: Unit Testing Core Functions
- **WHEN** a core function (e.g., `runCreateChange`, `runListChanges`) is tested
- **THEN** it SHALL be possible to invoke it without mocking CLI-specific objects (like `process` or `console` capture).
- **AND** it SHALL return structured data rather than writing to stdout.

### Requirement: Secure Resource Resolution
The server SHALL validate all inputs used to construct file paths for resources to prevent unauthorized access.

#### Scenario: Path Traversal Prevention
- **WHEN** a client requests a resource with a path parameter containing `..` or path separators
- **THEN** the server SHALL reject the request
- **AND** return an error indicating invalid input.

### Requirement: Dedicated Entry Point
The MCP server SHALL provide a dedicated entry point for extensions to invoke directly, bypassing the CLI.

#### Scenario: Direct Invocation
- **WHEN** the server is started via `node dist/mcp/index.js`
- **THEN** it SHALL start the MCP server over stdio
- **AND** it SHALL NOT process CLI arguments or options.

