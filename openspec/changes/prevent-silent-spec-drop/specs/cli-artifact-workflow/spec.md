## MODIFIED Requirements

### Requirement: Apply Instructions Command

The system SHALL generate schema-aware apply instructions via `openspec instructions apply`. When the apply phase is blocked by missing required artifacts, the command SHALL exit with a non-zero status so that scripts, loops, and agents stop instead of proceeding past a printed warning.

#### Scenario: Generate apply instructions

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** all required artifacts (per schema's `apply.requires`) exist
- **THEN** the system outputs:
  - `contextFiles` mapping artifact IDs to arrays of concrete paths for all existing artifacts
  - Schema-specific instruction text
  - Progress tracking file path (if `apply.tracks` is set)
- **AND** exits with status code 0

#### Scenario: Apply blocked by missing artifacts

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** required artifacts are missing
- **THEN** the system indicates apply is blocked
- **AND** lists which artifacts must be created first
- **AND** exits with a non-zero status code

#### Scenario: Apply blocked in JSON mode

- **WHEN** user runs `openspec instructions apply --change <id> --json`
- **AND** required artifacts are missing
- **THEN** the system prints the full JSON payload with `state` set to `blocked`
- **AND** exits with a non-zero status code

#### Scenario: Apply instructions JSON output

- **WHEN** user runs `openspec instructions apply --change <id> --json`
- **THEN** the system outputs JSON with:
  - `contextFiles`: object mapping artifact IDs to arrays of concrete paths for existing artifacts
  - `instruction`: the apply instruction text
  - `tracks`: path to progress file or null
  - `applyRequires`: list of required artifact IDs

### Requirement: Schema Apply Block

The system SHALL support an `apply` block in schema definitions that controls when and how implementation begins. For the built-in `spec-driven` schema, the apply gate SHALL include the `specs` artifact so that a change with no delta specs is reported as blocked rather than ready.

#### Scenario: Schema with apply block

- **WHEN** a schema defines an `apply` block
- **THEN** the system uses `apply.requires` to determine which artifacts must exist before apply
- **AND** uses `apply.tracks` to identify the file for progress tracking (or null if none)
- **AND** uses `apply.instruction` for guidance shown to the agent

#### Scenario: Schema without apply block

- **WHEN** a schema has no `apply` block
- **THEN** the system requires all artifacts to exist before apply is available
- **AND** uses default instruction: "All artifacts complete. Proceed with implementation."

#### Scenario: Spec-driven requires specs before apply

- **WHEN** a `spec-driven` change has `tasks.md` but no delta specs under `specs/`
- **THEN** `openspec instructions apply` reports the apply phase as blocked
- **AND** lists `specs` among the missing required artifacts
- **AND** exits with a non-zero status code
