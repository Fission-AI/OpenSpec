## Context

The `global-config` spec defines how OpenSpec reads/writes `config.json`, but users currently must edit it by hand. This command provides a CLI interface to that config.

## Goals / Non-Goals

**Goals:**
- Provide a discoverable CLI for config management
- Support scripting with machine-readable output
- Validate config changes with zod schema
- Handle nested keys gracefully

**Non-Goals:**
- Project-local config (reserved for future via `--scope` flag)
- Complex queries (JSONPath, filtering)
- Config file format migration

## Decisions

### Key Naming: camelCase with Dot Notation

**Decision:** Keys use camelCase matching the JSON structure, with dot notation for nesting.

**Rationale:**
- Matches the actual JSON keys (no translation layer)
- Dot notation is intuitive and widely used (lodash, jq, kubectl)
- Avoids complexity of supporting multiple casing styles

**Examples:**
```bash
openspec config get featureFlags              # Returns object
openspec config get featureFlags.experimental # Returns nested value
openspec config set featureFlags.newFlag true
```

### Type Coercion: Auto-detect with `--string` Override

**Decision:** Parse values automatically; provide `--string` flag to force string storage.

**Rationale:**
- Most intuitive for common cases (`true`, `false`, `123`)
- Explicit override for edge cases (storing literal string "true")
- Follows npm/yarn config patterns

**Coercion rules:**
| Input | Stored As |
|-------|-----------|
| `true`, `false` | boolean |
| Numeric string (`123`, `3.14`) | number |
| Everything else | string |
| Any value with `--string` | string |

### Output Format: Raw by Default

**Decision:** `get` prints raw value only. `list` prints YAML-like format by default, JSON with `--json`.

**Rationale:**
- Raw output enables piping: `VAR=$(openspec config get key)`
- YAML-like is human-readable for inspection
- JSON for automation/scripting

### Schema Validation: Zod with Unknown Field Passthrough

**Decision:** Use zod for validation but preserve unknown fields per `global-config` spec.

**Rationale:**
- Type safety for known fields
- Forward compatibility (old CLI doesn't break new config)
- Follows existing `global-config` spec requirement

### Reserved Flag: `--scope`

**Decision:** Reserve `--scope global|project` but only implement `global` initially.

**Rationale:**
- Avoids breaking change if project-local config is added later
- Clear error message if someone tries `--scope project`

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Dot notation conflicts with keys containing dots | Rare in practice; document limitation |
| Type coercion surprises | `--string` escape hatch; document rules |
| $EDITOR not set | Check and provide helpful error message |

## Open Questions

None - design is straightforward.
