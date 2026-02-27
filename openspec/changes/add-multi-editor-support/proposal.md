## Why

After Parts 1 and 2 establish the skills-only architecture and migration path for Claude Code users, we need to expand support to other AI code editors. Many developers use Cursor, Windsurf, or Cline alongside or instead of Claude Code. Each editor has its own configuration format, but they can all benefit from OpenSpec's structured approach.

This is Part 3 of the skills-only migration, focusing on multi-editor support.

## What Changes

- **Smart init detection**: `openspec init` detects existing editor configs and OpenSpec state
- **Editor adapters**: Unified generation for Claude Code, Cursor, Windsurf, and Cline
- **Pre-selection**: Detected editors are pre-selected in the init wizard
- **State awareness**: Init recommends actions based on detected OpenSpec state (uninitialized, old system, new system, mixed)

## Capabilities

### New Capabilities
- `smart-init`: Enhanced initialization with editor detection and state-aware recommendations

### Modified Capabilities
- `skill-generation`: Multi-editor generation with adapter pattern

## Impact

- **Init flow**: Significant enhancement with detection and smart defaults
- **New editor formats**: Support for Cursor, Windsurf, Cline rule formats
- **User experience**: Better onboarding with pre-selected options
- **Future extensibility**: Adapter pattern allows adding more editors

## Dependencies

- Requires Part 1 (add-skill-foundation) to be completed first
- Can run in parallel with Part 2 (add-skill-migration) after Part 1 merges
