# CLI Validate Specification Changes

## ADDED Requirements

### Requirement: SHALL/MUST validation as WARNING for internationalization
The validator SHALL check for SHALL/MUST keywords in requirement text and emit a WARNING (not ERROR) to recommend RFC 2119 compliance while allowing non-English documentation.

#### Scenario: Requirement without SHALL/MUST in normal mode
- **WHEN** validating a requirement that lacks SHALL or MUST keywords
- **THEN** emit a WARNING-level issue with message "Requirement '[name]' should contain SHALL or MUST keyword (RFC 2119 best practice)"
- **AND** validation SHALL pass (not fail)
- **AND** the requirement SHALL be considered valid

#### Scenario: Requirement without SHALL/MUST in strict mode
- **WHEN** validating with `--strict` flag
- **AND** a requirement lacks SHALL or MUST keywords
- **THEN** emit a WARNING-level issue
- **AND** validation SHALL fail because --strict treats warnings as errors
- **AND** exit code SHALL be 1

#### Scenario: Non-English requirement text
- **GIVEN** a requirement written in a non-English language (e.g., Chinese, Japanese, Spanish)
- **AND** the requirement does not contain SHALL or MUST keywords
- **WHEN** validating the requirement
- **THEN** emit a WARNING recommending SHALL/MUST for English specs
- **AND** validation SHALL pass
- **AND** users can proceed without blockers

#### Scenario: English requirement with SHALL/MUST
- **WHEN** validating a requirement that contains SHALL or MUST
- **THEN** no warning SHALL be emitted
- **AND** validation passes cleanly
