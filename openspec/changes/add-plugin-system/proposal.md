## Why

OpenSpec currently has no extensibility mechanism for lifecycle hooks. Features like Obsidian sync, git branch management, and external code review (Codex, Claude Code) are implemented as ad-hoc Claude Code skills, tightly coupled to specific AI tools and scattered across multiple repositories.

A plugin system would let OpenSpec become a **tool-agnostic workflow platform** — users can add lifecycle hooks, custom gate types, and even schemas by dropping files into a directory, without forking or modifying OpenSpec core.

## What Changes

- **NEW**: Plugin loader with three-tier resolution (package built-in → user global → project local)
- **NEW**: Plugin manifest format (`plugin.yaml`) with config schema, hooks, gates, and schema declarations
- **NEW**: Hook dispatcher that executes lifecycle hooks at defined points (propose, apply, archive phases)
- **NEW**: Hybrid handler system supporting `command`, `prompt`, and `both` execution modes
- **NEW**: Plugin config validation — plugins declare required settings, validated against `config.yaml`
- **NEW**: Plugin-provided schemas — plugins can bundle workflow schemas resolved alongside existing tiers
- **NEW**: Plugin-provided gate types — extending the gate system with custom checks
- **NEW**: `openspec plugin list` and `openspec plugin info` CLI commands
- **MODIFIED**: `config.yaml` gains `plugins` (whitelist) and `plugin_config` (per-plugin settings) fields
- **MODIFIED**: `archive.ts` emits `archive.post` hooks after archiving
- **MODIFIED**: Schema resolver includes plugin-provided schemas in resolution order
- **MODIFIED**: Gate checker supports plugin-registered gate types
- **MODIFIED**: README.md documents plugin usage, creation, and configuration

## Capabilities

### New Capabilities
- `plugin-loading`: Three-tier plugin resolution, manifest parsing, whitelist enforcement, version compatibility check
- `plugin-hooks`: Lifecycle hook points (propose/apply/archive pre/post), hybrid handler execution (command/prompt/both), environment variable injection
- `plugin-config`: Plugin config schema declaration, validation against project config, required field enforcement
- `plugin-gates`: Plugin-provided gate types that extend the schema gate system
- `plugin-schemas`: Plugin-bundled schemas inserted into the resolution chain
- `plugin-cli`: CLI commands for listing and inspecting installed plugins

### Modified Capabilities
- `cli-archive`: Archive command triggers `archive.post` hooks via the hook dispatcher
- `schema-resolution`: Schema resolver adds plugin-provided schemas between project-local and user-global tiers
- `config-loading`: Project config gains `plugins` and `plugin_config` fields with Zod validation

## Impact

- **Core**: New `src/core/plugin/` module (~6 files)
- **Schema resolver**: Resolution order gains one new tier (plugin-provided)
- **Archive command**: Post-archive hook dispatch added
- **Config schema**: Two new optional fields in `ProjectConfigSchema`
- **Gate checker**: Dynamic gate type registration from plugins
- **CLI**: Two new subcommands (`plugin list`, `plugin info`)
- **README.md**: Plugin documentation section
- **Dependencies**: `semver` package for version compatibility checking (or inline implementation)
- **Cross-platform**: All plugin paths use `path.join()`, tested on macOS/Linux/Windows
