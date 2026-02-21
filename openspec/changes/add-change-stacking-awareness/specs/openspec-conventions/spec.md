## ADDED Requirements

### Requirement: Stack-Aware Change Planning Conventions
OpenSpec conventions SHALL define optional metadata fields for sequencing and decomposition across concurrent changes.

#### Scenario: Declaring change dependencies
- **WHEN** authors need to sequence related changes
- **THEN** conventions SHALL define how to declare dependencies and provided/required capability markers
- **AND** validation guidance SHALL distinguish hard blockers from soft overlap warnings

#### Scenario: Dependency source of truth during migration
- **WHEN** both stack metadata and `openspec/changes/IMPLEMENTATION_ORDER.md` are present
- **THEN** conventions SHALL treat per-change stack metadata as the normative dependency source
- **AND** `IMPLEMENTATION_ORDER.md` SHALL be treated as optional narrative guidance

#### Scenario: Explicit ordering remains required for capability markers
- **WHEN** authors use `provides` and `requires` markers to describe capability contracts
- **THEN** conventions SHALL require explicit `dependsOn` edges for ordering relationships
- **AND** conventions SHALL prohibit treating `requires` as an implicit dependency edge

#### Scenario: Declaring advisory overlap via touches
- **WHEN** a change may affect capability/spec areas shared by concurrent changes without requiring ordering
- **THEN** conventions SHALL allow authors to declare `touches` with advisory area identifiers (for example capability IDs, spec area names, or paths)
- **AND** tooling SHALL treat `touches` as informational only (no implicit dependency edge, non-blocking validation signal)

#### Scenario: Declaring parent-child split structure
- **WHEN** a large change is decomposed into smaller slices
- **THEN** conventions SHALL define parent-child metadata and expected ordering semantics
- **AND** docs SHALL describe when to split versus keep a single change
