## ADDED Requirements

### Requirement: Stack Metadata Model
The system SHALL support optional metadata on active changes to express sequencing and decomposition relationships.

#### Scenario: Optional stack metadata is present
- **WHEN** a change includes stack metadata fields
- **THEN** the system SHALL parse and expose `dependsOn`, `provides`, `requires`, `touches`, and `parent`
- **AND** validation SHALL enforce normalized field shapes and value types (`dependsOn`/`provides`/`requires`/`touches` as string arrays, `parent` as string when present)

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

#### Scenario: Tie-breaking within the same dependency depth
- **WHEN** multiple unblocked changes share the same topological dependency depth
- **THEN** ordering SHALL break ties lexicographically by change ID
- **AND** repeated runs over the same input SHALL return the same order

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

#### Scenario: Requires marker satisfied by archived history
- **WHEN** a change declares a `requires` marker
- **AND** no active change provides that marker
- **AND** at least one archived change in history provides that marker
- **THEN** validation SHALL NOT warn solely about missing provider
- **AND** SHALL continue to use explicit `dependsOn` for active ordering

#### Scenario: Requires marker missing in full history
- **WHEN** a change declares a `requires` marker
- **AND** no active or archived change in history provides that marker
- **THEN** validation SHALL emit a non-blocking warning naming the change and missing marker
- **AND** SHALL NOT infer an implicit dependency edge

#### Scenario: Overlap warning for shared touches
- **WHEN** multiple active changes declare overlapping `touches` values
- **THEN** validation SHALL emit a warning listing the overlapping changes and touched areas
- **AND** validation SHALL NOT fail solely on overlap
