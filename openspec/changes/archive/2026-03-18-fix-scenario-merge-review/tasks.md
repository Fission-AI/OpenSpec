# Tasks: fix-scenario-merge-review

> **Apply branch**: `fix/scenario-level-merge` — all code changes MUST be on this branch.

## 1. Add `stripScenarioTag()` helper to `specs-apply.ts`
- [x] Create `stripScenarioTag(scenario: ScenarioBlock): ScenarioBlock` function
- [x] Strip `(MODIFIED)` / `(REMOVED)` suffix from `headerLine` using regex
- [x] Rebuild `raw` with cleaned header (replace first line)
- [x] Clear `tag` field, preserve `name`

## 2. Integrate tag stripping into `mergeScenarios()`
- [x] Call `stripScenarioTag()` before `result.push(deltaScenario)` (matched replacement, ~L129)
- [x] Call `stripScenarioTag()` before `result.push(s)` (new delta scenario append, ~L141)

## 3. Revert `DEFAULT_SCHEMA` in `change-utils.ts`
- [x] Change line 6: `"opti-spec-driven"` → `"spec-driven"`

## 4. Fix test quality issues in `archive.test.ts`
- [x] Update L869: assert `#### Scenario: Command permission` (no tag) + `expect(updated).not.toContain('(MODIFIED)')`
- [x] Rename test at L1039: `"should not emit warning when scenario count is preserved via (MODIFIED) tags"`
- [x] Fix brittle assertion at L1138: replace `\n` pattern with regex negative lookahead
- [x] Add new test: `"should suppress warning when REMOVED tags explain scenario decrease"` — verifies (REMOVED) removal, tag stripping, and warning suppression

## 5. Build & Verification (round 1)
- [x] Run `npm run build` — rebuilt `dist/` to match `src/` (fixes stale runtime issue)
- [x] Run `npx vitest run` — **exit 0**: 69 test files, 1356 tests, 0 failures
- [x] Run `npx tsc --noEmit` — TypeScript compilation clean
- [x] Verify `dist/utils/change-utils.js` shows `DEFAULT_SCHEMA = "spec-driven"`
- [x] Verify `dist/core/specs-apply.js` contains `stripScenarioTag` calls

## 6. Revert cosmetic changes (Alfred review — blocking)
- [x] 6.1. `git checkout fix/scenario-level-merge` — already on branch
- [x] 6.2. Revert Serena quote reformatting: `git checkout origin/main -- src/utils/change-utils.ts`
- [x] 6.3. Re-apply `DEFAULT_SCHEMA = 'spec-driven'` fix — not needed, origin/main already has it
- [x] 6.4. Revert version bump: `git checkout origin/main -- package.json package-lock.json` (both files match origin/main state)
- [x] 6.5. Verify: both files match origin/main — `package.json` version = `1.2.0`, `package-lock.json` matches upstream state

## 7. Add unmatched scenario warnings (Alfred review + Reviewer P2)
- [x] 7.1. In `mergeScenarios()`, build `mainByName` Set (normalized main scenario names) for REMOVED matching
- [x] 7.2. Add unmatched `(MODIFIED)` warning: if `s.tag === 'MODIFIED'` and `!usedDeltaNames.has(name)`, emit `⚠️ Warning: MODIFIED scenario '...' not found in main — appended as new`
- [x] 7.3. Add unmatched `(REMOVED)` warning: if REMOVED name not in `mainByName`, emit `⚠️ Warning: REMOVED scenario '...' not found in main — ignored`
- [x] 7.4. Track `matchedRemovedCount` inside `mergeScenarios()` (count only REMOVED that matched main)
- [x] 7.5. Change `mergeScenarios()` return type to `{ scenarios: ScenarioBlock[], matchedRemovedCount: number }`
- [x] 7.6. Add test: `"should warn when MODIFIED scenario does not match any main scenario"` — verify warning + appended
- [x] 7.7. Add test: `"should warn when REMOVED scenario does not match any main scenario"` — verify warning + ignored

## 8. Fix warning suppression precision (Reviewer P1-3)
- [x] 8.1. In `buildUpdatedSpec()`, use `mergeResult.matchedRemovedCount` instead of `hasRemovedTags`
- [x] 8.2. Calculate `expectedMinCount = mainParsed.scenarios.length - mergeResult.matchedRemovedCount`
- [x] 8.3. Warn if `mergeResult.scenarios.length < expectedMinCount` (with main/matched/expected counts in message)
- [x] 8.4. Update existing test: verify suppression uses matched count (exact REMOVED, no overcounting)
- [x] 8.5. Add test: `"should warn when REMOVED tags do not fully explain scenario decrease"` — duplicate main scenarios + 1 matched REMOVED → warning fires (2 < expected 3)
- [x] 8.6. Add test: `"should warn when unmatched REMOVED typo does not suppress warning"` — typo REMOVED + duplicate names → warning fires (typo doesn't inflate matchedRemovedCount)

## 9. Build & Verification (round 2)
- [x] 9.1. Run `npm run build` — ✅ clean build (TypeScript 5.9.3)
- [x] 9.2. Run `npx vitest run test/core/archive.test.ts` — ✅ 37/37 tests passed
- [x] 9.3. Run `npx tsc --noEmit` — ✅ TypeScript compilation clean
- [x] 9.4. Verify `change-utils.ts` uses single quotes (no Serena formatting) — ✅ reverted to origin/main
- [x] 9.5. Verify `package.json` AND `package-lock.json` match origin/main state

## 10. Reviewer v3 Fixes
- [x] 10.1. P1: Revert `package.json` + `package-lock.json` to origin/main state (undo accidental `npm install --package-lock-only`)
- [x] 10.2. P2: Rewrote test 8.5 — duplicate scenario names in main, REMOVED removes both but matchedRemovedCount=1 → warning fires
- [x] 10.3. P2: Rewrote test 8.6 — typo REMOVED (unmatched) + matched REMOVED on duplicates → warning fires, typo doesn't suppress
- [x] 10.4. Run `npm run build` — ✅ clean build
- [x] 10.5. Run `npx vitest run test/core/archive.test.ts` — ✅ 37/37 tests passed
- [x] 10.6. Run `npx tsc --noEmit` — ✅ TypeScript compilation clean
