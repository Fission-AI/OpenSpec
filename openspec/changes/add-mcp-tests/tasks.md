# Implementation Tasks

## Spec Updates
- [ ] Update `openspec/specs/mcp-server/spec.md` to include test coverage and shared logic requirements.

## Refactoring (CLI -> Core)
- [ ] Refactor `getActiveChanges` from `src/commands/change.ts` to `src/core/change-logic.ts`.
- [ ] Refactor `getChangeMarkdown` and `getChangeJson` (logic part) to `src/core/change-logic.ts`.
- [ ] Refactor `validate` logic to `src/core/change-logic.ts` (or `validation-logic.ts`).
- [ ] Update `src/commands/change.ts` to use the new core functions.

## Testing
### Core
- [ ] Migrate and adapt existing tests from `test/core/commands/change-command.*` to `test/core/change-logic.test.ts`.
- [ ] Ensure `test/commands/change.*` and `test/commands/validate.*` are updated to reflect the refactoring while preserving coverage.
- [ ] Verify that `test/cli-e2e/basic.test.ts` still passes to ensure no regressions in CLI behavior.

### MCP
- [ ] Create `test/mcp` directory.
- [ ] Create `test/mcp/tools.test.ts` to test tool definitions and execution.
- [ ] Create `test/mcp/resources.test.ts` to test resource handling.
- [ ] Create `test/mcp/prompts.test.ts` to test prompt generation.
- [ ] Create `test/mcp/server.test.ts` to test server initialization and request handling.

## Cleanup
- [ ] Identify and remove unused imports across `src/` and `test/` using an automated tool or manual audit.

## Verification
- [ ] Verify all tests pass with `npm test`.