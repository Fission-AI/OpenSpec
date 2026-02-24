## Context

`openspec init` and `openspec update` install skills and slash commands into project-relative directories (e.g., `.claude/commands/opsx/`). The only exception is Codex, whose adapter already returns an absolute path to `~/.codex/prompts/`. Several other tools (Claude Code, OpenCode) have documented global directories but OpenSpec has no way to target them.

The existing architecture — a `ToolCommandAdapter` interface with `getFilePath()`, a `CommandAdapterRegistry`, and file-write logic in `InitCommand` / `UpdateCommand` that already handles absolute paths via `path.isAbsolute()` — provides a clean extension point.

## Goals / Non-Goals

**Goals:**
- Allow `openspec init --global --tools <ids>` to write skills and commands to each tool's global directory
- Allow `openspec update --global` to refresh globally-installed files
- Support `OPENSPEC_GLOBAL_ROOT` env var to override base paths
- Migrate Codex adapter to use the new `getGlobalRoot()` pattern explicitly
- Keep all existing project-local behaviour unchanged

**Non-Goals:**
- GUI or interactive prompts for global mode — `--tools` is always required
- Global installation of schemas or the `openspec/` directory structure — only skills and commands
- Auto-detection of whether to install globally vs locally
- Global skill installation paths for tools that only support project-scoped files (Cursor, Windsurf, etc.)
- Windows path verification — mark as "unknown / not yet confirmed" rather than guess

## Decisions

### 1. Extend `ToolCommandAdapter` with `getGlobalRoot()`

An initial consideration was per-command `getGlobalFilePath(commandId)`, but skills also need global paths (see Decision #2). Instead, add a single optional `getGlobalRoot(): string | null` method to the interface. Adapters that support global installation return an absolute path to the tool's base directory; others return `null`. `InitCommand` and `UpdateCommand` derive both skill and command paths from this root.

**Why not a separate GlobalAdapter class?** The global and local adapters share `formatFile()` and `toolId`. Splitting them would duplicate the formatting logic or require inheritance. A single method addition keeps the adapter registry simple — one adapter per tool, two path strategies.

**Why optional (not abstract)?** There are 23+ adapters. Making it required would force boilerplate `return null` in ~20 of them. Instead, the base registry lookup treats missing `getGlobalRoot` as equivalent to returning `null`.

### 2. Skills also need global path resolution

Skills are written to `.<tool>/skills/openspec-*/SKILL.md` — structurally parallel to commands. The same global-vs-local routing applies. If the tool has a global root (e.g., `~/.claude/`), skills go under `<globalRoot>/skills/` and commands under `<globalRoot>/commands/`. The single `getGlobalRoot()` method from Decision #1 handles both — no per-command or per-skill path methods needed.

### 3. Route via `--global` flag in InitCommand and UpdateCommand

Both commands gain a `--global` boolean option. When set:
- `InitCommand` skips directory structure creation (`openspec/`, `config.yaml`) — those are project-local concerns
- File writes use `adapter.getGlobalRoot()` to derive absolute paths instead of joining with `projectPath`
- `--tools` is required — no interactive selection (global install is explicit)
- Tools whose adapter returns `null` from `getGlobalRoot()` are skipped with a stderr warning

### 4. `OPENSPEC_GLOBAL_ROOT` env var

When set, overrides the base path for all `getGlobalRoot()` calls. Implementation: a helper function `resolveGlobalRoot(adapter)` checks the env var first, falling back to the adapter's native path. This keeps env var handling out of individual adapters.

### 5. Codex migration

The Codex adapter currently returns an absolute path from `getFilePath()`. Migration:
- `getFilePath()` → return project-relative path (`.codex/prompts/opsx-<id>.md`) for consistency
- `getGlobalRoot()` → return the current absolute base (`~/.codex/`)

This is a **breaking change for Codex project-local installs** (previously impossible since path was always absolute). In practice, Codex has always been global-only, so this formalizes what already exists. The `openspec init` default (non-global) will now create project-local Codex files; `openspec init --global --tools codex` preserves current behavior.

## Risks / Trade-offs

**[Risk] Codex migration changes default behavior** → The current Codex adapter always writes globally. After migration, `openspec init --tools codex` (without `--global`) would write project-locally. This is actually more correct — global should be opt-in. Document in release notes.

**[Risk] Global files have no project association** → A globally-installed skill cannot reference project-specific paths. This is fine for OpenSpec skills which are project-agnostic instructions. If future skills need project context, they'll need project-local installation.

**[Risk] Multiple global installs from different OpenSpec versions** → Running `openspec init --global` from different projects with different OpenSpec versions could overwrite global files with different versions. `openspec update --global` mitigates this — run it from the latest version. No lockfile or version tracking needed initially.

**[Risk] Tool global paths change across versions** → If Claude Code moves its global directory, the adapter needs updating. Each adapter's `getGlobalRoot()` documents the source of truth for the path. Keep these paths in sync with upstream tool documentation.
