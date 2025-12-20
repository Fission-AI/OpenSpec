## Why

OpenSpec currently has no mechanism for user-level global settings or feature flags. As the CLI grows, we need a standard location to store user preferences, experimental features, and other configuration that persists across projects. Following XDG Base Directory Specification provides a well-understood, cross-platform approach.

## What Changes

- Add new `src/core/global-config.ts` module with:
  - Path resolution following XDG Base Directory spec (`$XDG_CONFIG_HOME/openspec/` or fallback)
  - Cross-platform support (Unix, macOS, Windows)
  - Lazy config loading with sensible defaults
  - TypeScript types for config shape
- Export a global config directory path getter for future use (workflows, templates, cache)
- Initial config schema supports 1-2 settings/feature flags only

## Impact

- Affected specs: New `global-config` capability (no existing specs modified)
- Affected code:
  - New `src/core/global-config.ts`
  - Update `src/core/index.ts` to export new module
