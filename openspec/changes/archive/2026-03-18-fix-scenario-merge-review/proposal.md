# Proposal: Fix Scenario-Level Merge Review Issues

## Why

PR #843 introduced scenario-level merge for MODIFIED requirements — a critical fix that prevents silent data loss when archiving delta specs with partial scenario updates. CodeRabbit and Alfred (OpenSpec Bot) reviews identified issues that must be fixed before the PR can be merged.

**Original issues (commit 2d36d2e — DONE):**
1. Tag pollution in merged output — `(MODIFIED)`/`(REMOVED)` tags leak into main spec
2. Accidental `DEFAULT_SCHEMA` change (`"spec-driven"` → `"opti-spec-driven"`)
3. Test quality issues (misleading name, brittle assertion, missing coverage)

**Alfred review blocking items (NEW):**
4. Cosmetic noise from Serena reformatting — `change-utils.ts` single→double quotes (48+/24- noise)
5. Version mismatch — `package.json` bumped to `1.2.0` but `package-lock.json` stayed at `1.1.1`; revert both to `1.1.1` (let upstream author decide version during release)

**Alfred review logic improvements (NEW):**
6. Unmatched `(MODIFIED)` scenario silently appended as new — should warn
7. Unmatched `(REMOVED)` scenario silently ignored — should warn (symmetry with item 6)
8. Warning suppression too aggressive — uses boolean `hasRemovedTags` instead of matched-removal count

## What Changes

1. **`specs-apply.ts`**: `stripScenarioTag()` helper strips tags before merge output *(DONE)*
2. **`change-utils.ts`**: Revert `DEFAULT_SCHEMA` to `"spec-driven"` *(DONE)*
3. **`archive.test.ts`**: Fix test quality issues *(DONE)*
4. **`change-utils.ts`**: Revert Serena cosmetic reformatting *(NEW)*
5. **`package.json` + `package-lock.json`**: Revert both to version `1.1.1` *(NEW)*
6. **`specs-apply.ts`**: Warn when `(MODIFIED)`-tagged scenario doesn't match any main scenario *(NEW)*
7. **`specs-apply.ts`**: Warn when `(REMOVED)`-tagged scenario doesn't match any main scenario *(NEW)*
8. **`specs-apply.ts`**: Fix warning suppression to use `matchedRemovedCount` (actual removals from `mergeScenarios()`) instead of raw REMOVED-tag count *(NEW)*
9. **`archive.test.ts`**: Tests for items 6, 7, 8 *(NEW)*

## Capabilities

### Modified Capabilities
- `cli-archive`: Scenario-level merge must strip tags, warn on unmatched `(MODIFIED)` AND `(REMOVED)` scenarios, and use matched-removal count for precision warning suppression

## Impact

| Dimension | Detail |
|:----------|:-------|
| Risk | LOW — localized changes to merge helper and version reverts |
| Backward Compatibility | HIGH — no behavior change; warnings are additive |
| Testing | HIGH — existing fixes + 4 new test cases |
| PR Impact | Resolves all actionable review comments (CodeRabbit + Alfred) on #843 |

## Branch Note

All code changes MUST be applied on branch `fix/scenario-level-merge` (the PR branch). The OpenSpec change artifacts live on `main`.
