# cli-archive — Delta Spec for scenario-level-merge

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

#### Scenario: Full-block replacement for legacy delta specs

- WHEN a delta spec contains a MODIFIED requirement where NO scenarios have tags (`(MODIFIED)`, `(REMOVED)`)
- THEN the merge MUST use full-block replacement (legacy behavior)
- AND this ensures backward compatibility with existing delta specs that include all scenarios

#### Scenario: Scenario count warning on unexpected decrease

- WHEN a scenario-level merge results in fewer scenarios than the original requirement
- AND no `(REMOVED)` tags were used in the delta
- THEN the merge MUST emit a warning: `"⚠️ Warning: {specName} requirement '{name}': scenario count changed from {original} to {result}"`
- AND the merge MUST still proceed (warning, not error)

#### Scenario: Scenario name normalization for matching

- WHEN matching delta scenarios to main scenarios
- THEN the match MUST be performed by normalizing scenario names: strip `(MODIFIED)` and `(REMOVED)` tags, then trim whitespace
- AND `Phase 2 gate check (MODIFIED)` MUST match `Phase 2 gate check`

## ADDED Requirements

### Requirement: Scenario-Level Parsing

The requirement block parser MUST support parsing `#### Scenario:` sections within requirement blocks into structured data, enabling fine-grained merge operations.

#### Scenario: Parse scenarios from requirement block

- WHEN a `RequirementBlock` is parsed for scenarios
- THEN the parser MUST extract each `#### Scenario:` section as a `ScenarioBlock` containing:
  - `headerLine`: the full `#### Scenario:` line
  - `name`: the scenario name (without tags)
  - `tag`: optional `MODIFIED`, `REMOVED`, or `undefined`
  - `raw`: the full scenario block content including header
- AND the parser MUST extract the requirement-level description (text between `### Requirement:` header and first `#### Scenario:`)
- AND the parser MUST handle requirements with no scenarios (description-only blocks)

#### Scenario: Extract tags from scenario headers

- WHEN a scenario header contains a tag suffix like `(MODIFIED)` or `(REMOVED)`
- THEN the parser MUST extract the tag as a separate field
- AND the scenario name MUST NOT include the tag
- AND the tag MUST be case-insensitive for matching
