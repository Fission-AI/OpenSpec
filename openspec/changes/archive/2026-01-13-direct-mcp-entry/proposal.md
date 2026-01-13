# Proposal: Direct MCP Entry Point

## Context
Currently, the OpenSpec Gemini extension launches the MCP server via the CLI `serve` command (`bin/openspec.js serve`). This introduces unnecessary overhead and couples the server to the CLI's initialization logic.

## Goal
Update the extension configuration to use a dedicated entry point for the MCP server (`dist/mcp/index.js`), bypassing the CLI wrapper.

## Requirements
- Update `gemini-extension.json` to point to `dist/mcp/index.js`
- Ensure `src/mcp/index.ts` is compiled to `dist/mcp/index.js` (already covered by existing build)
