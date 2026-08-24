## ADDED Requirements

### Requirement: Schema validate checks layered overrides

`openspec schema validate <name>` SHALL validate the overlay document, effective composed schema, and every effective template source for a layered schema.

#### Scenario: Valid composed schema

- **GIVEN** a packaged schema and valid user overlay produce a valid effective schema
- **AND** every referenced template resolves from the user or package root
- **WHEN** the user validates the schema
- **THEN** validation SHALL succeed
- **AND** output SHALL identify both the base and overlay paths

#### Scenario: Invalid overlay operation

- **GIVEN** a user overlay contains conflicting or unsupported operations
- **WHEN** the user validates the schema
- **THEN** validation SHALL fail
- **AND** the issue path SHALL identify `schema.override.yaml` and the invalid field

#### Scenario: Invalid effective schema

- **GIVEN** valid overlay syntax produces an invalid dependency graph
- **WHEN** the user validates the schema
- **THEN** validation SHALL fail with the complete-schema validation error
- **AND** output SHALL state that the effective schema became invalid after applying the overlay

#### Scenario: Template fallback is valid

- **GIVEN** a referenced template is absent from the user overlay directory but present in the packaged directory
- **WHEN** the user validates the composed schema
- **THEN** template validation SHALL succeed using the packaged template

#### Scenario: User replacement and overlay conflict

- **GIVEN** the user schema directory contains both `schema.yaml` and `schema.override.yaml`
- **AND** no higher-priority project schema of the same name exists
- **WHEN** the user validates that schema
- **THEN** validation SHALL fail and explain the two mutually exclusive customization modes

#### Scenario: JSON validation reports composed paths

- **WHEN** a composed schema is validated with `--json`
- **THEN** output SHALL retain `valid`, `name`, `path`, and `issues`
- **AND** it SHALL add base and overlay path metadata
