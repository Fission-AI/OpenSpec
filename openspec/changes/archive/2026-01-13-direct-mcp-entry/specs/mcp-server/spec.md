## ADDED Requirements

### Requirement: Dedicated Entry Point
The MCP server SHALL provide a dedicated entry point for extensions to invoke directly, bypassing the CLI.

#### Scenario: Direct Invocation
- **WHEN** the server is started via `node dist/mcp/index.js`
- **THEN** it SHALL start the MCP server over stdio
- **AND** it SHALL NOT process CLI arguments or options.
