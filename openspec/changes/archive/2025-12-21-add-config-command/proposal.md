## Why

Users need a way to view and modify their global OpenSpec settings without manually editing JSON files. The `global-config` spec provides the foundation, but there's no user-facing interface to interact with the config. A dedicated `openspec config` command provides discoverability and ease of use.

## What Changes

Add `openspec config` subcommand with the following operations:

```bash
openspec config path                          # Show config file location
openspec config list [--json]                 # Show all current settings
openspec config get <key>                     # Get a specific value (raw, scriptable)
openspec config set <key> <value> [--string]  # Set a value (auto-coerce types)
openspec config unset <key>                   # Remove a key (revert to default)
openspec config reset --all [-y]              # Reset everything to defaults
openspec config edit                          # Open config in $EDITOR
```

**Key design decisions:**
- **Key naming**: Use camelCase to match JSON structure (e.g., `featureFlags.someFlag`)
- **Nested keys**: Support dot notation for nested access
- **Type coercion**: Auto-detect types by default; `--string` flag forces string storage
- **Scriptable output**: `get` prints raw value only (no labels) for easy piping
- **Zod validation**: Use zod for config schema validation and type safety
- **Future-proofing**: Reserve `--scope global|project` flag for potential project-local config

**Example usage:**
```bash
$ openspec config path
/Users/me/.config/openspec/config.json

$ openspec config list
featureFlags: {}

$ openspec config set featureFlags.enableTelemetry false
Set featureFlags.enableTelemetry = false

$ openspec config get featureFlags.enableTelemetry
false

$ openspec config list --json
{
  "featureFlags": {}
}

$ openspec config unset featureFlags.enableTelemetry
Unset featureFlags.enableTelemetry (reverted to default)

$ openspec config edit
# Opens $EDITOR with config.json
```

## Impact

- Affected specs: New `cli-config` capability
- Affected code:
  - New `src/commands/config.ts`
  - New `src/core/config-schema.ts` (zod schema)
  - Update CLI entry point to register config command
- Dependencies: Requires `global-config` spec (already implemented)
