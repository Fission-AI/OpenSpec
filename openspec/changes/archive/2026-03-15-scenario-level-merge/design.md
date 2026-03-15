## Context

`specs-apply.ts` implements the delta spec merge logic used by `openspec archive` and `openspec apply-specs`. When a MODIFIED requirement block is merged, the entire block (header + all scenarios + description) is replaced wholesale with the delta version. This causes silent data loss when delta specs only include modified/new scenarios — which is the natural authoring pattern.

The root cause is two-fold:
1. `RequirementBlock` in `requirement-blocks.ts` treats all content between `### Requirement:` headers as one opaque `raw` string
2. The MODIFIED handler in `specs-apply.ts` (L285) does `nameToBlock.set(key, mod)` — a full replacement

## Goals / Non-Goals

**Goals:**
- Merge MODIFIED requirements at the `#### Scenario:` level instead of full-block replacement
- Preserve unchanged scenarios when a delta only includes modified/new ones
- Support scenario-level operations: replace `(MODIFIED)`, add new, remove `(REMOVED)`
- Replace requirement-level description if delta provides one
- Maintain backward compatibility with delta specs that include ALL scenarios (full-block)
- Warn when scenario count changes unexpectedly

**Non-Goals:**
- Changing how ADDED/REMOVED/RENAMED requirement operations work (they operate at requirement level — correct as-is)
- Adding interactive prompts to the merge flow
- Changing the delta spec markdown format (we leverage existing `(MODIFIED)`/`(REMOVED)` tag pattern)

## Decisions

### Decision 1: Add `ScenarioBlock` type and scenario-level parsing

Extend `requirement-blocks.ts` with:

```typescript
export interface ScenarioBlock {
  headerLine: string;   // e.g., '#### Scenario: Phase 2 gate check (MODIFIED)'
  name: string;         // e.g., 'Phase 2 gate check'
  tag?: string;         // e.g., 'MODIFIED', 'REMOVED', or undefined (unchanged)
  raw: string;          // full block including header and body
}

export interface RequirementBlockWithScenarios extends RequirementBlock {
  description: string;      // text between requirement header and first scenario
  scenarios: ScenarioBlock[];
}
```

Add parser function:
```typescript
export function parseScenarios(block: RequirementBlock): RequirementBlockWithScenarios
```

This parses `#### Scenario:` headers within a requirement block's `raw` content, extracting the tag from `(MODIFIED)`, `(REMOVED)` suffixes.

### Decision 2: Scenario-level merge in MODIFIED handler

Replace the current L272-286 logic with:

```
For each MODIFIED requirement:
  1. Parse main spec requirement into RequirementBlockWithScenarios
  2. Parse delta requirement into RequirementBlockWithScenarios
  3. Build merged scenarios:
     a. Start with main scenarios as base
     b. For each delta scenario:
        - If tagged (MODIFIED): find matching main scenario by name, replace it
        - If tagged (REMOVED): find matching main scenario by name, remove it  
        - If no tag AND exists in main: replace it (implicit full replacement)
        - If no tag AND NOT in main: append as new scenario
     c. Result: all main scenarios not touched + replaced/new scenarios from delta
  4. Replace requirement description if delta provides one (non-empty)
  5. Reconstruct the merged RequirementBlock.raw from description + merged scenarios
```

### Decision 3: Backward compatibility via heuristic

When ALL scenarios in the delta have no tags (no `(MODIFIED)`, no `(REMOVED)` suffixes), treat as **full-block replacement** (legacy behavior). This ensures existing delta specs that were authored with all scenarios continue to work identically.

When ANY scenario has a tag, use the new **scenario-level merge** logic.

### Decision 4: Scenario count warning

After merge, if `resultCount < originalCount` AND no `(REMOVED)` tags were used, emit a warning:
```
⚠️ Warning: {specName} requirement '{name}': scenario count changed from {n} to {m}
```

This catches accidental drops without blocking the operation.

### Decision 5: Scenario name normalization

Scenario names are matched by normalizing: strip `(MODIFIED)`, `(REMOVED)` tags, trim whitespace. This allows `Phase 2 gate check (MODIFIED)` to match `Phase 2 gate check`.

## Architecture Updates

No architecture changes needed — this is internal to the parsers and merge logic.
