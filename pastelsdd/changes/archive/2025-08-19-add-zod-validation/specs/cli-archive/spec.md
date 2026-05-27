## ADDED Requirements

### Requirement: Archive Validation

The archive command SHALL validate changes before applying them to ensure data integrity.

#### Scenario: Pre-archive validation

- **WHEN** executing `pastelsdd archive change-name`
- **THEN** validate the change structure first
- **AND** only proceed if validation passes
- **AND** show validation errors if it fails

#### Scenario: Force archive without validation

- **WHEN** executing `pastelsdd archive change-name --no-validate`
- **THEN** skip validation (unsafe mode)
- **AND** show warning about skipping validation