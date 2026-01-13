# Proposal: Complete Core Logic Isolation

## Why
As part of the migration to a Pure MCP-Driven Workflow, we need to ensure that `src/core` contains only pure business logic and is completely free of CLI-specific dependencies (like `ora`, `chalk`, `inquirer`) and side effects (like `console.log`). Currently, several files in `src/core` mix logic with CLI presentation, which prevents them from being cleanly reused by the MCP server.

Additionally, to streamline agent-user interaction, CLI commands should provide actionable "next steps" upon success, reducing the need for agents to generate these instructions manually.

## What Changes
1.  **Move CLI Commands**: The CLI-specific Command classes (which handle prompts, spinners, and stdout) will be moved from `src/core/*.ts` to `src/commands/*.ts`.
2.  **Purify Core Modules**: The remaining files in `src/core` will export only pure functions that return data structures.
3.  **Update Entry Point**: `src/cli/index.ts` will be updated to import the commands from their new locations in `src/commands`.
4.  **Enhanced UX**: `ValidateCommand` will be updated to suggest `openspec show` or `openspec archive` upon successful validation.

## Affected Files
-   `src/core/init.ts` -> `src/commands/init.ts` (Logic stays in `src/core/init-logic.ts`)
-   `src/core/update.ts` -> `src/commands/update.ts` (Logic stays in `src/core/update-logic.ts`)
-   `src/core/archive.ts` -> `src/commands/archive.ts` (Logic stays in `src/core/archive-logic.ts`)
-   `src/core/view.ts` -> `src/commands/view.ts` (Logic stays in `src/core/view-logic.ts`)
-   `src/core/list.ts` -> `src/commands/list.ts` (Logic stays in `src/core/list.ts` as pure functions)
-   `src/cli/index.ts`
-   `src/commands/validate.ts` (Update success output)

## Impact
-   **Clean Architecture**: Strict separation of concerns between Logic (Core) and Presentation (CLI/MCP).
-   **Reusability**: `src/core` becomes a shared library for both the CLI and the MCP server.
-   **Testability**: Pure logic functions are easier to test without mocking stdin/stdout.
-   **Agent Efficiency**: Reduced need for agents to explain standard workflows to users.