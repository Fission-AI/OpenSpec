## ADDED Requirements

### Requirement: Validator SHALL accept normative keywords in all supported languages
The validator SHALL accept RFC 2119 normative keywords in English (`SHALL`, `MUST`) and Spanish (`DEBE`, `DEBERA`) when checking requirement text. Keywords SHALL be matched in uppercase only, using word-boundary detection to prevent substring false positives.

#### Scenario: English keywords accepted
- **WHEN** a requirement contains `SHALL` or `MUST` in uppercase
- **THEN** the validator SHALL pass the normative keyword check

#### Scenario: Spanish keywords accepted
- **WHEN** a requirement contains `DEBE` or `DEBERA` in uppercase
- **THEN** the validator SHALL pass the normative keyword check

#### Scenario: Accented Spanish keyword accepted
- **WHEN** a requirement contains `DEBERÁ` (with accent)
- **THEN** the validator SHALL pass the normative keyword check

#### Scenario: Lowercase keywords rejected
- **WHEN** a requirement contains `debe`, `shall`, `must`, or `debera` in lowercase
- **THEN** the validator SHALL fail the normative keyword check
- **AND** report a missing keyword error

#### Scenario: Substring matches rejected
- **WHEN** a requirement contains a word that includes a keyword as a substring (e.g., `INDEBTED`, `MUSTERING`)
- **THEN** the validator SHALL not count the substring as a valid keyword match

### Requirement: Keyword validation SHALL use a centralized keyword registry
All keyword checks across the codebase (schema refinement in `base.schema.ts` and delta validation in `validator.ts`) SHALL use a single shared function that reads from a centralized keyword constant. The keyword constant SHALL be defined in `src/core/validation/constants.ts`.

#### Scenario: Schema-level and validator-level checks use the same source
- **WHEN** a new language keyword is added to the `NORMATIVE_KEYWORDS` constant
- **THEN** both the `RequirementSchema` refinement and the `containsShallOrMust` validator method SHALL recognize the new keyword without additional code changes

### Requirement: Validation error messages SHALL list all accepted keywords
When a requirement fails the normative keyword check, the error message SHALL list all accepted keywords across all supported languages so the user knows exactly which keywords are valid.

#### Scenario: Error message includes all keywords
- **WHEN** a requirement fails the normative keyword check
- **THEN** the error message SHALL include all accepted keywords (e.g., `SHALL, MUST, DEBE, DEBERA`)
