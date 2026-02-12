## ADDED Requirements

### Requirement: Standalone context flag
The `openspec instructions` command SHALL support a `--context` flag that returns the project context from `config.yaml` without requiring a change name or artifact ID.

#### Scenario: Return project context as text
- **WHEN** `openspec instructions --context` is called
- **THEN** the command reads `openspec/config.yaml` via `readProjectConfig()` and outputs the `context` field as plain text

#### Scenario: Return project context as JSON
- **WHEN** `openspec instructions --context --json` is called
- **THEN** the command outputs `{ "context": "<context string>" }`

#### Scenario: No config file exists
- **WHEN** `openspec instructions --context` is called and no `openspec/config.yaml` exists
- **THEN** the command outputs nothing (text mode) or `{ "context": null }` (JSON mode) and exits with code 0

#### Scenario: Config exists but no context field
- **WHEN** `openspec instructions --context` is called and `config.yaml` exists but has no `context` field
- **THEN** the command outputs nothing (text mode) or `{ "context": null }` (JSON mode) and exits with code 0

### Requirement: Context flag exclusivity
The `--context` flag SHALL be incompatible with change-specific and artifact-specific options.

#### Scenario: Combined with --change
- **WHEN** `openspec instructions --context --change "some-change"` is called
- **THEN** the command outputs an error message and exits with non-zero code

#### Scenario: Combined with --schema
- **WHEN** `openspec instructions --context --schema "some-schema"` is called
- **THEN** the command outputs an error message and exits with non-zero code

#### Scenario: Combined with artifact argument
- **WHEN** `openspec instructions proposal --context` is called
- **THEN** the command outputs an error message and exits with non-zero code

### Requirement: CLI documentation
The `--context` flag SHALL be documented in the CLI reference documentation.

#### Scenario: Documentation includes context flag
- **WHEN** a user reads `docs/cli.md`
- **THEN** the `openspec instructions` section documents the `--context` flag with usage examples and behavior
