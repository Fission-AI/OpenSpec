# cli-artifact-workflow Delta Spec

## MODIFIED Requirements

### Requirement: Instructions Command Hook Mode

The `openspec instructions` command SHALL support a `--hook <lifecycle-point>` flag to retrieve resolved lifecycle hooks.

#### Scenario: Retrieve hooks with change context

- **WHEN** user runs `openspec instructions --hook <lifecycle-point> --change "<name>"`
- **THEN** the system resolves the schema from the change's metadata
- **AND** reads hooks from both schema and config
- **AND** outputs the resolved hooks in order (schema first, config second)

#### Scenario: Retrieve hooks without change context

- **WHEN** user runs `openspec instructions --hook <lifecycle-point>` without `--change`
- **THEN** the system resolves the schema from `config.yaml`'s default `schema` field
- **AND** reads hooks from both the resolved schema and config (schema first, config second)
- **AND** sets `changeName` to null in JSON output
- **AND** if no schema is configured in `config.yaml`, returns config hooks only

#### Scenario: Mutual exclusivity with artifact argument

- **WHEN** user runs `openspec instructions <artifact> --hook <lifecycle-point>`
- **THEN** the system exits with an error indicating that `--hook` cannot be used with an artifact argument

#### Scenario: JSON output

- **WHEN** user runs `openspec instructions --hook <lifecycle-point> [--change "<name>"] --json`
- **THEN** the system outputs JSON with `lifecyclePoint`, `changeName` (string or null), and `hooks` array
- **AND** each hook includes `source` ("schema" or "config") and `instruction` fields

#### Scenario: Text output

- **WHEN** user runs `openspec instructions --hook <lifecycle-point>` without `--json`
- **THEN** the system outputs human-readable formatted hooks grouped by source

#### Scenario: No hooks found

- **WHEN** no hooks are defined for the given lifecycle point
- **THEN** the system outputs an empty hooks array in JSON mode
- **AND** an informational message in text mode

#### Scenario: Invalid lifecycle point

- **WHEN** the `--hook` value is not a recognized lifecycle point
- **THEN** the system exits with an error listing valid lifecycle points
