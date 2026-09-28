## Why

OpenSpec labels the `bob` integration as "Bob Shell," but the same `.bob` configuration root serves the IBM Bob product. The narrower name makes the tool picker and status output look limited to the CLI.

## What Changes

- Rename the `bob` tool entry and success label to "IBM Bob."
- Update the supported-tools reference to use the product name.
- Preserve `.bob/commands/` generation for Bob Shell, which still supports custom slash commands.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `ai-tool-paths`: Use "IBM Bob" as the user-facing name for the `bob` integration.

## Impact

- Affected code: `src/core/config.ts` and its tool-detection test.
- Affected docs: `docs-lab/reference/supported-tools.md`.
- Command and skill paths do not change.
