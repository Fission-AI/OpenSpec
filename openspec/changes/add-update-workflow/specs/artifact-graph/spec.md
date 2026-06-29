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

### Requirement: Artifact Content Digest

The system SHALL compute a deterministic content digest for an artifact from the bytes of its output file(s), such that the same content yields the same digest on every run and on every platform. The digest SHALL normalize line endings before hashing so that otherwise-identical content produces an identical digest regardless of CRLF or LF encoding.

#### Scenario: Identical content yields identical digest

- **WHEN** an artifact's output content is unchanged between two computations
- **THEN** the digest is identical

#### Scenario: Changed content yields a different digest

- **WHEN** an artifact's output content changes
- **THEN** the digest changes

#### Scenario: Line endings do not affect the digest

- **WHEN** the same content is encoded with CRLF on one platform and LF on another
- **THEN** the digest is identical on both

#### Scenario: Glob output digests all matching files deterministically

- **WHEN** an artifact generates a glob pattern (e.g. `specs/**/*.md`) with multiple files
- **THEN** the digest is computed over the matching files in a deterministic order
- **AND** the digest is stable across runs

#### Scenario: Missing output has no digest

- **WHEN** an artifact's output does not exist on disk
- **THEN** no digest is reported for that artifact
