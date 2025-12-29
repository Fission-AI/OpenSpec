# cli-validate Specification

## MODIFIED Requirements

### Requirement: Metadata field extraction

The validator SHALL skip metadata field lines when extracting requirement description text for SHALL/MUST validation.

#### Scenario: Requirement with metadata fields before description

- **GIVEN** a requirement with metadata fields (`**ID**:`, `**Priority**:`, etc.) between the title and description
- **WHEN** validating for SHALL/MUST keywords
- **THEN** the validator SHALL skip all lines matching `/^\*\*[^*]+\*\*:/` pattern
- **AND** SHALL extract the first substantial non-metadata line as the requirement description
- **AND** SHALL check that description (not metadata) for SHALL or MUST keywords

#### Scenario: Requirement without metadata fields

- **GIVEN** a requirement with no metadata fields
- **WHEN** validating for SHALL/MUST keywords
- **THEN** the validator SHALL extract the first non-empty line after the title
- **AND** SHALL check that line for SHALL or MUST keywords

#### Scenario: Requirement with blank lines before description

- **GIVEN** a requirement with blank lines between metadata/title and description
- **WHEN** validating for SHALL/MUST keywords
- **THEN** the validator SHALL skip blank lines
- **AND** SHALL extract the first substantial text line as the requirement description
