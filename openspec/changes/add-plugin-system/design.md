## Context

OpenSpec is an AI-native CLI for spec-driven development. It currently supports schema extensibility (three-tier resolution: project → user → package) and project config (`openspec/config.yaml`), but has no mechanism for lifecycle hooks, custom gate types, or plugin-bundled schemas.

Users like the Odoo development team need lifecycle automation (Obsidian sync, git branch management) and external code review integration (Codex, Claude Code) that cannot be achieved without modifying OpenSpec core. The plugin system makes OpenSpec a tool-agnostic workflow platform.

**Stakeholders**: OpenSpec maintainers, Odoo dev team (first plugin author), future community plugin authors.

## Goals / Non-Goals

**Goals:**
- Plugin manifest format (`plugin.yaml`) with Zod validation
- Three-tier plugin resolution matching schema resolution pattern
- Whitelist-based loading from `config.yaml`
- Lifecycle hook dispatch at propose/apply/archive phases
- Hybrid handler system (command, prompt, both)
- Plugin-provided gate types extending the gate checker
- Plugin-bundled schemas in the resolution chain
- Plugin config declaration and validation
- CLI commands for plugin inspection
- README documentation

**Non-Goals:**
- Plugin registry / npm-style install (architecture reserved, not implemented)
- Plugin dependency management (plugin A depends on plugin B)
- Runtime plugin hot-reload
- Claude Code skill/agent declaration from OpenSpec plugins (strict layer separation)
- Built-in plugins shipped with OpenSpec (except possibly `git` in future)

## Decisions

### D1: Plugin manifest is YAML, validated by Zod

**Decision**: Use `plugin.yaml` with Zod schema validation, matching `schema.yaml` and `config.yaml` patterns.

**Alternative**: JSON manifest → rejected because YAML is the established format in OpenSpec for all declarations.

**Alternative**: No schema validation → rejected because runtime errors from malformed plugins are hard to debug.

### D2: Three-tier resolution mirrors schema resolver

**Decision**: Plugins resolve from project-local → user-global → package built-in, matching the existing `getSchemaDir()` pattern.

**Alternative**: Single-location plugins (project-local only) → rejected because user-global and package built-in enable sharing and built-in functionality.

**Rationale**: Developers already understand the three-tier pattern from schemas. Reusing it reduces cognitive load.

### D3: Whitelist in config.yaml, not auto-discovery

**Decision**: Plugins on disk are NOT loaded unless listed in `config.yaml`'s `plugins` array.

**Alternative**: Auto-discover all plugins in plugin directories → rejected for security and predictability.

**Rationale**: A project directory might contain plugin experiments or downloaded-but-untrusted plugins. Explicit opt-in prevents unintended behavior.

### D4: Hook execution order follows config.yaml listing order

**Decision**: When multiple plugins register hooks at the same point, execution order matches the order in `config.yaml`'s `plugins` array.

**Alternative**: Priority field in plugin.yaml → rejected as over-engineering for current needs. Config order is explicit and easy to reason about.

### D5: Hybrid handler system (command / prompt / both)

**Decision**: Three handler types — `command` (shell exec), `prompt` (AI agent), `both` (shell then AI).

**Alternative**: Command-only → rejected because key integrations (Obsidian sync) require AI agent judgment.

**Alternative**: Prompt-only → rejected because deterministic operations (git cleanup) need reliable execution.

**Rationale**: OpenSpec is an AI-native tool. Some operations are best done by shell commands (deterministic), some by AI agents (judgment-based), and some by both (collect data then interpret).

### D6: Plugin-provided schemas insert between project-local and user-global

**Decision**: Resolution order becomes: project-local → plugin-provided → user-global → package built-in.

**Alternative**: Plugin schemas at lowest priority → rejected because plugins are more specific than user-global.

**Alternative**: Plugin schemas at highest priority → rejected because project-local overrides must remain possible.

### D7: Strict layer separation — no Claude Code concerns in OpenSpec plugins

**Decision**: OpenSpec plugins provide hooks, gates, and schemas only. They do NOT declare Claude Code skills, agents, or commands.

**Rationale**: OpenSpec is tool-agnostic. Plugin prompt handlers naturally leverage whatever AI agent is running them (Claude Code, Cursor, etc.) without explicit coupling.

### D8: semver for version compatibility

**Decision**: `openspec` field in plugin.yaml uses semver range (e.g., `">=1.2.0"`).

**Implementation**: Use Node.js `semver` package (well-established, small footprint) or inline a minimal `satisfies()` check if we want zero new dependencies.

**Alternative**: No version check → rejected because incompatible plugins cause confusing errors.

### D9: Plugin config validation is blocking

**Decision**: If a plugin declares required config and it's missing from `config.yaml`, the plugin fails to load with an error (not a warning).

**Rationale**: Silent fallback on missing config leads to confusing behavior. Better to fail fast and tell the user exactly what to add.

### D10: README documentation

**Decision**: Add a "Plugins" section to README.md covering plugin usage, creation, and configuration.

**Rationale**: Plugins are a major new feature. Users need a guide to create their first plugin. The README is the primary entry point for new users.

## Risks / Trade-offs

**[Shell execution security]** → Command handlers execute arbitrary shell commands. Mitigation: whitelist in config.yaml means only explicitly opted-in plugins run. Document security implications in README.

**[Cross-platform shell differences]** → Shell commands may not work across macOS/Linux/Windows. Mitigation: Use `child_process.exec` with platform detection. Document that command handlers should use cross-platform syntax or provide platform-specific variants.

**[Prompt handler non-determinism]** → AI agents may interpret prompt handlers differently across sessions. Mitigation: This is by design — prompt handlers are for judgment-based operations. Critical operations should use command handlers.

**[Schema resolver signature change]** → Adding `loadedPlugins` parameter to `resolveSchema()` and related functions. Mitigation: Parameter is optional, existing callers continue to work unchanged.

**[Config schema expansion]** → Adding `plugins` and `plugin_config` to `ProjectConfigSchema`. Mitigation: Both fields are optional. Existing configs work without changes. Resilient field-by-field parsing handles partial validity.

## Migration Plan

1. **No breaking changes**: All new fields are optional. Existing projects work unchanged.
2. **Rollout**: Merge plugin system → document in README → create first reference plugin (odoo-lifecycle) → announce.
3. **Rollback**: If plugin system causes issues, removing `plugins` from `config.yaml` disables all plugins. No data migration needed.
