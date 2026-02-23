## Why

The `artifact-experimental-setup` command currently hardcodes skill output paths to `.claude/skills` and `.claude/commands/opsx`. This prevents users of other AI coding tools (Cursor, Windsurf, Codex, etc.) from using OpenSpec's skill generation. We need to support the diverse ecosystem of AI coding assistants, each with their own conventions for skill/instruction file locations and command frontmatter formats.

## What Changes

- Add `skillsDir` path configuration to the existing `AIToolOption` interface in `config.ts`
- Add required `--tool <tool-id>` flag to the `artifact-experimental-setup` command
- Create a generic command generation system using Strategy/Adapter pattern:
  - `CommandContent`: tool-agnostic command data (id, name, description, body)
  - `ToolCommandAdapter`: per-tool formatting (file paths, frontmatter format)
  - `CommandGenerator`: orchestrates generation using content + adapter
- Require explicit tool selection (no default) for clarity

## Capabilities

### New Capabilities

- `ai-tool-paths`: Configuration mapping AI tool IDs to their project-local skill directory paths
- `command-generation`: Generic command generation system with tool adapters for formatting differences

### Modified Capabilities

- `cli-artifact-workflow`: Adding `--tool` flag to setup command for provider selection

## Impact

- **Files Modified**:
  - `src/core/config.ts` - Extend `AIToolOption` interface with `skillsDir` field
  - `src/commands/artifact-workflow.ts` - Add `--tool` flag, use provider paths and adapters
- **New Files**:
  - `src/core/command-generation/types.ts` - CommandContent, ToolCommandAdapter interfaces
  - `src/core/command-generation/generator.ts` - Generic command generator
  - `src/core/command-generation/adapters/*.ts` - Per-tool adapters
- **Backward Compatibility**: Existing workflows unaffected - this is a new command setup feature
- **User-Facing**: Required `--tool` flag on `artifact-experimental-setup` command for explicit tool selection
