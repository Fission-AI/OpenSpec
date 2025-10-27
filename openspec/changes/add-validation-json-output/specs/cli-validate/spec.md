## ADDED Requirements
### Requirement: JSON Output Flag
The validate command SHALL support a `--json` flag that outputs validation results in structured JSON format instead of human-readable text.

#### Scenario: Using JSON output flag
- **WHEN** a user runs `openspec validate --json`
- **THEN** the command SHALL output validation results in JSON format
- **AND** include detailed error information with file paths and line numbers
- **AND** exit with appropriate status codes (0 for success, 1 for validation errors)

### Requirement: JSON Output Format
The JSON output SHALL include structured information about validation results including change identifiers, validation status, error details, and file locations.

#### Scenario: JSON output structure
- **WHEN** validation is run with the `--json` flag
- **THEN** the output SHALL be a valid JSON object
- **AND** include fields for `valid`, `errors`, and `changeId`
- **AND** each error SHALL include `message`, `file`, and `line` information when applicable

### Requirement: Backward Compatibility
The validate command SHALL maintain backward compatibility, with JSON output only enabled when the `--json` flag is explicitly provided.

#### Scenario: Backward compatibility
- **WHEN** a user runs `openspec validate` without flags
- **THEN** the command SHALL output results in the existing human-readable format
- **AND** behavior SHALL be identical to current implementation