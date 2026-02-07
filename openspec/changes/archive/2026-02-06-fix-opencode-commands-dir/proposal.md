## Why

The OpenSpec integration scripts currently generate command files under `.opencode/command/`, while the official documentation requires `.opencode/commands/`. This mismatch breaks expected tooling behavior and creates confusion for users following the docs.

## What Changes

- Align OpenCode command generation and update behavior to use the documented `.opencode/commands/` directory.
- Normalize any references that assume the singular directory so the CLI and docs agree.

## Capabilities

### New Capabilities
- (none)

### Modified Capabilities
- `cli-update`: Update the requirements to point to `.opencode/commands/` instead of `.opencode/command/`.

## Impact

- OpenCode CLI command generation and update logic.
- Documentation references for command locations.
- Tests that assert command file paths.
