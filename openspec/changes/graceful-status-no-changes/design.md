## Context

`statusCommand` in `src/commands/workflow/status.ts` calls `validateChangeExists()` from `shared.ts` as its first operation. When no `--change` option is provided and no change directories exist, `validateChangeExists` throws: `No changes found. Create one with: openspec new change <name>`. This error propagates up as a fatal CLI error (non-zero exit code).

This is correct behavior for commands like `apply` and `show` that require a change to operate on. However, `status` is an informational command — it should report the current state, even when that state is "no changes exist."

The error surfaces during onboarding (issue #714) when AI agents call `openspec status` before any change has been created.

## Goals / Non-Goals

**Goals:**
- Make `openspec status` exit with code 0 and a friendly message when no changes exist
- Support both text and JSON output modes for the no-changes case
- Keep all other commands' validation behavior unchanged

**Non-Goals:**
- Changing the behavior of `validateChangeExists` (keep it strict for all consumers; only extract its internal helper)
- Changing the onboard template or skill instructions
- Handling the case where `--change` is provided but the specific change doesn't exist (this should remain an error)

## Decisions

### Extract `getAvailableChanges` and check before validation

**Rationale**: Extract the private `getAvailableChanges` closure from `validateChangeExists` into a public exported function in `shared.ts`. Then, in `statusCommand`, call `getAvailableChanges` *before* `validateChangeExists` to detect the no-changes case early and handle it gracefully. This avoids using try/catch for control flow and eliminates any coupling to error message strings.

**Alternative considered**: Catching the error from `validateChangeExists` by matching `error.message.startsWith('No changes found')`. Rejected because string coupling is fragile — if the error message changes, the catch silently stops working.

**Alternative considered**: Adding a `throwOnEmpty` parameter to `validateChangeExists`. Rejected because it adds complexity to a shared function for a single consumer's needs and mixes UX concerns into a validation utility.

### Keep `validateChangeExists` strict

**Rationale**: `validateChangeExists` remains unchanged in behavior — it still throws for all error cases. The graceful handling lives entirely in `statusCommand`, which is the appropriate layer for UX decisions. Other commands (`apply`, `show`, `instructions`) are unaffected.

## Risks / Trade-offs

- [Risk] Extra filesystem read when no `--change` is provided and changes *do* exist (`getAvailableChanges` is called first, then `validateChangeExists` performs its own read) → Mitigation: `statusCommand` returns early before reaching `validateChangeExists` when no changes exist, so the double-read only occurs when changes are present — minimal overhead.
- [Risk] Other commands may also benefit from graceful no-changes handling in the future → Mitigation: `getAvailableChanges` is now public and reusable, making it easy to apply the same pattern elsewhere.
