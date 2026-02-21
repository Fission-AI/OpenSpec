## Why

OpenSpec installation paths are currently inconsistent:

- Most skills and commands are written to project-local directories.
- Codex commands are already global (`$CODEX_HOME/prompts` or `~/.codex/prompts`).
- Users cannot choose a consistent install scope strategy across tools.

This creates friction for users who prefer user-level setup and expect tool artifacts to be managed globally by default.

## What Changes

### 1. Add install scope preference with legacy-safe defaults

Introduce a global install scope setting with two modes:

- `global` (default for newly created configs)
- `project`

The setting is stored in global config and can be overridden per command run.
For schema-evolved legacy configs where `installScope` is absent, effective default remains `project` until users opt in to global scope.

### 2. Add scope-aware path resolution for skills and commands

Refactor path resolution so both `init` and `update` compute install targets from:

- selected scope preference (`global` or `project`)
- tool capability metadata (which scopes each tool/surface supports)
- runtime context (project root, home directories, env overrides)

### 3. Add per-tool capability metadata for scope support

Extend tool metadata to explicitly declare scope support per surface:

- skills scope support
- commands scope support

When preferred scope is unsupported for a tool/surface, the system uses deterministic fallback rules and reports the effective scope in output.

### 4. Make command generation context-aware

Extend command adapter path resolution so adapters receive install context (scope + environment context), instead of only command ID. This removes special-case handling and allows consistent scope behavior across tools.

### 5. Update init/update UX and behavior

- `openspec init`:
  - accepts scope override flag
  - uses configured scope or migration-aware default (new configs default global; legacy configs preserve project until migration)
  - applies scope-aware generation and cleanup planning
- `openspec update`:
  - applies current scope preference
  - syncs artifacts in effective scope per tool/surface
  - tracks last successful effective scope per tool/surface for deterministic scope-drift detection
  - reports effective scope decisions clearly

### 6. Extend config UX and docs

- Add install scope control in `openspec config profile` interactive flow.
- Extend `openspec config list` output with install scope source (`explicit`, `new-default`, `legacy-default`).
- Add explicit migration guidance and prompt path so legacy users can opt into `global` scope.
- Update supported tools and CLI docs to explain scope behavior and fallback rules.

### 7. Coordinate with command-surface capability delivery rules

`cli-init` and `cli-update` planning SHALL compose:

- install scope (`global | project`)
- delivery mode (`both | skills | commands`)
- command surface capability (`adapter | skills-invocable | none`)

This proposal remains focused on scope resolution, but implementation and test coverage should include mixed-tool cases to avoid regressions when combined with `add-tool-command-surface-capabilities`.

## Capabilities

### New Capabilities

- `installation-scope`: Scope preference model and effective scope resolution for tool artifact installation.

### Modified Capabilities

- `global-config`: Persist install scope preference with schema evolution defaults.
- `cli-config`: Configure and inspect install scope preferences.
- `ai-tool-paths`: Add tool-level scope support metadata and path strategy.
- `command-generation`: Scope-aware adapter path resolution via install context.
- `cli-init`: Scope-aware initialization planning and output.
- `cli-update`: Scope-aware update sync, drift detection, and output.
- `migration`: Scope-aware migration scanning with install-scope-aware workflow lookup.

## Impact

- `src/core/global-config.ts` - new install scope fields and defaults
- `src/core/config-schema.ts` - validation support for install scope config keys
- `src/commands/config.ts` - interactive profile/config UX additions for install scope
- `src/core/config.ts` - tool scope capability metadata
- `src/core/available-tools.ts` and `src/core/shared/tool-detection.ts` - scope-aware configured detection
- `src/core/command-generation/types.ts` and adapter implementations - context-aware file path resolution
- `src/core/init.ts` - scope-aware generation/removal planning
- `src/core/update.ts` - scope-aware sync/removal/drift planning
- `src/core/migration.ts` - scope-aware workflow scanning support
- `docs/supported-tools.md` and `docs/cli.md` - install scope behavior documentation
- `test/core/init.test.ts`, `test/core/update.test.ts`, adapter tests, config tests - scope coverage
