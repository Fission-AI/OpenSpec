## ADDED Requirements

### Requirement: Load operation guidance independently

The system SHALL parse the optional `operations` project-config field independently from `schema`, `context`, `rules`, `references`, and `store` so an invalid operation entry does not discard other valid configuration.

#### Scenario: Valid operation guidance

- **WHEN** config contains `operations.apply.guidance` and `operations.archive.guidance` as arrays of strings
- **THEN** the returned project config includes both operation entries

#### Scenario: One operation is malformed

- **WHEN** apply guidance is a valid string array and archive guidance is malformed
- **THEN** the returned project config includes apply guidance
- **AND** omits archive guidance with an actionable warning

#### Scenario: Operations field is not an object

- **WHEN** config contains a non-object `operations` value
- **THEN** the system warns about the invalid field
- **AND** continues with all independently valid config fields

#### Scenario: Unknown operation ID

- **WHEN** config contains an unsupported operation ID
- **THEN** the system warns with the supported operation IDs
- **AND** ignores only the unsupported operation entry

#### Scenario: Unknown fields in an operation

- **WHEN** a supported operation contains fields other than `guidance`
- **THEN** the system warns about those fields
- **AND** preserves valid guidance for that operation

#### Scenario: Empty and formatted guidance

- **WHEN** a guidance array contains empty strings and non-empty strings with line breaks or Markdown
- **THEN** the system removes the empty entries
- **AND** preserves the non-empty entries in their original order and form
