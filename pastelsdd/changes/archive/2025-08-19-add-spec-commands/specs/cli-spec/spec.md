## ADDED Requirements

### Requirement: Spec Command

The system SHALL provide a `spec` command with subcommands for displaying, listing, and validating specifications.

#### Scenario: Show spec as JSON

- **WHEN** executing `pastelsdd spec show init --json`
- **THEN** parse the markdown spec file
- **AND** extract headings and content hierarchically
- **AND** output valid JSON to stdout

#### Scenario: List all specs

- **WHEN** executing `pastelsdd spec list`
- **THEN** scan the pastelsdd/specs directory
- **AND** return list of all available capabilities
- **AND** support JSON output with `--json` flag

#### Scenario: Filter spec content

- **WHEN** executing `pastelsdd spec show init --requirements`
- **THEN** display only requirement names and SHALL statements
- **AND** exclude scenario content

#### Scenario: Validate spec structure

- **WHEN** executing `pastelsdd spec validate init`
- **THEN** parse the spec file
- **AND** validate against Zod schema
- **AND** report any structural issues

### Requirement: JSON Schema Definition

The system SHALL define Zod schemas that accurately represent the spec structure for runtime validation.

#### Scenario: Schema validation

- **WHEN** parsing a spec into JSON
- **THEN** validate the structure using Zod schemas
- **AND** ensure all required fields are present
- **AND** provide clear error messages for validation failures