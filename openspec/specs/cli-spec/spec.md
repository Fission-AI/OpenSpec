# cli-spec Specification

## Purpose
Document the canonical verb-first commands for showing, listing, and validating source-of-truth specifications.

## Requirements
### Requirement: Canonical spec show
The CLI SHALL show specifications through the top-level `show` command.

#### Scenario: Interactive spec show
- **WHEN** executing `openspec show` without an item in an interactive terminal
- **THEN** allow selection of a spec and display its content

#### Scenario: Direct spec show
- **WHEN** executing `openspec show <spec-id> --type spec`
- **THEN** parse and display the specification
- **AND** preserve `--json`, `--requirements`, `--no-scenarios`, and `-r/--requirement`

### Requirement: Canonical spec list
The CLI SHALL list specifications through `openspec list --specs`.

#### Scenario: List all specs
- **WHEN** executing `openspec list --specs`
- **THEN** scan `openspec/specs/`
- **AND** report available capabilities and requirement counts using the existing list behavior

### Requirement: Canonical spec validation
The CLI SHALL validate specifications through the top-level `validate` command.

#### Scenario: Validate a spec
- **WHEN** executing `openspec validate <spec-id> --type spec`
- **THEN** validate the specification using the existing top-level validate behavior
- **AND** preserve `--strict` and `--json`

### Requirement: Removed spec command group
The CLI SHALL NOT register a top-level `spec` command group.

#### Scenario: Removed spec command is unavailable
- **WHEN** executing `openspec spec ...`
- **THEN** the command SHALL fail without running a spec command action or emitting the former deprecation warning
- **AND** users SHALL use the canonical verb-first commands above

### Requirement: Spec data is preserved
Removing the command group SHALL NOT delete or migrate files under `openspec/specs/`.
