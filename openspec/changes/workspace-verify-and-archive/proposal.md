## Why

Status: deferred by the context-store-and-initiatives direction. Per-repo
progress visibility remains important, but verify/archive should be redesigned
around initiative status and linked repo-local OpenSpec changes, not around
workspace-owned final archive state. Do not implement this as a first-class
workspace lifecycle command until that linkage exists.

The remaining sections preserve the original workspace verify/archive direction
for later reference. This work is still expected to matter after initiatives and
initiative-linked repo-local changes exist; it is not the immediate next focus.

Users need to know whether a cross-repo workspace change is complete without flattening all repo progress into one ambiguous done state.

The desired lifecycle is:

```text
Verify each repo slice.
See which slices are complete or still open.
Archive repo-local results when appropriate.
Archive the workspace change when the cross-repo goal is done.
```

Verification and archive should make the user's cross-repo status clearer, not force them to reason about internal artifact placement.

## What Changes

Add workspace-aware verify and archive behavior:

- verify workspace-level change structure and target repo status
- show per-repo slice progress
- support repo-local archive work where needed
- support explicit workspace-level archive when the coordinated goal is complete
- avoid treating partial repo completion as full workspace completion

Planning dependency:

- Depends on `workspace-apply-repo-slice`.

## Capabilities

### New Capabilities

- `workspace-verify-archive`: Verifies and archives workspace changes with per-repo progress visibility.

### Modified Capabilities

- `cli-archive`: Adds workspace-aware archive semantics.
- `opsx-verify-skill`: Adds workspace verification guidance.
- `opsx-archive-skill`: Adds workspace archive guidance.

## Impact

- Workspace status, verify, and archive behavior.
- Per-repo slice completion reporting.
- Workspace-level hard-done marker or equivalent archive state.
- Tests for partial completion, final workspace archive, and compatibility with standalone repo-local archive flows.
