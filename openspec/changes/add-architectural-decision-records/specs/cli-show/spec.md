## ADDED Requirements

### Requirement: Show ADR Details

The `openspec show` command SHALL support displaying Architectural Decision Records (ADRs) with options for summary or full detail.

#### Scenario: Showing ADR summary by default

- **WHEN** running `openspec show [decision-name] --type adr`
- **THEN** the command SHALL display the decision.md file (concise summary)
- **AND** include: Status, Scope, What, Key Trade-offs, and reference to full ADR
- **AND** format the output for readability in the terminal

#### Scenario: Showing full ADR with rationale

- **WHEN** running `openspec show [decision-name] --type adr --full`
- **THEN** the command SHALL display the adr.md file (full rationale)
- **AND** include all sections: Context, Options Considered, Decision Rationale, Consequences, References
- **AND** format the output for readability in the terminal

#### Scenario: Auto-detecting ADR vs spec

- **WHEN** running `openspec show [name]` without --type flag
- **THEN** the command SHALL check both `specs/` and `adrs/` directories
- **AND** if the name exists in only one location, display that item
- **AND** if the name exists in both locations, prompt user to disambiguate or suggest using `--type`

#### Scenario: Showing ADR with JSON output

- **WHEN** running `openspec show [decision-name] --type adr --json`
- **THEN** the command SHALL output the ADR in JSON format
- **AND** include fields: `name`, `path`, `content`, `sections`
- **AND** parse sections into structured JSON if possible

#### Scenario: ADR not found

- **WHEN** running `openspec show [decision-name] --type adr` and the ADR doesn't exist
- **THEN** the command SHALL display an error message
- **AND** suggest similar ADR names if any exist
- **AND** exit with status code 1 (error)

#### Scenario: Showing ADR delta in a change

- **WHEN** running `openspec show [change-name] --json --deltas-only`
- **THEN** the command SHALL include ADR deltas alongside spec deltas
- **AND** distinguish ADR deltas from spec deltas in the output
- **AND** show ADDED, MODIFIED, REMOVED, and RENAMED decisions
