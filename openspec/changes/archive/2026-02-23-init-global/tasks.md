## 1. Adapter Interface & Registry

- [x] 1.1 Add optional `getGlobalRoot(): string | null` method to `ToolCommandAdapter` interface in `src/core/command-generation/types.ts`
- [x] 1.2 Add `getGlobalAdapters()` method to `CommandAdapterRegistry` in `src/core/command-generation/registry.ts` that filters adapters returning non-null from `getGlobalRoot()`
- [x] 1.3 Add `resolveGlobalRoot(adapter)` helper that checks `OPENSPEC_GLOBAL_ROOT` env var first, falling back to `adapter.getGlobalRoot()`

## 2. Adapter Implementations

- [x] 2.1 Add `getGlobalRoot()` to Claude adapter returning `~/.claude/` (macOS/Linux) or `%APPDATA%\Claude\` (Windows)
- [x] 2.2 Add `getGlobalRoot()` to OpenCode adapter returning XDG-aware `~/.config/opencode/` (macOS/Linux) or `%APPDATA%\opencode\` (Windows)
- [x] 2.3 Migrate Codex adapter: change `getFilePath()` to return project-relative `.codex/prompts/opsx-<id>.md`, add `getGlobalRoot()` returning current absolute path logic (respecting `$CODEX_HOME`)
- [x] 2.4 Add `getGlobalRoot()` returning `null` to all remaining adapters (Cursor, Windsurf, Cline, Roocode, etc.)

## 3. InitCommand Global Mode

- [x] 3.1 Add `--global` option to `init` command definition in `src/cli/index.ts`
- [x] 3.2 Add global mode validation in `InitCommand`: require `--tools` with `--global`, reject tools without global support, skip directory structure creation
- [x] 3.3 Implement global path routing in `generateSkillsAndCommands()`: when `global` option is set, derive skill and command paths from `resolveGlobalRoot(adapter)` instead of project path
- [x] 3.4 Implement global-mode success output: display per-tool summary with global directory paths, omit project-local "next steps"

## 4. UpdateCommand Global Mode

- [x] 4.1 Add `--global` option to `update` command definition in `src/cli/index.ts`
- [x] 4.2 Implement global update scan: detect globally-installed OpenSpec files by checking each adapter's global root for `openspec-*` / `opsx-*` patterns
- [x] 4.3 Implement global update execution: regenerate globally-installed files using existing marker-based update logic, scoped to global paths only
- [x] 4.4 Handle case where no global files are found: display message suggesting `openspec init --global --tools <id>`

## 5. Help & Discoverability

- [x] 5.1 Update `openspec init --help` to document `--global`, note `--tools` requirement, list tools with global support
- [x] 5.2 Update `openspec update --help` to document `--global` flag

## 6. Tests

- [x] 6.1 Add unit tests for `getGlobalRoot()` on Claude, OpenCode, and Codex adapters (including env var overrides)
- [x] 6.2 Add unit tests for `resolveGlobalRoot()` helper with and without `OPENSPEC_GLOBAL_ROOT`
- [x] 6.3 Add unit tests for `CommandAdapterRegistry.getGlobalAdapters()` filtering
- [x] 6.4 Add integration tests for `openspec init --global --tools claude` (verify skills and commands written to global paths)
- [x] 6.5 Add integration tests for `openspec init --global` without `--tools` (verify error)
- [x] 6.6 Add integration tests for `openspec init --global --tools cursor` (verify error for unsupported tool)
- [x] 6.7 Add integration tests for `openspec init --global --tools all` (verify installs for all globally-supported tools)
- [x] 6.8 Add integration tests for `openspec init --global --tools claude,opencode` (verify multi-tool comma-separated install)
- [x] 6.9 Add integration tests for `openspec init --global --tools claude,cursor` (verify mixed support: installs supported, skips unsupported)
- [x] 6.10 Add integration tests for `openspec init --global --tools ""` (verify error on empty/whitespace tools value)
- [x] 6.11 Add integration tests for `openspec update --global` (verify global files refreshed, content regenerated)
- [x] 6.12 Add test for Codex adapter migration: verify `getFilePath()` returns relative path, `getGlobalRoot()` returns absolute
