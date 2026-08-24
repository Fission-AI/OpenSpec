## ADDED Requirements

### Requirement: Schema which reports remote resolution without network access

The CLI SHALL report a locked remote schema as source `remote`, include its cache path and immutable lock metadata in JSON output, and perform no Git or network operation while inspecting it.

#### Scenario: Remote schema is active
- **WHEN** a user runs `openspec schema which qeda-sdd` for a valid locked remote schema
- **THEN** human output SHALL report source `remote`, cache path, requested ref, and resolved commit

#### Scenario: Remote schema JSON
- **WHEN** a user runs `openspec schema which qeda-sdd --json`
- **THEN** JSON SHALL include `name`, `source`, `path`, `requestedRef`, `resolvedCommit`, `bundlePath`, `integrity`, and `shadows`

#### Scenario: Project schema conflicts with remote
- **WHEN** a project-local schema and declared remote source share a name
- **THEN** the command SHALL report `schema_name_conflict`
- **AND** it SHALL NOT report either schema as active or shadowed

#### Scenario: Declared remote cache is unavailable
- **WHEN** a user inspects a declared remote schema whose lock or cache is unusable
- **THEN** the command SHALL exit non-zero with the applicable synchronization fix
- **AND** it SHALL not silently report a same-named user or package schema as active

#### Scenario: All-schema inspection contains one unavailable remote
- **WHEN** a user runs `openspec schema which --all`
- **AND** one declared remote schema is unavailable while other schemas are usable
- **THEN** the command SHALL return one unavailable entry with a structured status for that remote
- **AND** it SHALL continue returning every usable schema

#### Scenario: All-schema JSON diagnostics
- **WHEN** a user runs `openspec schema which --all --json` with an unavailable remote
- **THEN** stdout SHALL contain one JSON document with available and unavailable entries
- **AND** each unavailable entry SHALL include a stable error code and actionable message
