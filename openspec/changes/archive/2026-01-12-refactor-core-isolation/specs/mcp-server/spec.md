## ADDED Requirements

### Requirement: Shared Core Logic
The server SHALL use the same core logic modules as the CLI to ensure consistent behavior.

#### Scenario: Using pure core modules
- **WHEN** the server executes a tool (e.g., `openspec_init`)
- **THEN** it SHALL call the pure logic function from `src/core` (e.g., `runInit`)
- **AND** it SHALL NOT invoke CLI-specific command wrappers
