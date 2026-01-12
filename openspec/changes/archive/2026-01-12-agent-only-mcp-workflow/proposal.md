# Proposal: Transition to Pure MCP-Driven Workflow

## Why
Currently, using OpenSpec with AI agents often requires the OpenSpec CLI to be installed in the environment where the agent is running. This creates adoption friction and dependency management overhead. By leveraging the Model Context Protocol (MCP), we can package all OpenSpec logic into a self-contained server that the Gemini CLI (or any MCP client) can run as a plugin. This allows agents to manage the entire OpenSpec lifecycle—from initialization to archiving—using native tools, without requiring the user to install the npm package globally or locally in their production environment.

## What Changes
1.  **Architecture Principles (Core-First)**:
    *   **Logic Isolation**: All business logic (file I/O, parsing, validation logic) SHALL reside in `src/core/`.
    *   **Presentation De-coupling**: Code in `src/core/` SHALL NOT use CLI-specific libraries (`ora`, `chalk`) or direct `console.log`. It SHALL return structured data or throw errors.
    *   **Thin Wrappers**: `src/cli/` and `src/mcp/` SHALL be thin adapters that call `src/core/` and handle their respective output formats (terminal UI for CLI, JSON-RPC for MCP).
2.  **Shared Core Implementation**:
    *   Refactor CLI command handlers to delegate to these isolated core functions.
3.  **Full MCP Parity**:
    *   Implement MCP equivalents for ALL remaining CLI commands.
4.  **CI and Build Stability**:
    *   Update CI to verify that both the CLI binary and the MCP server start correctly and share the same core logic.

## Impact
-   **Architecture Cleanliness**: Enforces separation between presentation (CLI/MCP) and logic (Core).
-   **Full Parity**: Ensures agents have the exact same "superpowers" as users on the command line.
-   **Continuous Reliability**: CI ensures that refactoring for MCP parity never breaks the legacy CLI experience.

## Impact
-   **Architecture Cleanliness**: Enforces separation between presentation (CLI/MCP) and logic (Core).
-   **Flexibility**: Users can choose between CLI, MCP, or both.
-   **Adoption**: Significantly lowers the barrier for entry by allowing agents to "self-initialize" via MCP.

## Impact
-   **Zero-Install Adoption**: Users only need to add the Gemini extension; no separate CLI installation is required for AI-driven workflows.
-   **Consistent Agent Experience**: Agents interact with a structured API (MCP) rather than parsing CLI output or managing shell command strings.
-   **Future-Proofing**: Aligns OpenSpec with the emerging "plugin" architecture of modern AI coding assistants.
