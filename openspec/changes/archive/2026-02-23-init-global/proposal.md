## Why

`openspec init` and `openspec update` always install skills and commands into the current project directory. This forces consultants, agencies, and developers who work across many client repositories to either commit OpenSpec files into repos they don't control or re-run `openspec init` in every project. Several supported tools already have first-class global installation paths (`~/.claude/`, `~/.config/opencode/`, `~/.codex/`), and Codex already proves the pattern works inside this codebase — its adapter returns an absolute path today.

Ref: [GitHub Issue #752](https://github.com/Fission-AI/OpenSpec/issues/752)

## What Changes

- Add an optional `getGlobalRoot(): string | null` method to the `ToolCommandAdapter` interface — returns an absolute path to the tool's global configuration root, or `null`
- Implement `getGlobalRoot()` across all 23 existing adapters (Claude Code, OpenCode, Codex return paths; Cursor, Windsurf, and others return `null`)
- Migrate the Codex adapter so `getFilePath()` returns a project-relative path and `getGlobalRoot()` returns the current absolute path — behaviour unchanged, intent explicit
- Add `--global` flag to `openspec init` requiring `--tools <id|all>` — routes file writes to global paths derived from `getGlobalRoot()`
- Add `--global` flag to `openspec update` — regenerates globally-installed files
- Support `OPENSPEC_GLOBAL_ROOT` env var to override the base path for all global installs

## Capabilities

### New Capabilities
- `global-install`: Adapter-level global path resolution, `--global` flag routing in init/update, and `OPENSPEC_GLOBAL_ROOT` env var handling

### Modified Capabilities
- `command-generation`: `ToolCommandAdapter` interface gains `getGlobalRoot()`, all adapters implement it, Codex adapter migrated
- `cli-init`: `InitCommand` gains `--global` flag, routes to global paths when set, requires `--tools` with `--global`
- `cli-update`: `UpdateCommand` gains `--global` flag, scopes update to globally-installed files

## Impact

- **Adapters** (`src/core/command-generation/adapters/`): All 23 adapters gain a `getGlobalRoot()` method. Most return `null`. Claude, OpenCode, Codex return absolute paths.
- **Interface** (`src/core/command-generation/types.ts`): `ToolCommandAdapter` gains one optional method.
- **Registry** (`src/core/command-generation/registry.ts`): Gains `getGlobalAdapters()` helper to filter adapters with global support.
- **CLI** (`src/cli/index.ts`): `init` and `update` commands gain `--global` option.
- **Init** (`src/core/init.ts`): `InitCommand` gains `executeGlobal()` for global-path routing of both skills and commands.
- **Update** (`src/core/update.ts`): `UpdateCommand` gains `executeGlobal()` for global-scope updates.
- **Existing behaviour**: All project-local behaviour is unchanged. Global and local installs coexist — project-local takes precedence per each tool's own resolution order.
