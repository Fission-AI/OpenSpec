# Design: PR #843 CodeRabbit Review Fixes + First-Class Purpose Delta Support

## Technical Approach

### Phase 1: CodeRabbit Findings (C1-C5, N1)

#### C1: Unique REMOVED counting (`specs-apply.ts` ~L118-131)

**Problem**: `matchedRemovedCount` increments per REMOVED entry, but duplicate entries with the same normalized name inflate the count, understating `expectedMinCount` and suppressing warnings.

**Fix**: Replace `let matchedRemovedCount = 0` with `const matchedRemovedNames = new Set<string>()`. Use `.add(name)` instead of `++`. Return `matchedRemovedNames.size` as `matchedRemovedCount`.

#### C2: Deduplicate appended scenarios (`specs-apply.ts` ~L158-167)

**Problem**: The append loop iterates `delta.scenarios` but doesn't mark appended names in `usedDeltaNames`, allowing the same scenario to be appended multiple times.

**Fix**: Add `usedDeltaNames.add(name)` immediately after `result.push(stripScenarioTag(s))`.

#### C3: Spec text alignment (`cli-archive/spec.md`)

Update warning text to reference `expected_count = main_count - matchedRemovedCount` logic. Keep separate scenarios for the general and precision cases.

#### C4: TBD Purpose → First-Class Purpose Delta

Replace TBD with finalized Purpose statement. Model the change as a true Purpose delta (see Phase 2).

#### C5: MD040 lint + N1: Test helper extraction

Standard fixes — language identifier + `setupScenarioMergeCase()` helper.

### Phase 2: First-Class Purpose Delta Support

#### Root Cause

OpenSpec's delta model only supports ADDED/MODIFIED/REMOVED/RENAMED — all requirement-centric. No mechanism exists for Purpose-only delta files.

#### Design

**New concept**: `PURPOSE_MODIFIED` — a first-class delta operation for spec Purpose changes.

| Layer | File | Change |
|-------|------|--------|
| **Parser** | `requirement-blocks.ts` | Add `purposeText?: string` to `DeltaPlan`. Extract from `## Purpose` section via `getSectionCaseInsensitive()` |
| **Schema** | `change.schema.ts` | Add `'PURPOSE_MODIFIED'` to `DeltaOperationType` z.enum |
| **Validator** | `validator.ts` | Increment `totalDeltas` when `plan.purposeText` present. Skip `missingHeaderSpecs` for purpose-only files |
| **Change Parser** | `change-parser.ts` | Emit `Delta` with `operation: 'PURPOSE_MODIFIED'` when `## Purpose` found in delta spec |
| **Apply** | `specs-apply.ts` | `replacePurposeSection()` replaces `## Purpose` content. `buildSpecSkeleton()` accepts optional purposeText |

#### Merge Semantics

- Delta `## Purpose` **replaces** main spec `## Purpose` on apply/archive
- If no delta Purpose present, main spec Purpose preserved unchanged
- Purpose-only delta files are valid (no requirement sections required)
- Mixed Purpose + requirement deltas supported (both applied independently)

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | Use Set for REMOVED counting (C1) | Consistent with existing `removedNames` Set pattern |
| 2 | Add `PURPOSE_MODIFIED` as new enum value | First-class support > workarounds |
| 3 | Purpose replaces (not appends) | Purpose is a single block — replacement is the correct merge semantic |
| 4 | Spec/doc convention updates deferred | Commander decision — keep PR #843 focused on engine + fixes |
