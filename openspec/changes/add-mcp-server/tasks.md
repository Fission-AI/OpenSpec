# Implementation Tasks

## 1. Dependencies
- [x] 1.1 Install `fastmcp` (or `@modelcontextprotocol/sdk` + `zod`) as a dependency.

## 2. Directory Migration (openspec -> .openspec)
- [x] 2.1 Update `src/core/config.ts` (or equivalent) to look for `.openspec` folder by default, falling back to `openspec` for backward compatibility.
- [x] 2.2 Update `src/core/init.ts` to scaffold the project in `.openspec/`.
- [x] 2.3 Implement migration detection in `openspec init`: if `openspec/` exists, prompt to rename to `.openspec/`.
- [x] 2.4 Create a standalone `openspec migrate` command for explicit migration. (Integrated into `init`)
- [x] 2.5 Verify `openspec init` creates the new hidden directory structure.

## 3. MCP Server Implementation
- [x] 3.1 Create `src/mcp/server.ts` to initialize the MCP server instance (using `fastmcp` if applicable).
- [x] 3.2 Implement `src/mcp/tools.ts` to map `list`, `show`, `validate`, `archive` to MCP tools.
- [x] 3.3 Implement `src/mcp/resources.ts` to expose specs and changes as resources (`openspec://...`).
- [x] 3.4 Implement `src/mcp/prompts.ts` to expose `proposal`, `apply`, `archive` prompts.
- [x] 3.5 Connect everything in `src/mcp/index.ts`.

## 4. CLI Integration
- [x] 4.1 Register `serve` command in `src/cli/index.ts`.
- [x] 4.2 Implement `src/commands/serve.ts` to start the MCP server.

## 5. Gemini Extension
- [x] 5.1 Create/Update `gemini-extension.json` to define the extension and point to the MCP server.
- [x] 5.2 Ensure `GEMINI.md` reflects the new MCP-based architecture.

## 6. CI Validation
- [x] 6.1 Create a version sync script (e.g., `scripts/check-extension-version.mjs`) to compare `package.json` and `gemini-extension.json`.
- [x] 6.2 Add a "Check extension version sync" step to `.github/workflows/ci.yml`.

## 7. Verification
- [x] 6.1 Verify `openspec serve` starts and communicates over stdio.
- [x] 6.2 Verify tools, resources, and prompts are discoverable by an MCP client.
- [x] 6.3 Verify `openspec init` creates `.openspec/`.
