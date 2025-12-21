## 1. Setup and Dependencies

- [x] 1.1 Add `@modelcontextprotocol/sdk` and `zod` dependencies to package.json
- [x] 1.2 Create `src/mcp/` directory structure with index.ts, server.ts, and subdirectories

## 2. Core Infrastructure

- [x] 2.1 Implement path resolver utility (`src/mcp/utils/path-resolver.ts`) with OPENSPEC_ROOT support
- [x] 2.2 Implement context loader utility (`src/mcp/utils/context-loader.ts`)
- [x] 2.3 Implement MCP server initialization and transport (`src/mcp/server.ts`)

## 3. MCP Resources

- [x] 3.1 Implement instructions resource (`openspec://instructions`)
- [x] 3.2 Implement project resource (`openspec://project`)
- [x] 3.3 Implement specs list and individual spec resources
- [x] 3.4 Implement changes list and individual change resources
- [x] 3.5 Implement archive resource

## 4. MCP Tools

- [x] 4.1 Implement init tool (maps to `openspec init`)
- [x] 4.2 Implement list tool (maps to `openspec list`)
- [x] 4.3 Implement show tool (maps to `openspec show`)
- [x] 4.4 Implement validate tool (maps to `openspec validate`)
- [x] 4.5 Implement archive tool (maps to `openspec archive`)
- [x] 4.6 Implement update_project_context tool (new)

## 5. MCP Prompts

- [x] 5.1 Implement openspec-propose prompt
- [x] 5.2 Implement openspec-apply prompt
- [x] 5.3 Implement openspec-archive prompt

## 6. CLI Integration

- [x] 6.1 Create `src/commands/mcp.ts` Commander.js subcommand
- [x] 6.2 Register mcp command in `src/cli/index.ts`
- [x] 6.3 Add --debug flag for stderr logging

## 7. Testing and Documentation

- [x] 7.1 Add unit tests for path resolver
- [x] 7.2 Add integration tests for MCP server
- [x] 7.3 Update README with MCP configuration examples

