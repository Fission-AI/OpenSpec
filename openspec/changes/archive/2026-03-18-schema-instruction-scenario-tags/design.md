## Context

The `spec-driven` schema in `schemas/spec-driven/schema.yaml` defines the `specs` artifact instruction (lines 34-81). This instruction is served to AI agents via `openspec instructions specs --change <name>` and guides them on how to create delta spec files.

The current instruction (lines 54-61) teaches the "copy entire block" approach but doesn't mention scenario-level `(MODIFIED)` / `(REMOVED)` tags added in PR #843. Agents using the instruction as-is produce delta specs that trigger destructive full-block replacement during archive.

## Goals / Non-Goals

**Goals:**
- Update the `specs` instruction text to document scenario-level tags
- Explain when to use full-block copy vs scenario-level tags
- Add a clear WARNING about data loss risk
- Provide an example of MODIFIED with scenario tags

**Non-Goals:**
- Changing merge engine behavior (already fixed in PR #843)
- Modifying other schemas (only `spec-driven`)
- Changing any code logic — this is instruction text only

## Decisions

### Decision 1: Where to add the tag guidance

Add directly after the existing "MODIFIED requirements workflow" section (lines 54-58), as a complementary "Scenario-level modification" section. This positions it where agents naturally look when creating MODIFIED requirements.

**Alternative**: Add as a separate section at the end. Rejected because agents may not read that far.

### Decision 2: Keep both approaches (full-block + scenario-level)

Keep the existing full-block workflow as "Option A" and add scenario-level as "Option B". Both are valid — scenario-level is required when the target requirement has multiple scenarios and you're only changing some.

**Alternative**: Remove full-block approach entirely. Rejected because it's simpler for single-scenario requirements.

## Risks / Trade-offs

- **Risk**: Instruction text too long → agents skip it. **Mitigation**: Keep the added section concise (8-10 lines max) with a clear WARNING marker.
- **Risk**: Agents confused by two options. **Mitigation**: Clear guidance on when to use each.
