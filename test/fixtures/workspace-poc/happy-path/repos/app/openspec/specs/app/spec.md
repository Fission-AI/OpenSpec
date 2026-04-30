## Purpose
Provide deterministic app fixture state for workspace sandbox tests.

## Requirements

### Requirement: App workspace fixture SHALL stay deterministic
The app fixture SHALL keep a stable spec for CLI and materialization tests.

#### Scenario: Read the fixture
- **GIVEN** the happy-path app fixture
- **WHEN** a test reads the spec
- **THEN** the content is stable and machine-readable
