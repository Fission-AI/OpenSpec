## Purpose
Provide deterministic docs fixture state for workspace sandbox tests.

## Requirements

### Requirement: Docs workspace fixture SHALL stay deterministic
The docs fixture SHALL remain stable across cloned workspaces.

#### Scenario: Read the fixture
- **GIVEN** the happy-path docs fixture
- **WHEN** a test reads the spec
- **THEN** the content is stable and machine-readable
