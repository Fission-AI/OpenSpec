## ADDED Requirements

### Requirement: Schema which reports Store-backed schemas

The CLI SHALL report Store provenance when a schema resolves from the configured schema Store.

#### Scenario: Human output identifies schema Store
- **WHEN** a user runs `openspec schema which qeda-sdd`
- **AND** `qeda-sdd` resolves from schema Store `department-schemas`
- **THEN** output SHALL identify source `store`
- **AND** SHALL identify Store ID `department-schemas`
- **AND** SHALL display the canonical schema directory path

#### Scenario: JSON output identifies schema Store
- **WHEN** a user runs `openspec schema which qeda-sdd --json`
- **AND** the schema resolves from a schema Store
- **THEN** JSON SHALL contain `source: "store"`
- **AND** SHALL contain `storeId`
- **AND** SHALL preserve the existing `name`, `path`, and `shadows` fields

#### Scenario: List mode applies visibility
- **WHEN** a user runs `openspec schema which --all`
- **THEN** output SHALL include visible schema Store schemas
- **AND** SHALL exclude Store schemas hidden by the consumer allowlist

#### Scenario: Shadow output identifies lower sources
- **WHEN** a Store schema shadows user or package schemas
- **THEN** `schema which` SHALL identify the Store schema as active
- **AND** SHALL list lower-precedence sources in existing precedence order
