# cli-archive Delta Spec — PR #843 CodeRabbit Review Fixes

## MODIFIED Requirements

### Requirement: Spec Update Process

The archive command MUST apply delta specs to main specs using structured merge operations that preserve content at the finest granularity possible — specifically, at the scenario level within requirement blocks.

#### Scenario: Scenario count warning on unexpected decrease (MODIFIED)

- WHEN a scenario-level merge results in fewer scenarios than expected
- THEN the merge MUST compute `expected_count` as `main_count - matchedRemovedCount`
- AND the merge MUST emit a warning when `merged_count < expected_count`: `"⚠️ Warning: {specName} requirement '{name}': scenario count {merged_count} is less than expected {expected_count} ({main_count} main - {matchedRemovedCount} removed)"`
- AND the merge MUST still proceed (warning, not error)

> Updated to align with precision warning suppression logic introduced in the same PR. Wording now matches the staged main spec and implementation exactly.

#### Scenario: Unique counting for matched REMOVED scenarios (ADDED)

- WHEN a delta spec contains multiple `(REMOVED)` entries with the same normalized scenario name
- THEN the system MUST count each unique matched scenario name only ONCE toward `matchedRemovedCount`
- AND `matchedRemovedCount` MUST equal the number of unique REMOVED names that matched main scenarios
- AND duplicate REMOVED entries for the same name MUST NOT inflate `matchedRemovedCount`

> Prevents duplicate REMOVED entries from understating `expectedMinCount`, which would suppress warnings when scenarios are accidentally dropped.

#### Scenario: Deduplicated appends for new delta scenarios (ADDED)

- WHEN appending new delta scenarios (not matched to any main scenario)
- THEN the system MUST track each appended scenario name to prevent duplicate appends
- AND if a delta contains multiple scenarios with the same normalized name, only the first MUST be appended
- AND subsequent duplicates MUST be skipped silently

> Prevents duplicate scenario entries in merged output when delta contains multiple entries with the same normalized name.
