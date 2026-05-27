# Delta: Pastelsdd Conventions — Verb–Noun CLI Design

## ADDED Requirements

### Requirement: Verb–Noun CLI Command Structure
Pastelsdd CLI design SHALL use verbs as top-level commands with nouns provided as arguments or flags for scoping.

#### Scenario: Verb-first command discovery
- **WHEN** a user runs a command like `pastelsdd list`
- **THEN** the verb communicates the action clearly
- **AND** nouns refine scope via flags or arguments (e.g., `--changes`, `--specs`)

#### Scenario: Backward compatibility for noun commands
- **WHEN** users run noun-prefixed commands such as `pastelsdd spec ...` or `pastelsdd change ...`
- **THEN** the CLI SHALL continue to support them for at least one release
- **AND** display a deprecation warning that points to verb-first alternatives

#### Scenario: Disambiguation guidance
- **WHEN** item names are ambiguous between changes and specs
- **THEN** `pastelsdd show` and `pastelsdd validate` SHALL accept `--type spec|change`
- **AND** the help text SHALL document this clearly


