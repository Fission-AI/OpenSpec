# Proposal: Scenario-Level Merge for MODIFIED Requirements

## Why

When `openspec archive` merges a delta spec's MODIFIED requirement block into the main spec, it replaces the **entire** requirement block wholesale. If the delta only includes modified/new scenarios (which is the natural authoring pattern), unchanged scenarios within the same requirement are silently dropped. This causes data loss with no warning.

Key problems:
1. **Full-block replacement** — `specs-apply.ts` L285 does `nameToBlock.set(key, mod)` replacing all content between `### Requirement:` headers
2. **No scenario awareness** — `RequirementBlock` type only has an opaque `raw` string; no parsing of `#### Scenario:` sections within it
3. **Silent data loss** — no warning when scenario count decreases during merge
4. **Unnatural authoring** — forces delta spec authors to copy ALL scenarios (even unchanged ones) into MODIFIED blocks to prevent loss

## What Changes

### A. Add scenario-level parsing to `requirement-blocks.ts`
Parse `#### Scenario:` sections within each `RequirementBlock` into a structured `ScenarioBlock[]`. Include the requirement-level description (text between `### Requirement:` header and first `#### Scenario:`).

### B. Implement scenario-level merge in `specs-apply.ts`
For MODIFIED requirements, merge at the scenario level:
- Unchanged scenarios: preserved from main spec
- `(MODIFIED)` tagged scenarios: replaced with delta version
- New scenarios (not in main): appended
- `(REMOVED)` tagged scenarios: removed from main
- Requirement-level description: replaced by delta if provided

### C. Add scenario count safety check
When merging, if the resulting scenario count is less than the original, log a warning. This catches accidental drops even with the new merge logic.

## Capabilities Affected

- `specs-apply` — MODIFIED (scenario-level merge logic)
- `requirement-blocks` — MODIFIED (add scenario-level parsing)

## Impact

| Dimension | Detail |
|:----------|:-------|
| Risk | MEDIUM — changes core merge logic, needs thorough testing |
| Backward Compatibility | HIGH — existing delta specs with full-block MODIFIED content still work (all scenarios present = same result) |
| Correctness | HIGH — fixes silent data loss |
| Authoring UX | HIGH — authors can now include only changed scenarios in MODIFIED blocks |
