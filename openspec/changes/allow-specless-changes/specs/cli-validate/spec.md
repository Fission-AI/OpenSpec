## MODIFIED Requirements

### Requirement: Validation SHALL provide actionable remediation steps
Validation output SHALL include specific guidance to fix each error, including expected structure, example headers, and suggested commands to verify fixes.

#### Scenario: No deltas found in change (default behavior)
- **WHEN** validating a change with zero parsed deltas
- **AND** the project config does not set `requireSpecDeltas` (defaults to `"error"`)
- **THEN** show error "No deltas found" with guidance:
  - Explain that change specs must include `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, or `## RENAMED Requirements`
  - Remind authors that files must live under `openspec/changes/{id}/specs/<capability>/spec.md`
  - Include an explicit note: "Spec delta files cannot start with titles before the operation headers"
  - Suggest running `openspec show {id} --json --deltas-only` for debugging
  - Note: "If this change intentionally has no spec deltas, set `requireSpecDeltas: false` in openspec/config.yaml"

#### Scenario: No deltas found, requireSpecDeltas is "warn"
- **WHEN** validating a change with zero parsed deltas
- **AND** the project config has `requireSpecDeltas` set to `"warn"`
- **THEN** emit a WARNING stating "Change has no spec deltas (allowed by config)"
- **AND** validation SHALL pass (report.valid is `true` in non-strict mode)

#### Scenario: No deltas found, requireSpecDeltas is "warn", strict mode
- **WHEN** validating a change with zero parsed deltas
- **AND** the project config has `requireSpecDeltas` set to `"warn"`
- **AND** `--strict` mode is enabled
- **THEN** emit a WARNING stating "Change has no spec deltas (allowed by config)"
- **AND** validation SHALL fail (report.valid is `false` because strict mode treats warnings as errors)

#### Scenario: No deltas found, requireSpecDeltas is false
- **WHEN** validating a change with zero parsed deltas
- **AND** the project config has `requireSpecDeltas` set to `false`
- **THEN** emit no issue (no error, no warning, no info) for the missing deltas
- **AND** validation SHALL pass

#### Scenario: Missing required sections
- **WHEN** a required section is missing
- **THEN** include expected header names and a minimal skeleton:
  - For Spec: `## Purpose`, `## Requirements`
  - For Change: `## Why`, `## What Changes`
  - Provide an example snippet of the missing section with placeholder prose ready to copy
  - Mention the quick-reference section in `openspec/AGENTS.md` as the authoritative template

#### Scenario: Missing requirement descriptive text
- **WHEN** a requirement header lacks descriptive text before scenarios
- **THEN** emit an error explaining that `### Requirement:` lines must be followed by narrative text before any `#### Scenario:` headers
  - Show compliant example: "### Requirement: Foo" followed by "The system SHALL ..."
  - Suggest adding 1-2 sentences describing the normative behavior prior to listing scenarios
  - Reference the pre-validation checklist in `openspec/AGENTS.md`
