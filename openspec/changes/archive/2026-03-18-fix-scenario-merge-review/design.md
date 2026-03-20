## Context

PR #843 introduced scenario-level merge for MODIFIED requirements in `specs-apply.ts`, with parsing support in `requirement-blocks.ts`. Reviews from CodeRabbit and Alfred identified tag pollution, cosmetic noise, version mismatch, and logic gaps in warning precision.

## Goals / Non-Goals

**Goals:**
- Strip `(MODIFIED)` and `(REMOVED)` tags from merged output *(DONE)*
- Revert `DEFAULT_SCHEMA` to `"spec-driven"` *(DONE)*
- Fix test quality issues *(DONE)*
- Revert Serena cosmetic reformatting in `change-utils.ts` *(NEW)*
- Revert `package.json` AND `package-lock.json` to `1.1.1` *(NEW)*
- Warn on unmatched `(MODIFIED)` scenario (typo detection) *(NEW)*
- Warn on unmatched `(REMOVED)` scenario (symmetry) *(NEW)*
- Fix warning suppression: use `matchedRemovedCount` from merge result *(NEW)*

**Non-Goals:**
- Changing core merge logic behavior
- Deciding the final release version (left to upstream author)

## Design

### A. Tag Stripping Helper (`specs-apply.ts`) — DONE

`stripScenarioTag()` cleans delta-specific markers. Integration at L129 (matched replacement) and L141 (new scenario append).

### B. DEFAULT_SCHEMA Revert (`change-utils.ts`) — DONE

Single-line revert: `"opti-spec-driven"` → `"spec-driven"`.

### C. Test Fixes (`archive.test.ts`) — DONE

Renamed misleading test, fixed brittle assertion, added REMOVED suppression test.

### D. Cosmetic Revert (`change-utils.ts`) — NEW

Revert Serena quote reformatting:
1. `git checkout origin/main -- src/utils/change-utils.ts` (restore original formatting)
2. Re-apply only `DEFAULT_SCHEMA = 'spec-driven'` fix

### E. Version Revert (`package.json` + `package-lock.json`) — NEW

Revert both manifests to `1.1.1`:
1. `git checkout origin/main -- package.json package-lock.json`
2. Verify both show `1.1.1`

**Rationale** (from Commander): Keep `1.1.1`; let the upstream author decide version during release.

### F. Unmatched Scenario Warnings — NEW

In `mergeScenarios()`, add warnings for BOTH unmatched tag types:

```typescript
// In the "append unmatched delta scenarios" loop (L137-142):
for (const s of delta.scenarios) {
  const name = normalizeScenarioName(s.name);
  if (!usedDeltaNames.has(name) && s.tag !== 'REMOVED') {
    if (s.tag === 'MODIFIED') {
      console.log(chalk.yellow(
        `⚠️  Warning: MODIFIED scenario '${s.name}' not found in main — appended as new`
      ));
    }
    result.push(stripScenarioTag(s));
  }
}

// In the "process REMOVED" loop (L108-113), track unmatched:
for (const s of delta.scenarios) {
  if (s.tag === 'REMOVED') {
    const name = normalizeScenarioName(s.name);
    if (!mainByName.has(name)) {
      console.log(chalk.yellow(
        `⚠️  Warning: REMOVED scenario '${s.name}' not found in main — ignored`
      ));
    }
    removedNames.add(name);
  }
}
```

**Key**: Need a `mainByName` lookup (Map of normalized main scenario names) to detect unmatched REMOVED.

### G. Precision Warning Suppression — NEW (Revised per Reviewer P1-3)

**Problem with original design**: Used `removedCount = filter(REMOVED).length` which counts ALL `(REMOVED)` tags including unmatched typos. This overcounts and suppresses real warnings.

**Revised approach**: `mergeScenarios()` returns `matchedRemovedCount` alongside the merged scenarios.

```typescript
// mergeScenarios() returns:
interface MergeResult {
  scenarios: ScenarioBlock[];
  matchedRemovedCount: number;  // only REMOVED tags that actually matched main
}

// In buildUpdatedSpec():
const mergeResult = mergeScenarios(mainParsed, deltaParsed);
const expectedMinCount = mainParsed.scenarios.length - mergeResult.matchedRemovedCount;
if (mergeResult.scenarios.length < expectedMinCount) {
  console.log(chalk.yellow(
    `⚠️  Warning: ${specName} requirement '${mod.name}': scenario count ` +
    `${mergeResult.scenarios.length} is less than expected ${expectedMinCount} ` +
    `(${mainParsed.scenarios.length} main - ${mergeResult.matchedRemovedCount} removed)`
  ));
}
```

**Why this is correct**: Unmatched `(REMOVED)` typos do NOT reduce `matchedRemovedCount`, so the expected count stays accurate.

## Risks / Trade-offs

| Risk | Mitigation |
|:-----|:-----------|
| Tag stripping regex too broad | Anchored to end-of-line `$` — only matches suffix pattern |
| Cosmetic revert loses DEFAULT_SCHEMA fix | Re-apply after checkout revert |
| Version revert may diverge from upstream intent | Commander decision: `1.1.1`; author decides at release |
| `mainByName` map adds memory overhead | Negligible — scenario counts are small (< 50 per requirement) |
| `MergeResult` return type change | Internal function only — no public API impact |
