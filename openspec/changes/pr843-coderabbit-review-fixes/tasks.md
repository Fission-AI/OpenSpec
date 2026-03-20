# Tasks: PR #843 CodeRabbit Review Fixes + First-Class Purpose Delta Support

## Section 1: Code Fixes (`specs-apply.ts`)

- [x] **1.1**: C1 — Replace `matchedRemovedCount` with `matchedRemovedNames` Set for unique counting
- [x] **1.2**: C2 — Add `usedDeltaNames.add(name)` after append to prevent duplicates

## Section 2: Spec Fixes

- [x] **2.1**: C3 — Update `cli-archive/spec.md` warning text alignment
- [x] **2.2**: C4 — Replace TBD placeholder in `schema-instruction/spec.md` Purpose

## Section 3: Lint + Refactor

- [x] **3.1**: C5 — Add `md` language identifier to fenced code block in archived tasks
- [x] **3.2**: N1 — Extract `setupScenarioMergeCase()` test helper (15 tests refactored)

## Section 4: Reviewer-Collab Remediation (v1→v2)

- [x] **4.1**: W1 — Create `specs/schema-instruction/spec.md` delta artifact
- [x] **4.2**: W2 — Sync `specs/cli-archive/spec.md` delta wording with main spec
- [x] **4.3**: INFO-1 — Add 2 regression tests: duplicate REMOVED + duplicate append

## Section 5: Purpose Delta Engine Support (P1 root-cause fix)

- [x] **5.1**: `requirement-blocks.ts` — Add `purposeText?: string` to `DeltaPlan`; extract from `## Purpose` section
- [x] **5.2**: `change.schema.ts` — Add `'PURPOSE_MODIFIED'` to `DeltaOperationType` enum
- [x] **5.3**: `validator.ts` — Count Purpose delta in `totalDeltas`; accept purpose-only files
- [x] **5.4**: `change-parser.ts` — Emit `PURPOSE_MODIFIED` delta in parsed change output
- [x] **5.5**: `specs-apply.ts` — Add `replacePurposeSection()` + apply Purpose text replacement
- [x] **5.6**: Rewrite `schema-instruction/spec.md` as true Purpose delta (remove fake MODIFIED Requirements)

## Section 6: Purpose Delta Tests

- [x] **6.1**: Parser: purpose-only delta extracts purposeText
- [x] **6.2**: Parser: mixed Purpose + MODIFIED extracts both
- [x] **6.3**: Parser: no Purpose section returns undefined
- [x] **6.4**: Validator: purpose-only delta file accepted as valid
- [x] **6.5**: Validator: mixed Purpose + MODIFIED accepted as valid
- [x] **6.6**: Validator: file with neither Purpose nor requirements rejected
- [x] **6.7**: Apply: purpose-only delta updates Purpose, preserves requirements
- [x] **6.8**: Apply: mixed Purpose + ADDED delta updates both
- [x] **6.9**: ChangeParser: `PURPOSE_MODIFIED` emitted in parsed output

## Section 7: Artifact + Process Compliance

- [x] **7.1**: Rewrite `proposal.md` with `## Why` / `## What Changes` headers + expanded scope
- [x] **7.2**: Rewrite `design.md` with Phase 2 Purpose Delta technical approach
- [x] **7.3**: Rewrite `tasks.md` with complete task breakdown
- [x] **7.4**: Verify `openspec change show --json --deltas-only` includes `PURPOSE_MODIFIED`
- [x] **7.5**: Create `openspec-conventions/spec.md` delta — Purpose change scenario + symbols
- [x] **7.6**: Create `cli-validate/spec.md` delta — Purpose in no-deltas guidance
- [x] **7.7**: Create `specs-sync-skill/spec.md` delta — Purpose reconciliation + output
- [x] **7.8**: Update `proposal.md` — remove "Out of Scope" deferral, add Phase 3

## Section 8: Build + Verify

- [x] **8.1**: `npx tsc --noEmit` — clean
- [x] **8.2**: `npx vitest run test/core/archive.test.ts` — 39/39 pass ✅
- [x] **8.3**: `npx vitest run test/core/purpose-delta.test.ts` — 8/8 pass ✅
- [x] **8.4**: `npm run build` — clean
- [x] **8.5**: `openspec validate pr843-coderabbit-review-fixes` — valid ✅
- [ ] **8.6**: Reviewer-Collab re-review → APPROVED
- [ ] **8.7**: Commit and push to branch `fix/scenario-level-merge`
