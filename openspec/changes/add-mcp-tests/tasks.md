# Implementation Tasks

## Spec Updates
- [x] Update `openspec/specs/mcp-server/spec.md` to include test coverage and shared logic requirements.

## Refactoring (CLI -> Core)
- [x] Refactor `getActiveChanges` from `src/commands/change.ts` to `src/core/change-logic.ts`.
- [x] Refactor `getChangeMarkdown` and `getChangeJson` (logic part) to `src/core/change-logic.ts`.
- [x] Refactor `validate` logic to `src/core/change-logic.ts` (or `validation-logic.ts`).
- [x] Update `src/commands/change.ts` to use the new core functions.

## Testing
### Core
- [x] Migrate and adapt existing tests from `test/core/commands/change-command.*` to `test/core/change-logic.test.ts`.
- [x] Ensure `test/commands/change.*` and `test/commands/validate.*` are updated to reflect the refactoring while preserving coverage.
- [x] Verify that `test/cli-e2e/basic.test.ts` still passes to ensure no regressions in CLI behavior.

### MCP
- [x] Create `test/mcp` directory.
- [x] Create `test/mcp/tools.test.ts` to test tool definitions and execution.
- [x] Create `test/mcp/resources.test.ts` to test resource handling.
- [x] Create `test/mcp/prompts.test.ts` to test prompt generation.
- [x] Create `test/mcp/server.test.ts` to test server initialization and request handling.

## Cleanup
- [x] Identify and remove unused imports across `src/` and `test/` using an automated tool or manual audit.

## Verification
- [x] Verify all tests pass with `npm test`.
