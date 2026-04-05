# Tasks: scenario-level-merge

## Parser — `src/core/parsers/requirement-blocks.ts`

- [x] Add `ScenarioBlock` interface: `headerLine`, `name`, `tag?`, `raw`
- [x] Add `RequirementBlockWithScenarios` interface: extends `RequirementBlock` with `description`, `scenarios`
- [x] Add `SCENARIO_HEADER_REGEX` to match `#### Scenario:` headers
- [x] Add `normalizeScenarioName()` function: strip `(MODIFIED)`, `(REMOVED)` tags, trim
- [x] Add `extractScenarioTag()` function: extract tag from scenario header suffix
- [x] Implement `parseScenarios(block: RequirementBlock): RequirementBlockWithScenarios` function
- [x] Handle edge cases: requirement blocks with no scenarios (description-only)
- [x] Handle edge cases: scenarios inside fenced code blocks (skip them)
- [x] Export new types and functions

## Merge Logic — `src/core/specs-apply.ts`

- [x] Import new types: `ScenarioBlock`, `RequirementBlockWithScenarios`, `parseScenarios`
- [x] Add `hasScenarioTags(block: RequirementBlockWithScenarios): boolean` helper — detects if any scenario has `(MODIFIED)` or `(REMOVED)` tag
- [x] Add `mergeScenarios(main: RequirementBlockWithScenarios, delta: RequirementBlockWithScenarios): ScenarioBlock[]` function
- [x] Add `reconstructRequirementBlock(description: string, scenarios: ScenarioBlock[], headerLine: string): RequirementBlock` helper
- [x] Replace MODIFIED handler (L272-286) with scenario-level merge:
  - If `hasScenarioTags(delta)` → use `mergeScenarios()` 
  - Else → full-block replacement (legacy backward compat)
- [x] Add scenario count warning when result < original and no `(REMOVED)` tags used

## Tests — `test/core/archive.test.ts`

- [x] Test: MODIFIED preserves unchanged scenarios when delta has `(MODIFIED)` tags
- [x] Test: MODIFIED replaces tagged scenario while keeping others
- [x] Test: MODIFIED appends new scenario not in main
- [x] Test: MODIFIED removes `(REMOVED)` tagged scenario
- [x] Test: MODIFIED replaces description when delta provides one
- [x] Test: Full-block replacement when no scenario tags (backward compat)
- [x] Test: Scenario count warning emitted on unexpected decrease
- [x] Test: Scenario name normalization (tag stripping, whitespace trimming)
- [x] Test: Requirement with no scenarios (description-only) — MODIFIED works

## Integration

- [x] Run full test suite: `npm test`
- [x] Build: `npm run build`
- [x] Manual test: create a delta spec with `(MODIFIED)` scenario tags, run `openspec archive`, verify unchanged scenarios preserved
