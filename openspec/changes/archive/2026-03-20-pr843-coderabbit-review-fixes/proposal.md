# Proposal: PR #843 CodeRabbit Review Fixes + First-Class Purpose Delta Support

## Why

PR #843 (scenario-level merge for MODIFIED requirements) received a second-round CodeRabbit review on commit `abd9bc9` with 5 actionable findings and 1 nitpick:

- **C1, C2**: Real logic bugs in `mergeScenarios()` — duplicate REMOVED counting and duplicate appends
- **C3, C4**: Spec documentation gaps — warning text misalignment and TBD Purpose placeholder
- **C5**: Markdown lint issue (MD040)
- **N1**: Test refactoring opportunity

During remediation, finding C4 (Purpose placeholder fix) exposed a **root-cause model gap**: OpenSpec's delta model is entirely requirement-centric (ADDED/MODIFIED/REMOVED/RENAMED). Purpose-only changes cannot be represented as valid deltas, causing `openspec validate` to reject the change package. This change widens scope to add **first-class Purpose delta support** end-to-end.

## What Changes

### Phase 1: CodeRabbit Findings (C1-C5, N1)

| # | Finding | File | Type |
|---|---------|------|------|
| **C1** | `matchedRemovedCount` double-counts duplicate REMOVED entries | `specs-apply.ts` | Bug fix |
| **C2** | Missing `usedDeltaNames.add(name)` allows duplicate appends | `specs-apply.ts` | Bug fix |
| **C3** | Scenario count warning spec text misaligned with actual logic | `cli-archive/spec.md` | Spec fix |
| **C4** | Purpose field is TBD placeholder | `schema-instruction/spec.md` | Spec fix |
| **C5** | MD040 lint — fenced code block missing language identifier | `archived tasks.md` | Lint fix |
| **N1** | Extract test setup helper `setupScenarioMergeCase` | `archive.test.ts` | Refactor |

### Phase 2: First-Class Purpose Delta Support

| Component | File | Change |
|-----------|------|--------|
| Parser | `src/core/parsers/requirement-blocks.ts` | Add `purposeText` to `DeltaPlan`; extract `## Purpose` |
| Schema | `src/core/schemas/change.schema.ts` | Add `PURPOSE_MODIFIED` to `DeltaOperationType` |
| Validator | `src/core/validation/validator.ts` | Count Purpose as valid delta; accept purpose-only files |
| Change Parser | `src/core/parsers/change-parser.ts` | Emit `PURPOSE_MODIFIED` delta in parsed output |
| Apply/Archive | `src/core/specs-apply.ts` | `replacePurposeSection()` + Purpose text replacement |
| Delta Artifact | `specs/schema-instruction/spec.md` | Rewrite as true Purpose delta |

### Phase 3: Source-of-Truth Spec Updates (Delta Specs)

| Spec | Change |
|------|--------|
| `openspec-conventions` | Add Purpose change scenario to Change Storage Convention + PURPOSE_MODIFIED symbol |
| `cli-validate` | Update "No deltas found" guidance to mention `## Purpose` as valid delta |
| `specs-sync-skill` | Add Purpose reconciliation scenario + output count |
| `docs/concepts.md` | Add Purpose row to Delta Sections table + update Glossary |
| `schemas/spec-driven/schema.yaml` | Add Purpose to delta operations instruction for agent authoring |

### Phase 4: CodeRabbit Second Review Fixes (commit `db09c44`)

CodeRabbit automated review on commit `db09c44` flagged 4 Major + 2 Nitpick findings. Reviewer-Collab analysis (v7/v8) confirmed all valid.

| # | Finding | File(s) | Fix |
|---|---------|---------|-----|
| **F1** | ADDED overwrite semantics in `specs-sync-skill` don't match engine (aborts) | `specs-sync-skill/spec.md` | Rewrite scenario: duplicate ADDED → abort with guidance to use MODIFIED |
| **F2** | `deltaByName.set()` silently overwrites duplicate normalized scenario names | `specs-apply.ts` | Add preflight validation: allow dup REMOVED + dup untagged-append; reject ambiguous mixed groups (per v8) |
| **F3** | Fence tracking only supports `` ``` `` — misses `~~~` and indented fences | `requirement-blocks.ts`, `specs-apply.ts` | Shared `isMarkdownFenceLine()` helper; replace all 7 inline checks |
| **F4** | `purposeText \|\| undefined` erases empty Purpose header distinction | `requirement-blocks.ts`, `validator.ts` | Add `sectionPresence.purpose`; preserve `''`; explicit validator error on empty Purpose |
| **N2** | Missing apply test for specs without `## Purpose` (insertion path) | `purpose-delta.test.ts` | Add 1 apply test |

> **Note**: F1, F4, F3 (helper only) already partially applied before process correction. Remaining: F3 (replace 7 inline checks), F2, N2, all tests.

## Impact

- **Code**: `specs-apply.ts`, `requirement-blocks.ts`, `validator.ts`, `change-parser.ts`, `change.schema.ts`
- **Specs**: `cli-archive/spec.md`, `schema-instruction/spec.md`, `openspec-conventions/spec.md`, `cli-validate/spec.md`, `specs-sync-skill/spec.md`
- **Docs**: `docs/concepts.md`, `schemas/spec-driven/schema.yaml`
- **Tests**: `archive.test.ts` (helper extraction + 2 regression + 3 new F2 tests), `purpose-delta.test.ts` (8 existing + 1 N2 + ~3 F4 tests), `change-parser.test.ts` (1 existing), `requirement-blocks-fence.test.ts` (~3 new F3 tests)
