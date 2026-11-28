## Why

`openspec instructions apply --json` now returns the project's `change.apply.before` and `change.apply.completed` actions, but the Apply skill does not act on them. Apply needs to handle each checkpoint at the right moment, and Verify, which reads the same response, must not run them.

## What Changes

- The Apply skill and `/opsx:apply` command read optional `lifecycle` and `lifecycleError` from the Step 3 apply read. No extra CLI call. Older CLIs omit both, and Apply proceeds unchanged.
- `lifecycle.before` runs once per start or resume, after context files are read and before any edits. It is skipped when the change is `blocked` or `all_done`. `lifecycleError` stops Apply before edits.
- `lifecycle.completed` runs once when Apply finishes implementing: at Step 3 if tracked tasks are already `all_done` (after reading context files), or at Step 7 after implementation finishes (when tracked tasks reach `state: "all_done"`, or when a custom schema without `apply.tracks` finishes without pausing). It never runs on pause or block. `lifecycleError` is reported, and Apply finishes normally.
- **Explicit design decision:** `change.apply.completed` is not restricted to schemas with `apply.tracks`. Keeping completion behavior simple and uniform across tracked and untracked custom schemas avoids coupling lifecycle hooks to task tracking.
- Task-loop reruns of the apply read ignore `lifecycle` and `lifecycleError`.
- The Verify skill and `/opsx:verify` command ignore `lifecycle` and `lifecycleError`.

Out of scope: create and archive checkpoints in `propose`, `new`, `archive`, and `bulk-archive`, and user docs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `opsx-apply-skill`: handle Apply lifecycle checkpoints from the initial apply read.
- `opsx-verify-skill`: ignore Apply lifecycle fields.

## Impact

- Skills and commands: Apply and Verify templates, generated `skills/`, and parity hashes.
- No CLI or config change. Projects without lifecycle triggers see identical tool calls.
