# Change: Add MCP Server Subcommand

## Why

AI coding assistants using MCP (Model Context Protocol) need programmatic access to OpenSpec's capabilities. Currently, assistants must rely on shell commands. An MCP server provides:

- Structured resource access for specs, changes, and project context
- Tool invocations that map directly to CLI commands with JSON responses
- Guided prompts for proposal/apply/archive workflows
- Native integration with MCP-compatible AI tools (Claude Desktop, Cursor, etc.)

## What Changes

- Add new `openspec mcp` subcommand that starts a stdio-based MCP server
- Expose **10 resources** for read-only access to OpenSpec data
- Expose **6 tools** that map to CLI commands (init, list, show, validate, archive, update_project_context)
- Expose **3 prompts** for guided workflows (propose, apply, archive)
- Add new `src/mcp/` directory with modular implementation
- Add `@modelcontextprotocol/sdk` as a dependency

## Impact

- Affected specs: None (new capability)
- Affected code:
  - `src/cli/index.ts` - Register new mcp command
  - `src/commands/mcp.ts` - Commander.js subcommand entry point (new)
  - `src/mcp/` - New directory with MCP server implementation
- New dependency: `@modelcontextprotocol/sdk`

