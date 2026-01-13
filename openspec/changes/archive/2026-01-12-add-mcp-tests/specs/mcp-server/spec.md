# mcp-server Specification Deltas

## ADDED Requirements

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