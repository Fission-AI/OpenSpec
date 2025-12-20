## Why

Users need a way to view and modify their global OpenSpec settings without manually editing JSON files. The `add-global-config-dir` change provides the foundation, but there's no user-facing interface to interact with the config. A dedicated `openspec config` command provides discoverability and ease of use.

## What Changes

Add `openspec config` subcommand with the following operations:

```bash
openspec config path                    # Show config file location
openspec config list                    # Show all current settings
openspec config get <key>               # Get a specific value
openspec config set <key> <value>       # Set a value
openspec config reset [key]             # Reset to defaults (all or specific key)
```

**Example usage:**
```bash
$ openspec config path
/Users/me/.config/openspec/config.json

$ openspec config list
enableTelemetry: true
featureFlags: {}

$ openspec config set enableTelemetry false
Set enableTelemetry = false

$ openspec config get enableTelemetry
false
```

## Impact

- Affected specs: New `cli-config` capability
- Affected code:
  - New `src/commands/config.ts`
  - Update CLI entry point to register config command
- Dependencies: Requires `add-global-config-dir` to be implemented first
