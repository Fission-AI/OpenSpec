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

### Requirement: Capability marker and overlap semantics
The system SHALL treat capability markers as validation contracts and `touches` as advisory overlap signals.

#### Scenario: Required capability provided by an active change
- **WHEN** change B declares `requires` marker `X`
- **AND** active change A declares `provides` marker `X`
- **THEN** validation SHALL require B to declare an explicit ordering edge in `dependsOn` to at least one active provider of `X`
- **AND** validation SHALL fail if no explicit dependency is declared

#### Scenario: Requires marker without active provider
- **WHEN** a change declares a `requires` marker
- **AND** no active change declares the corresponding `provides` marker
- **THEN** validation SHALL NOT infer an implicit dependency edge
- **AND** ordering SHALL continue to be determined solely by explicit `dependsOn` relationships

#### Scenario: Overlap warning for shared touches
- **WHEN** multiple active changes declare overlapping `touches` values
- **THEN** validation SHALL emit a warning listing the overlapping changes and touched areas
- **AND** validation SHALL NOT fail solely on overlap
