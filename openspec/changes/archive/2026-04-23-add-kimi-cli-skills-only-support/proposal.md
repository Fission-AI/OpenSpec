## Why

OpenSpec already has user demand for Kimi CLI support, but the previous upstream attempt stalled because it assumed Kimi needed a command adapter. Local review of the Kimi CLI codebase shows a different integration surface: Kimi discovers `SKILL.md` files from `.kimi/skills/` and exposes them through `/skill:<name>`, but it does not provide a stable, file-based custom command directory like Claude Code or Codex.

OpenSpec already supports tools that install skills without a command adapter. Trae and ForgeCode are the existing examples. Kimi should follow the same pattern instead of introducing undocumented `.kimi/commands/...` behavior.

## What Changes

- Add Kimi CLI as a supported tool in `AI_TOOLS` with `skillsDir: '.kimi'`
- Document Kimi CLI as a skills-only integration in supported tools and command usage docs
- Align change specs so `cli-init` explicitly allows selected tools with `skillsDir` but no registered command adapter

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `ai-tool-paths`: define the `.kimi` skills root for Kimi CLI
- `cli-init`: clarify that adapterless tools remain valid selections and skip command-file generation with an informational message

## Impact

- `src/core/config.ts` - add Kimi CLI tool metadata
- `docs/supported-tools.md` - add Kimi CLI row and tool id
- `docs/commands.md` - document `/skill:openspec-*` usage for Kimi CLI
- `docs/cli.md` - include `kimi` in the supported `--tools` list
- `test/core/init.test.ts` - cover Kimi CLI as an adapterless tool during init

## Non-Goals

- Adding `src/core/command-generation/adapters/kimi.ts`
- Defining a `.kimi/commands/...` output path
- Changing the broader delivery model for adapterless tools under `delivery=commands`

That broader capability-aware delivery work is already being explored separately in `add-tool-command-surface-capabilities`. This change stays narrow and follows the existing Trae/ForgeCode pattern.
