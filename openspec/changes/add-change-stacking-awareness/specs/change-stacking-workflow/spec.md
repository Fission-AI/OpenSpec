## ADDED Requirements

### Requirement: Stack Metadata Model
The system SHALL support optional metadata on active changes to express sequencing and decomposition relationships.

#### Scenario: Optional stack metadata is present
- **WHEN** a change includes stack metadata fields
- **THEN** the system SHALL parse and expose `dependsOn`, `provides`, `requires`, `touches`, and `parent`
- **AND** validation SHALL enforce deterministic formatting and value types

#### Scenario: Backward compatibility without stack metadata
- **WHEN** a change does not include stack metadata
- **THEN** existing behavior SHALL continue without migration steps
- **AND** validation SHALL not fail solely because stack metadata is absent

### Requirement: Change Dependency Graph
The system SHALL provide dependency-aware ordering for active changes.

#### Scenario: Build dependency order
- **WHEN** users request stack planning output
- **THEN** the system SHALL compute a dependency graph across active changes
- **AND** SHALL return a deterministic topological order for unblocked changes

#### Scenario: Dependency cycle detection
- **WHEN** active changes contain a dependency cycle
- **THEN** validation SHALL fail with cycle details before archive or sequencing actions proceed
- **AND** output SHALL include actionable guidance to break the cycle

