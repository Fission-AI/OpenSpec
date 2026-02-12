# Lifecycle Hooks Specification

## Purpose
Lifecycle hooks allow schemas and projects to define LLM instructions that execute at operation boundaries (pre/post for each operation: explore, new, continue, ff, apply, verify, sync, archive, bulk-archive, onboard). Schema-level hooks define workflow-inherent behavior; project-level hooks add project-specific customization. Both are surfaced to the LLM via the `openspec instructions --hook` flag.

## Requirements

### Requirement: Hook Definition in Schema

The system SHALL support an optional `hooks` section in `schema.yaml` where each key is a lifecycle point and each value contains an `instruction` field.

#### Scenario: Schema with hooks defined

- **WHEN** a `schema.yaml` contains a `hooks` section with valid lifecycle point keys
- **THEN** the system parses each hook with its `instruction` field
- **AND** makes them available for resolution

#### Scenario: Schema without hooks

- **WHEN** a `schema.yaml` does not contain a `hooks` section
- **THEN** the system proceeds normally with no hooks
- **AND** no errors are raised

#### Scenario: Invalid lifecycle point key

- **WHEN** a `hooks` section contains a key that is not a recognized lifecycle point
- **THEN** the system emits a warning identifying the unrecognized key
- **AND** ignores the invalid entry

### Requirement: Hook Definition in Project Config

The system SHALL support an optional `hooks` section in `config.yaml` with the same structure as schema hooks.

#### Scenario: Config with hooks defined

- **WHEN** `config.yaml` contains a `hooks` section with valid lifecycle point keys
- **THEN** the system parses each hook with its `instruction` field
- **AND** makes them available for resolution

#### Scenario: Config without hooks

- **WHEN** `config.yaml` does not contain a `hooks` section
- **THEN** the system proceeds normally with no hooks

### Requirement: Valid Lifecycle Points

The system SHALL recognize the following lifecycle points as valid hook keys:

- `pre-explore`, `post-explore`
- `pre-new`, `post-new`
- `pre-continue`, `post-continue`
- `pre-ff`, `post-ff`
- `pre-apply`, `post-apply`
- `pre-verify`, `post-verify`
- `pre-sync`, `post-sync`
- `pre-archive`, `post-archive`
- `pre-bulk-archive`, `post-bulk-archive`
- `pre-onboard`, `post-onboard`

#### Scenario: All valid lifecycle points accepted

- **WHEN** hooks are defined for any of the recognized lifecycle points
- **THEN** the system accepts and stores them without warnings

#### Scenario: Unknown lifecycle point

- **WHEN** a hook is defined for an unrecognized lifecycle point (e.g., `post-deploy`)
- **THEN** the system emits a warning: `Unknown lifecycle point: "post-deploy"`
- **AND** ignores the entry

### Requirement: Hook Resolution Order

The system SHALL resolve hooks for a given lifecycle point by returning schema hooks first, then config hooks.

#### Scenario: Both schema and config define hooks for the same point

- **WHEN** both `schema.yaml` and `config.yaml` define a hook for `post-archive`
- **THEN** the system returns both hooks in order: schema hook first, config hook second
- **AND** each hook is tagged with its source (`schema` or `config`)

#### Scenario: Only schema defines a hook

- **WHEN** only `schema.yaml` defines a hook for `post-archive`
- **THEN** the system returns only the schema hook

#### Scenario: Only config defines a hook

- **WHEN** only `config.yaml` defines a hook for `post-archive`
- **THEN** the system returns only the config hook

#### Scenario: No hooks defined for a point

- **WHEN** neither schema nor config define a hook for a lifecycle point
- **THEN** the system returns an empty list

### Requirement: Hook CLI Exposure

The system SHALL expose hooks via `openspec instructions --hook <lifecycle-point>`, optionally scoped to a change with `--change`.

#### Scenario: Retrieve hooks with change context

- **WHEN** executing `openspec instructions --hook <lifecycle-point> --change "<name>"`
- **THEN** the system resolves the schema from the change's metadata
- **AND** reads hooks from both schema and config
- **AND** outputs the resolved hooks in order (schema first, config second)

#### Scenario: Retrieve hooks without change context

- **WHEN** executing `openspec instructions --hook <lifecycle-point>` without `--change`
- **THEN** the system resolves the schema from `config.yaml`'s default `schema` field
- **AND** reads hooks from both the resolved schema and config (schema first, config second)
- **AND** sets `changeName` to null in JSON output
- **AND** if no schema is configured in `config.yaml`, returns config hooks only

#### Scenario: Mutual exclusivity with artifact argument

- **WHEN** executing `openspec instructions <artifact> --hook <lifecycle-point>`
- **THEN** the system exits with an error indicating that `--hook` cannot be used with an artifact argument

#### Scenario: Schema override not allowed in hook mode

- **WHEN** executing `openspec instructions --hook <lifecycle-point> --schema <name>`
- **THEN** the system exits with an error indicating that `--schema` cannot be used with `--hook`

#### Scenario: JSON output

- **WHEN** executing with `--json` flag
- **THEN** the system outputs a JSON object with `lifecyclePoint`, `changeName` (string or null), and `hooks` array
- **AND** each hook includes `source` ("schema" or "config") and `instruction` fields

#### Scenario: No hooks found

- **WHEN** no hooks are defined for the given lifecycle point
- **THEN** the system outputs an empty result (JSON object with `hooks: []`, informational message in text mode)

#### Scenario: Invalid lifecycle point argument

- **WHEN** the lifecycle point argument is not a recognized value
- **THEN** the system exits with an error listing valid lifecycle points

### Requirement: Hook Instruction Content

Hook instructions SHALL be free-form text intended as LLM prompts. The system does not interpret or execute them — it surfaces them for the LLM agent to follow.

#### Scenario: Multiline instruction

- **WHEN** a hook instruction contains multiple lines
- **THEN** the system preserves the full content including newlines

#### Scenario: Instruction with template references

- **WHEN** a hook instruction references file paths or change context
- **THEN** the system passes the instruction as-is (no variable substitution in this iteration)
