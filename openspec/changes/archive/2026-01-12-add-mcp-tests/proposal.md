# Proposal: Add MCP Server Test Coverage & Core Refactoring

## Goal
Add comprehensive test coverage for the MCP server and refactor CLI logic into Core to enable shared testing.

## Motivation
The MCP server currently lacks dedicated unit and integration tests. Furthermore, significant logic for `change` operations (list, show, validate) resides in `src/commands`, making it difficult to test independently or reuse in the MCP server.

To ensure reliability and consistency between CLI and MCP, we need to:
1.  Refactor `list`, `show`, and `validate` logic from `src/commands/change.ts` into `src/core`.
2.  Add a robust test suite covering Core, MCP, and ensuring CLI integrations work.

## Success Criteria
### Refactoring
- [ ] `ChangeCommand` logic in `src/commands/change.ts` refactored into pure functions in `src/core/change-logic.ts` (or similar).
- [ ] CLI command updated to consume new core functions.
- [ ] MCP server updated to consume new core functions (if not already).

### Testing
- [ ] **Core**: Unit tests for new `src/core` functions (create, list, show, validate).
- [ ] **MCP**: Unit tests for `src/mcp/tools.ts`, `resources.ts`, `prompts.ts`.
- [ ] **MCP**: Integration tests for `src/mcp/server.ts`.
- [ ] **CLI**: Existing E2E tests pass or are updated to reflect refactoring.
- [ ] `mcp-server` spec updated to include these requirements.

### Cleanup
- [ ] Remove unused imports across the codebase.