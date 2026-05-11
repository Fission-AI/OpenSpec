## ADDED Requirements

### Requirement: Archive Instructions Command

The system SHALL accept `archive` as a valid subcommand of `openspec instructions`, returning archive workflow instructions alongside any injected project config.

#### Scenario: Generate archive instructions with no project config

- **WHEN** user runs `openspec instructions archive`
- **AND** no `openspec/config.yaml` exists
- **THEN** the system outputs archive workflow instructions without context or rules sections

#### Scenario: Generate archive instructions with project context

- **WHEN** user runs `openspec instructions archive`
- **AND** `openspec/config.yaml` contains a `context` field
- **THEN** the system outputs archive workflow instructions followed by a `<project_context>` section containing the config context

#### Scenario: Generate archive instructions with workflow rules

- **WHEN** user runs `openspec instructions archive`
- **AND** `openspec/config.yaml` contains `rules.archive` with one or more entries
- **THEN** the system outputs archive workflow instructions followed by a `<rules>` section listing each rule

#### Scenario: Archive instructions JSON output

- **WHEN** user runs `openspec instructions archive --json`
- **THEN** the system outputs JSON with:
  - `template`: the archive workflow instruction text
  - `context`: project context string if present in config, omitted otherwise
  - `rules`: array of rule strings from `rules.archive` if present, omitted otherwise

#### Scenario: Archive instructions JSON with no workflow rules

- **WHEN** user runs `openspec instructions archive --json`
- **AND** config has `rules` with only artifact keys (e.g. `rules.specs`) but no `rules.archive`
- **THEN** JSON output omits the `rules` field

#### Scenario: Archive instructions JSON with no context

- **WHEN** user runs `openspec instructions archive --json`
- **AND** config has no `context` field
- **THEN** JSON output omits the `context` field
