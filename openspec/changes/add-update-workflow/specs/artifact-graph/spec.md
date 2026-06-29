## ADDED Requirements

### Requirement: Direct Dependent Query

The system SHALL identify which artifacts directly depend on a given artifact (the reverse of the `requires` relationship).

#### Scenario: Artifact with dependents

- **WHEN** artifact B requires artifact A and getDependents("A") is called
- **THEN** the result includes B

#### Scenario: Artifact with no dependents

- **WHEN** no artifact requires artifact T and getDependents("T") is called
- **THEN** the result is empty

#### Scenario: Unknown artifact id

- **WHEN** getDependents() is called with an id not present in the schema
- **THEN** the system throws an error identifying the unknown id

### Requirement: Transitive Downstream Query

The system SHALL compute the transitive set of artifacts that depend on a given artifact, returned in topological order so each artifact appears after the upstreams it depends on.

#### Scenario: Linear chain downstream

- **WHEN** artifacts form a linear chain (A → B → C) and getDownstream("A") is called
- **THEN** the result is [B, C] in that order

#### Scenario: Diamond downstream order

- **WHEN** artifacts form a diamond (A → B, A → C, B → D, C → D) and getDownstream("A") is called
- **THEN** the result includes B and C before D

#### Scenario: Leaf artifact has no downstream

- **WHEN** getDownstream() is called on an artifact with no dependents
- **THEN** the result is empty

#### Scenario: Downstream excludes the artifact itself

- **WHEN** getDownstream("A") is called
- **THEN** the result does not include A

### Requirement: Artifact Staleness Detection

The system SHALL detect whether an artifact is stale relative to its dependencies by comparing filesystem modification times along the schema's `requires` edges. An artifact is stale when its output was last modified before the most recently modified output among the artifacts it transitively requires.

#### Scenario: Upstream modified after downstream

- **WHEN** an upstream dependency's output was modified more recently than an artifact that (transitively) requires it
- **THEN** the artifact is reported as stale
- **AND** the upstream is listed among the artifacts it is stale against

#### Scenario: Artifact newer than all upstreams

- **WHEN** an artifact's output was modified more recently than every artifact it requires
- **THEN** the artifact is not reported as stale

#### Scenario: Glob output uses newest matching file

- **WHEN** an artifact generates a glob pattern (e.g. `specs/**/*.md`) with multiple files
- **THEN** staleness uses the most recently modified matching file as the artifact's modification time

#### Scenario: Missing output is not stale

- **WHEN** an artifact's output does not exist on disk
- **THEN** the artifact is reported as not present rather than stale

#### Scenario: Root artifact is never stale

- **WHEN** an artifact has no dependencies
- **THEN** it is never reported as stale
