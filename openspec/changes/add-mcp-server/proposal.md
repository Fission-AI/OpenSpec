# Proposal: Add MCP Server Support

## Context
Currently, OpenSpec integrates with AI agents via CLI commands and static configuration files (slash commands). While effective, this requires manual setup for some agents and lacks the rich interactivity offered by the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/).

## Goal
Implement a native MCP server within the OpenSpec CLI using modern tools (e.g., `fastmcp` or `@modelcontextprotocol/sdk`). This will:
1.  Allow any MCP-compliant agent (Claude Desktop, Gemini CLI, etc.) to discover and use OpenSpec tools and resources without custom configuration files.
2.  Enable the Gemini CLI extension to be a thin wrapper around this native MCP server.
3. Align the project structure with modern standards by moving `openspec/` to `.openspec/` during initialization.

## Migration Path
To support existing users, the CLI will include an automatic migration flow:
- **Detection**: `openspec init` (or a dedicated `openspec migrate` command) will detect legacy `openspec/` directories.
- **Auto-rename**: Prompt the user to rename `openspec/` to `.openspec/`.
- **Instruction Refresh**: Automatically run `openspec update` after the rename to ensure all assistant instructions point to the new location.
- **Backward Compatibility**: The CLI will continue to look for `openspec/` if `.openspec/` is missing, but will issue a deprecation warning.

## Solution
1.  **Add `openspec serve` command**: Starts the MCP server over stdio.
2.  **Use Modern MCP Tools**: Leverage libraries like `fastmcp` or the official SDK to simplify server implementation and type safety.
3.  **Expose Tools**: Convert existing CLI commands (`list`, `show`, `validate`, `archive`) into MCP tools.
4.  **Expose Resources**: Provide direct read access to specs and changes via `openspec://` URIs.
5.  **Expose Prompts**: Serve the standard proposal/apply/archive prompts via `prompts/list`.
6. **Migrate Directory**: Update `init` to scaffold in `.openspec/` instead of `openspec/`.
7. **Gemini Extension**: Create the `gemini-extension.json` manifest to register this MCP server capability.
8. **CI Validation**: Add a CI check to ensure `gemini-extension.json` version stays in sync with `package.json`.

This "modernizes" the integration, making it cleaner, more robust, and easier to maintain.