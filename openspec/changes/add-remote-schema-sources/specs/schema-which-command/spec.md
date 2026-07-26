## ADDED Requirements

### Requirement: Schema which reports remote resolution without network access

The CLI SHALL report a locked remote schema as source `remote`, include its cache path and immutable lock metadata in JSON output, and perform no Git or network operation while inspecting it.

#### Scenario: Remote schema is active
- **WHEN** a user runs `openspec schema which qeda-sdd` for a valid locked remote schema
- **THEN** human output SHALL report source `remote`, cache path, requested ref, and resolved commit

#### Scenario: Remote schema JSON
- **WHEN** a user runs `openspec schema which qeda-sdd --json`
- **THEN** JSON SHALL include `name`, `source`, `path`, `requestedRef`, `resolvedCommit`, `bundlePath`, `integrity`, and `shadows`

#### Scenario: Project schema shadows remote
- **WHEN** a project-local schema and valid remote source share a name
- **THEN** the project schema SHALL be active
- **AND** remote source and cache details SHALL appear in shadowing information before any user or package shadow

#### Scenario: Declared remote cache is unavailable
- **WHEN** a user inspects a declared remote schema whose lock or cache is unusable
- **THEN** the command SHALL exit non-zero with the applicable synchronization fix
- **AND** it SHALL not silently report a same-named user or package schema as active
