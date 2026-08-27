## ADDED Requirements

### Requirement: Stack Metadata Scaffolding
Change creation workflows SHALL support optional dependency metadata for new or split changes.

#### Scenario: Create change with stack metadata
- **WHEN** a change is created with stack metadata inputs
- **THEN** creation SHALL persist metadata fields in change configuration
- **AND** persisted metadata SHALL be validated against change metadata schema rules

#### Scenario: Split-generated child metadata
- **WHEN** child changes are generated from a split workflow
- **THEN** each child SHALL include a `parent` link to the source change
- **AND** SHALL include dependency metadata needed for deterministic sequencing

