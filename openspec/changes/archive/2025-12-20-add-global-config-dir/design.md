## Context

OpenSpec needs a standard location for user-level configuration that works across platforms and follows established conventions. This will serve as the foundation for settings, feature flags, and future artifacts like workflows or templates.

## Goals / Non-Goals

**Goals:**
- Provide a single, well-defined location for global config
- Follow XDG Base Directory Specification (widely adopted by CLI tools)
- Support cross-platform usage (Unix, macOS, Windows)
- Keep implementation minimal - just the foundation
- Enable future expansion (cache, state, workflows)

**Non-Goals:**
- Project-local config override (not in scope)
- Config file migration tooling
- Config validation CLI commands
- Multiple config profiles

## Decisions

### Path Resolution Strategy

**Decision:** Use XDG Base Directory Specification with platform fallbacks.

```
Unix/macOS: $XDG_CONFIG_HOME/openspec/ or ~/.config/openspec/
Windows:    %APPDATA%/openspec/
```

**Rationale:**
- XDG is the de facto standard for CLI tools (used by gh, bat, ripgrep, etc.)
- Environment variable override allows user customization
- Windows uses its native convention (%APPDATA%) for better integration

**Alternatives considered:**
- `~/.openspec/` - Simple but clutters home directory
- `~/Library/Application Support/` on macOS - Overkill for a CLI tool

### Config File Format

**Decision:** JSON (`config.json`)

**Rationale:**
- Native Node.js support (no dependencies)
- Human-readable and editable
- Type-safe with TypeScript
- Matches project.md's "minimal dependencies" principle

**Alternatives considered:**
- YAML - Requires dependency, more error-prone to edit
- TOML - Less common in Node.js ecosystem
- Environment variables only - Too limited for structured settings

### Config Schema

**Decision:** Flat structure with typed fields, start minimal.

```typescript
interface GlobalConfig {
  featureFlags?: Record<string, boolean>;
}
```

**Rationale:**
- `featureFlags` enables controlled rollout of new features
- Optional fields with defaults avoid breaking changes
- Flat structure is easy to understand and extend

### Loading Strategy

**Decision:** Read from disk on each call, no caching.

```typescript
export function getGlobalConfig(): GlobalConfig {
  return loadConfigFromDisk();
}
```

**Rationale:**
- CLI commands are short-lived; caching adds complexity without benefit
- Reading a small JSON file is ~1ms; negligible overhead
- Always returns fresh data; no cache invalidation concerns
- Simpler implementation

### Directory Creation

**Decision:** Create directory only when saving, not when reading.

**Rationale:**
- Don't create empty directories on read operations
- Users who never save config won't have unnecessary directories
- Aligns with principle of least surprise

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Config file corruption | Return defaults on parse error, log warning |
| Permissions issues | Check write permissions before save, clear error message |
| Future schema changes | Use optional fields, add version field if needed later |

## Open Questions

None - this proposal is intentionally minimal.
