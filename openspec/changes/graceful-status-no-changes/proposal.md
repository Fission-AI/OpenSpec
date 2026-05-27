## Why

When `pastelsdd status` is called without `--change` and no changes exist (e.g., during onboarding on a freshly initialized project), the CLI throws a fatal error: `No changes found. Create one with: pastelsdd new change <name>`. This breaks the onboarding flow because AI agents may call `pastelsdd status` before any change has been created, causing the agent to halt or report failure. Fixes [#714](https://github.com/thiagodiogo/Pastelsdd/issues/714).

## What Changes

- `pastelsdd status` will exit gracefully (code 0) with a friendly message when no changes exist, instead of throwing a fatal error
- `pastelsdd status --json` will return a valid JSON object with an empty changes array when no changes exist
- Other commands (`apply`, `show`, etc.) retain their current strict validation behavior

## Capabilities

### New Capabilities

- `graceful-status-empty`: Graceful handling of `pastelsdd status` when no changes exist, covering both text and JSON output modes

### Modified Capabilities

_None — `validateChangeExists` was internally refactored to delegate to the newly exported `getAvailableChanges`, but its behavior and public contract are unchanged. Other consumers are unaffected._

## Impact

- `src/commands/workflow/shared.ts` — extract `getAvailableChanges` as a public function (validation behavior unchanged)
- `src/commands/workflow/status.ts` — check for available changes before validation, handle empty case gracefully
- Tests for the status command need to cover the new graceful behavior
