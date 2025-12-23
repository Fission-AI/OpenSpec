## ADDED Requirements

### Requirement: Schema Loading
The system SHALL load artifact graph definitions from YAML schema files.

#### Scenario: Valid schema loaded
- **WHEN** a valid schema YAML file is provided
- **THEN** the system returns an ArtifactGraph with all artifacts and dependencies

#### Scenario: Invalid schema rejected
- **WHEN** a schema YAML file is missing required fields
- **THEN** the system throws an error with a descriptive message

#### Scenario: Cyclic dependencies detected
- **WHEN** a schema contains cyclic artifact dependencies
- **THEN** the system throws an error identifying the cycle

### Requirement: Build Order Calculation
The system SHALL compute a valid topological build order for artifacts.

#### Scenario: Linear dependency chain
- **WHEN** artifacts form a linear chain (A → B → C)
- **THEN** getBuildOrder() returns [A, B, C]

#### Scenario: Diamond dependency
- **WHEN** artifacts form a diamond (A → B, A → C, B → D, C → D)
- **THEN** getBuildOrder() returns A before B and C, and D last

#### Scenario: Independent artifacts
- **WHEN** artifacts have no dependencies
- **THEN** getBuildOrder() returns them in a stable order

### Requirement: State Detection
The system SHALL detect artifact completion state by scanning the filesystem.

#### Scenario: Simple file exists
- **WHEN** an artifact generates "proposal.md" and the file exists
- **THEN** the artifact is marked as completed

#### Scenario: Simple file missing
- **WHEN** an artifact generates "proposal.md" and the file does not exist
- **THEN** the artifact is not marked as completed

#### Scenario: Glob pattern with files
- **WHEN** an artifact generates "specs/*.md" and the specs/ directory contains .md files
- **THEN** the artifact is marked as completed

#### Scenario: Glob pattern empty
- **WHEN** an artifact generates "specs/*.md" and the specs/ directory is empty or missing
- **THEN** the artifact is not marked as completed

### Requirement: Ready Artifact Query
The system SHALL identify which artifacts are ready to be created based on dependency completion.

#### Scenario: Root artifacts ready initially
- **WHEN** no artifacts are completed
- **THEN** getNextArtifacts() returns artifacts with no dependencies

#### Scenario: Dependent artifact becomes ready
- **WHEN** an artifact's dependencies are all completed
- **THEN** getNextArtifacts() includes that artifact

#### Scenario: Blocked artifacts excluded
- **WHEN** an artifact has uncompleted dependencies
- **THEN** getNextArtifacts() does not include that artifact

### Requirement: Completion Check
The system SHALL determine when all artifacts in a graph are complete.

#### Scenario: All complete
- **WHEN** all artifacts in the graph are in the completed set
- **THEN** isComplete() returns true

#### Scenario: Partially complete
- **WHEN** some artifacts in the graph are not completed
- **THEN** isComplete() returns false

### Requirement: Blocked Query
The system SHALL identify which artifacts are blocked and what they're waiting for.

#### Scenario: Artifact blocked by single dependency
- **WHEN** artifact B requires artifact A and A is not complete
- **THEN** getBlocked() returns B with A as the blocking dependency

#### Scenario: Artifact blocked by multiple dependencies
- **WHEN** artifact C requires A and B, and only A is complete
- **THEN** getBlocked() returns C with B as the blocking dependency
