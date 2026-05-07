## Why

The OpenCode adapter uses `.opencode/command/` (singular) for its commands directory, but OpenCode's official documentation specifies `.opencode/commands/` (plural). Every other adapter in the codebase also uses plural directory names (`.claude/commands/`, `.cursor/commands/`, `.factory/commands/`, etc.). This inconsistency was introduced in Oct 2025 without documented rationale. Fixes [#748](https://github.com/Fission-AI/OpenSpec/issues/748).

## What Changes

- OpenCode adapter path changes from `.opencode/command/` to `.opencode/commands/`
- Legacy cleanup adds `.opencode/command/` (old singular path) for backward compatibility
- Documentation updated to reflect the new plural path

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `command-generation`: OpenCode adapter path changes from singular `command/` to plural `commands/` to match OpenCode's official directory convention

## Impact

- `src/core/command-generation/adapters/opencode.ts` — adapter path
- `src/core/legacy-cleanup.ts` — legacy cleanup pattern + add old singular path
- `docs/supported-tools.md` — documentation table
- `test/core/command-generation/adapters.test.ts` — test assertion
