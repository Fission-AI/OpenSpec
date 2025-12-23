# Build Order Calculation

## Requirement

The system SHALL compute a valid topological build order for artifacts.

## Scenarios

### Scenario: Linear dependency chain
- **WHEN** artifacts form a linear chain (A → B → C)
- **THEN** getBuildOrder() returns [A, B, C]

### Scenario: Diamond dependency
- **WHEN** artifacts form a diamond (A → B, A → C, B → D, C → D)
- **THEN** getBuildOrder() returns A before B and C, and D last

### Scenario: Independent artifacts
- **WHEN** artifacts have no dependencies
- **THEN** getBuildOrder() returns them in a stable order

## Design

### Decision: Kahn's Algorithm for Topological Sort
Use Kahn's algorithm for computing build order.

**Rationale:**
- Well-understood, O(V+E) complexity
- Naturally detects cycles during execution
- Produces a stable, deterministic order

## Tasks

### Artifact Graph Core
- [ ] 3.1 Create `src/core/artifact-graph/graph.ts` with ArtifactGraph class
- [ ] 3.2 Implement `fromYaml(path)` - load graph from schema file
- [ ] 3.3 Implement `getBuildOrder()` - topological sort via Kahn's algorithm
- [ ] 3.4 Implement `getArtifact(id)` - retrieve single artifact definition
- [ ] 3.5 Implement `getAllArtifacts()` - list all artifacts

### Tests
- [ ] 9.6 Test: Compute build order returns correct topological ordering (linear chain)
- [ ] 9.7 Test: Compute build order handles diamond dependencies correctly
- [ ] 9.8 Test: Independent artifacts return in stable order
