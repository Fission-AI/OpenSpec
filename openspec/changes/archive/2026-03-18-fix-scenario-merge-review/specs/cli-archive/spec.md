# CLI Archive — Delta Spec

## MODIFIED Requirements

### Requirement: Spec Update Process

The archive command MUST apply delta specs to main specs using structured merge operations that preserve content at the finest granularity possible — specifically, at the scenario level within requirement blocks.

#### Scenario: MODIFIED requirement merges at scenario level (MODIFIED)

- WHEN a delta spec contains a MODIFIED requirement with scenario-level tags (`(MODIFIED)`, `(REMOVED)`)
- THEN the merge MUST operate at the `#### Scenario:` level within the requirement block:
  1. **Scenarios tagged `(MODIFIED)`**: Replace the matching scenario in the main spec (matched by name after stripping the tag)
  2. **Scenarios tagged `(REMOVED)`**: Remove the matching scenario from the main spec
  3. **Scenarios with no tag that exist in main**: Replace the matching scenario (implicit update)
  4. **Scenarios with no tag that do NOT exist in main**: Append as new scenarios
  5. **Main scenarios not referenced by delta**: Preserved unchanged
- AND the requirement-level description (text between `### Requirement:` header and first `#### Scenario:`) MUST be replaced by the delta's description if the delta provides a non-empty description
- AND the merged block MUST be reconstructed in order: description + preserved main scenarios (in original order) + new scenarios (appended)
- AND the merged output MUST NOT contain delta-specific tags (`(MODIFIED)`, `(REMOVED)`) in scenario headers — tags MUST be stripped before writing to the main spec

> The last clause ("tags MUST be stripped") was missing from the original spec. This caused tag pollution in merged main specs (PR #843 review finding).

#### Scenario: Unmatched MODIFIED scenario emits warning (ADDED)

- WHEN a delta scenario is tagged `(MODIFIED)` but its normalized name does NOT match any scenario in the main requirement
- THEN the system MUST emit a warning: `⚠️ Warning: MODIFIED scenario '<name>' not found in main — appended as new`
- AND the scenario MUST still be appended to the merged output (non-breaking behavior)
- AND the scenario header MUST have the `(MODIFIED)` tag stripped before writing

> This catches typos in scenario names. Without this warning, a mistyped MODIFIED scenario silently duplicates instead of replacing the intended target.

#### Scenario: Unmatched REMOVED scenario emits warning (ADDED)

- WHEN a delta scenario is tagged `(REMOVED)` but its normalized name does NOT match any scenario in the main requirement
- THEN the system MUST emit a warning: `⚠️ Warning: REMOVED scenario '<name>' not found in main — ignored`
- AND the unmatched REMOVED scenario MUST NOT be counted toward `matchedRemovedCount`
- AND the system MUST NOT create or append any new scenario for the unmatched entry

> Symmetry with unmatched MODIFIED warning. Without this, a typo in a REMOVED tag silently does nothing AND can suppress the scenario-count warning via overcounting.

#### Scenario: Precision warning suppression for REMOVED scenarios (MODIFIED)

- WHEN a delta contains scenarios tagged `(REMOVED)` AND the merged scenario count is less than the main scenario count
- THEN the system MUST calculate `matchedRemovedCount` as the number of REMOVED-tagged scenarios whose normalized name MATCHED an existing main scenario
- AND the system MUST calculate the expected count as: `main_count - matchedRemovedCount`
- AND the system MUST only suppress the warning if `merged_count >= expected_count`
- AND if `merged_count < expected_count`, the system MUST emit a warning including the expected count, actual count, main count, and matched removed count

> Previously, ANY `(REMOVED)` tag suppressed the warning entirely. The revised logic uses matched removals only, preventing unmatched typos from hiding real scenario loss.
