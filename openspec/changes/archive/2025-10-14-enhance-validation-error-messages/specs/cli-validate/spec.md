## MODIFIED Requirements
### Requirement: Validation SHALL provide actionable remediation steps
Validation output SHALL include specific guidance to fix each error, including expected structure, example headers, and suggested commands to verify fixes.

#### Scenario: No deltas found in change
- **WHEN** validating a change with zero parsed deltas
- **THEN** show error "No deltas found" with guidance:
  - Explain that change specs must include `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, or `## RENAMED Requirements`
  - Remind authors that files must live under `openspec/changes/{id}/specs/<capability>/spec.md`
  - Include an explicit note: "Spec delta files cannot start with titles before the operation headers"
  - Suggest running `openspec change show {id} --json --deltas-only` for debugging

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

### Requirement: Validator SHALL detect likely misformatted scenarios and warn with a fix
The validator SHALL recognize bulleted lines that look like scenarios (e.g., lines beginning with WHEN/THEN/AND) and emit a targeted warning with a conversion example to `#### Scenario:`.

#### Scenario: Bulleted WHEN/THEN under a Requirement
- **WHEN** bullets that start with WHEN/THEN/AND are found under a requirement without any `#### Scenario:` headers
- **THEN** emit warning: "Scenarios must use '#### Scenario:' headers", and show a conversion template:
```
#### Scenario: Short name
- **WHEN** ...
- **THEN** ...
- **AND** ...
```
