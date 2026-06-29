## ADDED Requirements

### Requirement: List ADRs

The `openspec list` command SHALL support listing Architectural Decision Records (ADRs) alongside changes and specs.

#### Scenario: Listing all ADRs

- **WHEN** running `openspec list --adrs`
- **THEN** the command SHALL display all ADRs in the `openspec/adrs/` directory
- **AND** show the decision name for each ADR
- **AND** format the output in a readable table or list format

#### Scenario: Listing ADRs with details

- **WHEN** running `openspec list --adrs --long`
- **THEN** the command SHALL display ADRs with additional details
- **AND** include the ADR title from the `# ADR:` header
- **AND** optionally show a brief summary or first line of context

#### Scenario: Combined listing of specs and ADRs

- **WHEN** running `openspec list --specs --adrs`
- **THEN** the command SHALL display both specs and ADRs
- **AND** clearly distinguish between specs and ADRs (e.g., with prefixes or separate sections)
- **AND** maintain separate counts for specs and ADRs

#### Scenario: JSON output for ADRs

- **WHEN** running `openspec list --adrs --json`
- **THEN** the command SHALL output ADRs in JSON format
- **AND** include fields: `name`, `path`, `title`
- **AND** the output SHALL be parseable for scripting

#### Scenario: No ADRs exist

- **WHEN** running `openspec list --adrs` and no ADRs exist
- **THEN** the command SHALL display a message indicating no ADRs found
- **AND** exit with status code 0 (success)
