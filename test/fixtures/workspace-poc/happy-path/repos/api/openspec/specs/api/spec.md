## Purpose
Provide deterministic API fixture state for workspace sandbox tests.

## Requirements

### Requirement: API workspace fixture SHALL stay deterministic
The API fixture SHALL remain stable across cloned workspaces.

#### Scenario: Read the fixture
- **GIVEN** the happy-path API fixture
- **WHEN** a test reads the spec
- **THEN** the content is stable and machine-readable
