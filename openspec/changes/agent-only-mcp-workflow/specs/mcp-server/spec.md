# Delta for mcp-server

## ADDED Requirements
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
