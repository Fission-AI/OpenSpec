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

The system SHALL compute a deterministic content digest for an artifact from its output file(s), such that the same content yields the same digest on every run and on every platform. For an artifact with multiple output files (a glob), the digest SHALL be computed over the files ordered by their change-relative path expressed with forward slashes, and SHALL incorporate each file's relative path together with its content, so that the digest is stable regardless of the operating system's absolute-path sorting, separators, or drive letters. Content SHALL be line-ending-normalized (CRLF to LF) before hashing so that otherwise-identical content produces an identical digest regardless of encoding.

#### Scenario: Identical content yields identical digest

- **WHEN** an artifact's output content is unchanged between two computations
- **THEN** the digest is identical

#### Scenario: Changed content yields a different digest

- **WHEN** an artifact's output content changes
- **THEN** the digest changes

#### Scenario: Line endings do not affect the digest

- **WHEN** the same content is encoded with CRLF on one platform and LF on another
- **THEN** the digest is identical on both

#### Scenario: Glob output digest is stable across platforms

- **WHEN** an artifact generates a glob pattern (e.g. `specs/**/*.md`) with multiple files
- **THEN** the digest orders the files by change-relative forward-slash path before hashing
- **AND** the digest is identical on Windows and POSIX for the same file set and contents

#### Scenario: Renaming a file within a glob changes the digest

- **WHEN** a file in a glob artifact is renamed or moved (same total content, different relative path)
- **THEN** the digest changes, because the relative path is part of the hash

#### Scenario: Missing output has no digest

- **WHEN** an artifact's output does not exist on disk
- **THEN** no digest is reported for that artifact
