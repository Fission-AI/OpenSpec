## Why

Plugins can define schemas, hooks, and gates that execute at runtime — but they cannot influence the content of generated skills and commands. When `openspec update` runs, it produces identical skill files regardless of which plugins are active. This means plugin authors must maintain separate, out-of-band instructions (e.g., a standalone ORCHESTRATION.md) that never reach the AI agent consuming the skill.

This gap forces users into workarounds: manually editing generated files (overwritten on next update), duplicating content across plugin docs and skill files, or abandoning the plugin system for skill customization entirely.

## What Changes

- Plugins can declare `skill_overlays` in `plugin.yaml` to inject content into generated skills/commands
- `openspec update` reads active plugin overlays and appends them to the corresponding workflow's generated output
- The overlay mechanism supports `append` (initial release), with the design accommodating future modes (`prepend`, `replace_section`)
- Plugin CLI (`openspec plugin info`) shows overlay registrations

## Capabilities

### New Capabilities

- `skill-overlay-manifest`: Plugin manifest schema extension for declaring skill overlays
- `skill-overlay-injection`: Overlay content injection during `openspec update` skill/command generation
- `skill-overlay-cli`: Plugin CLI enhancements to display overlay information

### Modified Capabilities

- `cli-update`: Update command reads plugin overlays and applies them during generation
- `config-loading`: Plugin loading includes overlay file resolution and validation

## Impact

- **Files modified**: `src/core/plugin/types.ts`, `src/core/plugin/loader.ts`, `src/core/update.ts`, `src/core/shared/skill-generation.ts`, `src/commands/plugin.ts`
- **Plugin manifest schema**: New optional `skill_overlays` field (non-breaking — existing plugins unaffected)
- **Generated skill files**: Content will differ when plugins with overlays are active
- **Cross-platform**: Overlay file paths resolved via `path.join()`, no platform assumptions
