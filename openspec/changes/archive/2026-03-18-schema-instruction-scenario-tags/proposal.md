## Why

The `spec-driven` schema's `specs` artifact instruction teaches agents to copy the ENTIRE requirement block when using `## MODIFIED Requirements`, but says nothing about scenario-level `(MODIFIED)` / `(REMOVED)` tags. Without tags, the `openspec archive` merge engine uses full-block replacement, which silently destroys existing scenarios that weren't included in the delta spec.

This was discovered during a production archiving session where 6 scenarios were silently lost across 3 baseline specs. The merge engine already supports scenario-level tags (added in PR #843), but agents don't know they exist because the schema instruction doesn't mention them.

## What Changes

- **Modified Capability**: Update the `specs` artifact instruction in `schemas/spec-driven/schema.yaml` (lines 54-61) to:
  1. Document scenario-level `(MODIFIED)` and `(REMOVED)` tags
  2. Explain when to use full-block copy vs. scenario-level tags
  3. Add a WARNING about data loss when MODIFIED has fewer scenarios than main
  4. Update the example to include a MODIFIED requirement with scenario tags

## Capabilities

**Modified Capabilities:**
- `schema-instruction` — the `specs` artifact instruction text in `spec-driven` schema

## Impact

- **File modified**: `schemas/spec-driven/schema.yaml` (instruction text only)
- **No code changes**: This is a documentation/instruction-text-only change
- **Backward compatible**: Existing schemas continue to work
- **User-facing**: AI agents creating delta specs will see updated guidance
