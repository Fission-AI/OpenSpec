## ADDED Requirements

### Requirement: Local Creation Date Metadata

The system SHALL record the `created` value in metadata for a newly created change as the `YYYY-MM-DD` calendar date in the effective local time zone of the Node.js process executing the CLI.

#### Scenario: Create change across a UTC date boundary

- **GIVEN** the CLI process's effective local time zone is `Asia/Shanghai`
- **AND** the current instant is `2026-07-14T16:30:00.000Z`
- **WHEN** the user creates a change
- **THEN** the new change's `.openspec.yaml` contains `created: 2026-07-15`
