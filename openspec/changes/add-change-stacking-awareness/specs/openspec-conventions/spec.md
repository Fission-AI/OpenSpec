## ADDED Requirements

### Requirement: Stack-Aware Change Planning Conventions
OpenSpec conventions SHALL define optional metadata fields for sequencing and decomposition across concurrent changes.

#### Scenario: Declaring change dependencies
- **WHEN** authors need to sequence related changes
- **THEN** conventions SHALL define how to declare dependencies and provided/required capability markers
- **AND** validation guidance SHALL distinguish hard blockers from soft overlap warnings

#### Scenario: Declaring parent-child split structure
- **WHEN** a large change is decomposed into smaller slices
- **THEN** conventions SHALL define parent-child metadata and expected ordering semantics
- **AND** docs SHALL describe when to split versus keep a single change

