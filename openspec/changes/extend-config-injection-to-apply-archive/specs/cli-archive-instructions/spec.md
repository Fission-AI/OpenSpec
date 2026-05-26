## ADDED Requirements

### Requirement: Archive Instructions Command

The system SHALL accept `archive` as a valid subcommand of `openspec instructions`, returning archive workflow instructions alongside any injected project config. The `--change` option is required so the schema can be resolved for full rule key validation.

#### Scenario: Generate archive instructions with no project config

- **WHEN** user runs `openspec instructions archive --change "<name>"`
- **AND** no `openspec/config.yaml` exists
- **THEN** the system outputs archive workflow instructions without context or rules sections

#### Scenario: Generate archive instructions with project context

- **WHEN** user runs `openspec instructions archive --change "<name>"`
- **AND** `openspec/config.yaml` contains a `context` field
- **THEN** the system outputs archive workflow instructions followed by a `<project_context>` section containing the config context

#### Scenario: Generate archive instructions with workflow rules

- **WHEN** user runs `openspec instructions archive --change "<name>"`
- **AND** `openspec/config.yaml` contains `rules.archive` with one or more entries
- **THEN** the system outputs archive workflow instructions followed by a `<rules>` section listing each rule

#### Scenario: Archive instructions JSON output

- **WHEN** user runs `openspec instructions archive --change "<name>" --json`
- **THEN** the system outputs JSON with:
  - `context`: project context string if present in config, omitted otherwise
  - `rules`: array of rule strings from `rules.archive` if present, omitted otherwise
- **AND** the JSON output omits the static archive workflow template

#### Scenario: Archive instructions JSON with no workflow rules

- **WHEN** user runs `openspec instructions archive --change "<name>" --json`
- **AND** config has `rules` with only artifact keys (e.g. `rules.specs`) but no `rules.archive`
- **THEN** JSON output omits the `rules` field

#### Scenario: Archive instructions JSON with no context

- **WHEN** user runs `openspec instructions archive --change "<name>" --json`
- **AND** config has no `context` field
- **THEN** JSON output omits the `context` field

#### Scenario: Archive instructions JSON with no injected config

- **WHEN** user runs `openspec instructions archive --change "<name>" --json`
- **AND** config has no `context` field
- **AND** config has no `rules.archive`
- **THEN** JSON output is an empty object

#### Scenario: Unknown rule key warning during archive instructions

- **WHEN** user runs `openspec instructions archive --change "<name>"`
- **AND** config has `rules` with a key that is neither a valid artifact ID nor a valid workflow target
- **THEN** the system emits a warning identifying the unknown key and listing valid keys
- **AND** archive instructions are still generated
