# cli-artifact-workflow Delta Spec

## ADDED Requirements

### Requirement: Hooks Command

The system SHALL provide an `openspec hooks` command to retrieve resolved lifecycle hooks for a given point and change.

#### Scenario: Retrieve hooks with change context

- **WHEN** user runs `openspec hooks <lifecycle-point> --change "<name>"`
- **THEN** the system resolves the schema from the change's metadata
- **AND** reads hooks from both schema and config
- **AND** outputs the resolved hooks in order (schema first, config second)

#### Scenario: Retrieve hooks without change context

- **WHEN** user runs `openspec hooks <lifecycle-point>` without `--change`
- **THEN** the system resolves the schema from `config.yaml`'s default `schema` field
- **AND** reads hooks from both the resolved schema and config (schema first, config second)
- **AND** sets `changeName` to null in JSON output
- **AND** if no schema is configured in `config.yaml`, returns config hooks only

#### Scenario: JSON output

- **WHEN** user runs `openspec hooks <lifecycle-point> [--change "<name>"] --json`
- **THEN** the system outputs JSON with `lifecyclePoint`, `changeName` (string or null), and `hooks` array
- **AND** each hook includes `source` ("schema" or "config") and `instruction` fields

#### Scenario: Text output

- **WHEN** user runs `openspec hooks <lifecycle-point>` without `--json`
- **THEN** the system outputs human-readable formatted hooks grouped by source

#### Scenario: No hooks found

- **WHEN** no hooks are defined for the given lifecycle point
- **THEN** the system outputs an empty hooks array in JSON mode
- **AND** an informational message in text mode

#### Scenario: Invalid lifecycle point

- **WHEN** the lifecycle point argument is not a recognized value
- **THEN** the system exits with an error listing valid lifecycle points
