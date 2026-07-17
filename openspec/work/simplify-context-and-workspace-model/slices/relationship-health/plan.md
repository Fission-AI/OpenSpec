# Relationship Health Plan (3.6)

## Current Shape

This slice now covers root, store, and referenced-store health only. The earlier
code-repo declaration/map portion was removed before beta behavior hardened.

## Implementation Notes

1. Build health from the existing root inspection, store metadata facts, and
   health-mode reference index.
2. Keep a single registry snapshot per command so references and top-level
   registry diagnostics agree.
3. Keep doctor read-only: no clone, sync, repair, or workspace launch behavior.
4. Preserve the JSON failure null-shape:
   `{root: null, store: null, references: [], status: [diagnostic]}`.
5. Surface pointer wrong turns and registry unreadability as top-level
   relationship diagnostics.

## Test Coverage

- Healthy store-backed root with a resolved reference.
- No-reference root renders distinctly from broken references.
- Unresolved reference with clone/register fix.
- Corrupt registry top-level and per-reference diagnostics.
- Pointer wrong-turn diagnostics.
- Store remote divergence info.
- Read-only snapshot assertions.
