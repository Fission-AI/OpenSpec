## ADDED Requirements

### Requirement: Validate ADR Changes

The `openspec validate` command SHALL validate Architectural Decision Records (ADRs) in change proposals alongside spec validation.

#### Scenario: Validating ADR deltas in a change

- **WHEN** running `openspec validate [change-name] --strict`
- **THEN** the command SHALL validate all ADR deltas in `changes/[change-name]/adrs/`
- **AND** check that ADR deltas use correct section headers (`## ADDED Decisions`, etc.)
- **AND** validate that each delta operation references valid decisions
- **AND** report any validation errors with clear messages

#### Scenario: Validating ADR format

- **WHEN** validating an ADR delta
- **THEN** the command SHALL check for required sections: Context, Decision, Options Considered, Consequences
- **AND** warn if optional sections (References) are missing but don't fail validation
- **AND** validate that the ADR title follows format `# ADR: [Name]`

#### Scenario: Validating ADDED decisions

- **WHEN** validating `## ADDED Decisions` in an ADR delta
- **THEN** the command SHALL verify that the decision doesn't already exist in `openspec/adrs/`
- **AND** check that the ADR includes all required sections
- **AND** report errors if the decision name conflicts with existing ADRs

#### Scenario: Validating MODIFIED decisions

- **WHEN** validating `## MODIFIED Decisions` in an ADR delta
- **THEN** the command SHALL verify that the referenced decision exists in current ADRs
- **AND** check that the ADR header matches an existing decision (normalized)
- **AND** report errors if the decision doesn't exist

#### Scenario: Validating REMOVED decisions

- **WHEN** validating `## REMOVED Decisions` in an ADR delta
- **THEN** the command SHALL verify that the referenced decision exists in current ADRs
- **AND** check that a removal reason is provided
- **AND** report errors if the decision doesn't exist

#### Scenario: Validating RENAMED decisions

- **WHEN** validating `## RENAMED Decisions` in an ADR delta
- **THEN** the command SHALL verify that the FROM decision exists
- **AND** verify that the TO decision doesn't already exist
- **AND** check that FROM and TO are both specified
- **AND** report errors for invalid renames

#### Scenario: Combined spec and ADR validation

- **WHEN** running `openspec validate [change-name]`
- **THEN** the command SHALL validate both specs and ADRs in the change
- **AND** report validation results separately for specs and ADRs
- **AND** exit with error status if either specs or ADRs have validation errors

#### Scenario: Validating standalone ADR

- **WHEN** running `openspec validate [decision-name] --type adr`
- **THEN** the command SHALL validate the ADR file directly in `openspec/adrs/`
- **AND** check for required sections and proper format
- **AND** report any format or structural issues

#### Scenario: No ADR deltas to validate

- **WHEN** running `openspec validate [change-name]` and the change has no ADR deltas
- **THEN** the command SHALL not report ADR validation errors
- **AND** only validate spec deltas if present
- **AND** indicate that no ADRs were found in validation output
