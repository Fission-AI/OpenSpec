## 1. Extend AIToolOption Interface

- [x] 1.1 Add `skillsDir?: string` field to `AIToolOption` interface in `src/core/config.ts`

## 2. Add skillsDir to AI_TOOLS

- [x] 2.1 Add `skillsDir: '.claude'` to Claude Code tool entry
- [x] 2.2 Add `skillsDir: '.cursor'` to Cursor tool entry
- [x] 2.3 Add `skillsDir: '.windsurf'` to Windsurf tool entry
- [x] 2.4 Add skillsDir for other tools with known Agent Skills spec support (codex, opencode, roocode, kilocode, gemini, factory, github-copilot)

## 3. Create Command Generation Types

- [x] 3.1 Create `src/core/command-generation/types.ts` with `CommandContent` interface
- [x] 3.2 Add `ToolCommandAdapter` interface to types.ts
- [x] 3.3 Export types from module index

## 4. Implement Tool Command Adapters

- [x] 4.1 Create `src/core/command-generation/adapters/claude.ts` with Claude frontmatter format
- [x] 4.2 Create `src/core/command-generation/adapters/cursor.ts` with Cursor frontmatter format
- [x] 4.3 Create `src/core/command-generation/adapters/windsurf.ts` with Windsurf frontmatter format
- [x] 4.4 Create base adapter or utility for shared YAML formatting logic (if applicable)

## 5. Create Command Adapter Registry

- [x] 5.1 Create `src/core/command-generation/registry.ts` with `CommandAdapterRegistry` class
- [x] 5.2 Register Claude, Cursor, Windsurf adapters in static initializer
- [x] 5.3 Add `get(toolId)` and `getAll()` methods

## 6. Create Command Generator

- [x] 6.1 Create `src/core/command-generation/generator.ts` with `generateCommand()` function
- [x] 6.2 Add `generateCommands()` function for batch generation
- [x] 6.3 Create module index `src/core/command-generation/index.ts` exporting public API

## 7. Update artifact-experimental-setup Command

- [x] 7.1 Add `--tool <tool-id>` option (required) to command in `src/commands/artifact-workflow.ts`
- [x] 7.2 Add validation: `--tool` flag is required (error if missing with list of valid tools)
- [x] 7.3 Add validation: tool exists in AI_TOOLS
- [x] 7.4 Add validation: tool has skillsDir configured
- [x] 7.5 Replace hardcoded `.claude` skill paths with `tool.skillsDir`
- [x] 7.6 Replace hardcoded command generation with `CommandAdapterRegistry.get()` + `generateCommands()`
- [x] 7.7 Handle missing adapter gracefully (skip commands with message)
- [x] 7.8 Update output messages to show target tool name and paths

## 8. Testing

- [x] 8.1 Add unit tests for `CommandContent` and `ToolCommandAdapter` contracts
- [x] 8.2 Add unit tests for Claude adapter (path + frontmatter format)
- [x] 8.3 Add unit tests for Cursor adapter (path + frontmatter format)
- [x] 8.4 Add unit tests for `CommandAdapterRegistry.get()` and missing adapter case
- [x] 8.5 Add integration test for `--tool` flag validation
- [x] 8.6 Verify cross-platform path handling uses `path.join()` throughout
