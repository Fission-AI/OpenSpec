# Assemble Working Context Plan (4.1)

## Current Shape

`openspec context` assembles the resolved OpenSpec root and referenced stores.
It no longer includes inferred code repos or implementation-folder discovery.

## Implementation Notes

1. Share the relationship gather between doctor and context: registry snapshot,
   health-mode reference index, root inspection.
2. Build a working-set brief with root and referenced-store members only.
3. Keep unavailable references in JSON/human output with existing diagnostics.
4. Emit `.code-workspace` files only when explicitly requested; write only that
   file and require `--force` to overwrite.
5. Preserve deletion of old workspace/initiative opening machinery.

## Test Coverage

- JSON/human context for store, nearest, and declared-pointer sessions.
- Resolved and unresolved references.
- Empty-reference root wording.
- Code-workspace write/refusal/force/missing-parent behavior.
- Read-only snapshot assertions.
