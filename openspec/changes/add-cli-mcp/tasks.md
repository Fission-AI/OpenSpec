## 1. Setup and Dependencies

- [x] 1.1 Add `@modelcontextprotocol/sdk` and `zod` dependencies to package.json
- [x] 1.2 Create `src/mcp/` directory structure with index.ts, server.ts, and subdirectories

## 2. Core Infrastructure

- [ ] 2.1 Implement path resolver utility (`src/mcp/utils/path-resolver.ts`) with OPENSPEC_ROOT support
- [ ] 2.2 Implement context loader utility (`src/mcp/utils/context-loader.ts`)
- [ ] 2.3 Implement MCP server initialization and transport (`src/mcp/server.ts`)

## 3. MCP Resources

- [ ] 3.1 Implement instructions resource (`openspec://instructions`)
- [ ] 3.2 Implement project resource (`openspec://project`)
- [ ] 3.3 Implement specs list and individual spec resources
- [ ] 3.4 Implement changes list and individual change resources
- [ ] 3.5 Implement archive resource

## 4. MCP Tools

- [ ] 4.1 Implement init tool (maps to `openspec init`)
- [ ] 4.2 Implement list tool (maps to `openspec list`)
- [ ] 4.3 Implement show tool (maps to `openspec show`)
- [ ] 4.4 Implement validate tool (maps to `openspec validate`)
- [ ] 4.5 Implement archive tool (maps to `openspec archive`)
- [ ] 4.6 Implement update_project_context tool (new)

## 5. MCP Prompts

- [ ] 5.1 Implement openspec-propose prompt
- [ ] 5.2 Implement openspec-apply prompt
- [ ] 5.3 Implement openspec-archive prompt

## 6. CLI Integration

- [ ] 6.1 Create `src/commands/mcp.ts` Commander.js subcommand
- [ ] 6.2 Register mcp command in `src/cli/index.ts`
- [ ] 6.3 Add --debug flag for stderr logging

## 7. Testing and Documentation

- [ ] 7.1 Add unit tests for path resolver
- [ ] 7.2 Add integration tests for MCP server
- [ ] 7.3 Update README with MCP configuration examples

