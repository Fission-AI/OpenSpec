# Delta for cli-spec

## ADDED Requirements
### Requirement: Serve Command
The system SHALL provide a `serve` command to start the Model Context Protocol (MCP) server.

#### Scenario: Start MCP Server
- **WHEN** executing `openspec serve`
- **THEN** start the MCP server using stdio transport
- **AND** keep the process alive to handle requests
