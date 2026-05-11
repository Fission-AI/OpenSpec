## ADDED Requirements

### Requirement: Apply Skill Template Consumes Context and Rules

The apply skill template SHALL instruct the AI to read `context` and `rules` from the apply instructions JSON output and apply them as behavioral constraints during implementation, without copying them into any output file.

#### Scenario: Apply skill reads context from instructions JSON

- **WHEN** the apply skill fetches `openspec instructions apply --change <id> --json`
- **AND** the JSON includes a `context` field
- **THEN** the skill applies that context as background knowledge during task implementation

#### Scenario: Apply skill reads rules from instructions JSON

- **WHEN** the apply skill fetches `openspec instructions apply --change <id> --json`
- **AND** the JSON includes a `rules` field
- **THEN** the skill applies those rules as constraints during task implementation

#### Scenario: Context and rules are not written into implementation output

- **WHEN** the apply skill uses context and rules from the instructions JSON
- **THEN** the context and rules content does not appear in any code files, task file updates, or other implementation output

## MODIFIED Requirements

### Requirement: Apply Instructions Command

The system SHALL generate schema-aware apply instructions via `openspec instructions apply`, including injected project context and workflow rules when present in config.

#### Scenario: Generate apply instructions

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** all required artifacts (per schema's `apply.requires`) exist
- **THEN** the system outputs:
  - `contextFiles` mapping artifact IDs to arrays of concrete paths for all existing artifacts
  - Schema-specific instruction text
  - Progress information derived from the tracking file (if `apply.tracks` is set)

#### Scenario: Apply instructions include project context when configured

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** `openspec/config.yaml` contains a `context` field
- **THEN** output includes a `<project_context>` section after the built-in instruction content

#### Scenario: Apply instructions include workflow rules when configured

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** `openspec/config.yaml` contains `rules.apply` with one or more entries
- **THEN** output includes a `<rules>` section after the built-in instruction content

#### Scenario: Apply blocked by missing artifacts

- **WHEN** user runs `openspec instructions apply --change <id>`
- **AND** required artifacts are missing
- **THEN** the system indicates apply is blocked
- **AND** lists which artifacts must be created first

#### Scenario: Apply instructions JSON output

- **WHEN** user runs `openspec instructions apply --change <id> --json`
- **THEN** the system outputs JSON with:
  - `contextFiles`: object mapping artifact IDs to arrays of concrete paths for existing artifacts
  - `instruction`: the apply instruction text
  - `progress`: task progress summary derived from the tracking file when present
  - `tasks`: parsed task list with completion state when a tracking file exists
  - `state`: current apply state (`blocked`, `ready`, or `all_done`)
  - `missingArtifacts`: list of required artifacts when apply is blocked by missing artifacts, omitted otherwise
  - `context`: project context string if present in config, omitted otherwise
  - `rules`: array of rule strings from `rules.apply` if present, omitted otherwise
