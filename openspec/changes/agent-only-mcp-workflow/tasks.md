# Tasks: Implementation of Pure MCP-Driven Workflow

## 1. Core Logic Isolation
- [ ] 1.1 Audit `src/core/` for `ora`, `chalk`, and `console.log` usage.
- [ ] 1.2 Refactor `src/core/init.ts` to be a pure function returning initialization results.
- [ ] 1.3 Refactor `src/core/update.ts` to return update statistics instead of logging.
- [ ] 1.4 Refactor `src/core/archive.ts` to return archival reports.
- [ ] 1.5 Extract dashboard data logic from `src/core/view.ts` into a pure data provider.
- [ ] 1.6 Refactor experimental tools to follow the data-in/data-out pattern.

## 2. Interface Implementation (CLI & MCP)
- [ ] 2.1 Update CLI handlers in `src/commands/` to handle UI (spinners, colors) based on core data.
- [ ] 2.2 Implement MCP tools in `src/mcp/tools.ts` using the same core data.
- [ ] 2.3 Ensure full feature parity for all 12+ OpenSpec commands.

## 3. Build & CI Validation
- [ ] 3.1 Verify `bin/openspec.js` works as a standalone CLI after refactoring.
- [ ] 3.2 Update `.github/workflows/ci.yml` to include a check that `openspec serve` is functional (e.g., exit code 0 on help).
- [ ] 3.3 Ensure `pnpm run build` covers all new entry points.

## 4. Documentation
- [ ] 4.1 Update `src/mcp/prompts.ts` to use MCP tool names.
- [ ] 4.2 Update `GEMINI.md` and `README.md`.

## 3. Verification
- [ ] 3.1 Verify `openspec_init` works via an MCP client (e.g., Gemini CLI) in a fresh directory.
- [ ] 3.2 Verify `openspec_update` refreshes files correctly.
- [ ] 3.3 Verify `openspec_create_change` scaffolds a new change directory.
- [ ] 3.4 Ensure the CLI remains functional for users who prefer it.
