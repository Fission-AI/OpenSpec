## Why

AI agents and automated tools rely on the `--json` flag for programmatic interaction with the OpenSpec CLI. Currently, the CLI prints UI elements like spinners and telemetry notices to `stdout` even when the `--json` flag is active. This pollution breaks standard JSON parsers and forces manual cleanup of the output stream.

## What Changes

- Modify workflow commands to suppress the `ora` spinner when `options.json` is provided.
- Update the global CLI hook and telemetry module to silence the first-run notice when outputting machine-readable data.
- Ensure that only valid JSON is printed to `stdout` on successful command execution, while maintaining `stderr` for errors.

## Capabilities

### New Capabilities

- `machine-readable-output`: Ensures all CLI commands providing a `--json` flag produce clean, parseable stdout without terminal visual effects or side-channel messages.

### Modified Capabilities

- None.

## Impact

- **Core CLI**: `src/cli/index.ts` will need to pass silence flags down to hooks.
- **Workflow Commands**: `src/commands/workflow/*.ts` files will need conditional spinner starts.
- **Telemetry**: `src/telemetry/index.ts` needs a silence mechanism for the usage notice.
