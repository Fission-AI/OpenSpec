# Artifact Queries

## Requirements

### Requirement: Ready Artifact Query
The system SHALL identify which artifacts are ready to be created based on dependency completion.

### Requirement: Completion Check
The system SHALL determine when all artifacts in a graph are complete.

### Requirement: Blocked Query
The system SHALL identify which artifacts are blocked and return all their unmet dependencies.

## Scenarios

### Ready Artifact Query

#### Scenario: Root artifacts ready initially
- **WHEN** no artifacts are completed
- **THEN** getNextArtifacts() returns artifacts with no dependencies

#### Scenario: Dependent artifact becomes ready
- **WHEN** an artifact's dependencies are all completed
- **THEN** getNextArtifacts() includes that artifact

#### Scenario: Blocked artifacts excluded
- **WHEN** an artifact has uncompleted dependencies
- **THEN** getNextArtifacts() does not include that artifact

### Completion Check

#### Scenario: All complete
- **WHEN** all artifacts in the graph are in the completed set
- **THEN** isComplete() returns true

#### Scenario: Partially complete
- **WHEN** some artifacts in the graph are not completed
- **THEN** isComplete() returns false

### Blocked Query

#### Scenario: Artifact blocked by single dependency
- **WHEN** artifact B requires artifact A and A is not complete
- **THEN** getBlocked() returns `{ B: ['A'] }`

#### Scenario: Artifact blocked by multiple dependencies
- **WHEN** artifact C requires A and B, and only A is complete
- **THEN** getBlocked() returns `{ C: ['B'] }`

#### Scenario: Artifact blocked by all dependencies
- **WHEN** artifact C requires A and B, and neither is complete
- **THEN** getBlocked() returns `{ C: ['A', 'B'] }`

## Design

These queries operate on:
- The `ArtifactGraph` (dependency structure from schema loading)
- The `CompletedSet` (current completion state from filesystem detection)

No additional design decisions required - uses data structures defined in `overview.md`.

## Tasks

### Ready Calculation
- [ ] 5.1 Implement `getNextArtifacts(graph, completed)` - find artifacts with all deps completed
- [ ] 5.2 Implement `isComplete(graph, completed)` - check if all artifacts done
- [ ] 5.3 Implement `getBlocked(graph, completed)` - return BlockedArtifacts map (artifact → unmet deps)

### Tests
- [ ] 9.13 Test: getNextArtifacts returns only root artifacts when nothing completed
- [ ] 9.14 Test: getNextArtifacts includes artifact when all deps completed
- [ ] 9.15 Test: getBlocked returns artifact with all unmet dependencies listed
- [ ] 9.16 Test: isComplete() returns true when all artifacts completed
- [ ] 9.17 Test: isComplete() returns false when some artifacts incomplete
