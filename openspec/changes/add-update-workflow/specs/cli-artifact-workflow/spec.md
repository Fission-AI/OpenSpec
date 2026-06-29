## ADDED Requirements

### Requirement: Status Includes Dependency Edges

The system SHALL include each artifact's dependency edges in the `openspec status --json` output, so consumers can determine how artifacts relate without hardcoding artifact names.

#### Scenario: Status JSON exposes requires and dependents

- **WHEN** the user runs `openspec status --change <id> --json`
- **THEN** each artifact in the `artifacts` array includes a `requires` array (the artifact ids it depends on)
- **AND** each artifact includes a `dependents` array (the artifact ids that directly depend on it)

#### Scenario: Edges reflect the active schema

- **WHEN** the change uses a custom schema with non-default artifact ids
- **THEN** the `requires` and `dependents` edges in the status output use that schema's artifact ids

### Requirement: Status Includes Content Digest and Drift

The system SHALL include a deterministic per-artifact content digest in the `openspec status --json` output, and a drift signal computed by comparing each artifact's recorded upstream-digest baseline against the current upstream digests, so consumers can detect content changes reproducibly without relying on filesystem timestamps. The system SHALL provide a way to record the baseline so the drift signal has a deterministic reference.

#### Scenario: Present artifact reports a digest

- **WHEN** the user runs `openspec status --change <id> --json` and an artifact's output exists
- **THEN** that artifact's status JSON includes a `digest` derived from its output content

#### Scenario: Digest is stable across runs

- **WHEN** `openspec status --change <id> --json` is run twice without the artifact's content changing
- **THEN** the artifact's `digest` is identical between runs

#### Scenario: Missing output reports no digest

- **WHEN** an artifact's output does not exist
- **THEN** the artifact's status JSON omits `digest` (or reports it as null)

#### Scenario: Recording a baseline

- **WHEN** the user runs `openspec status --change <id> --record <artifact>`
- **THEN** the system records the current digests of that artifact's direct upstream dependencies as its baseline

#### Scenario: Drift reported against a recorded baseline

- **WHEN** an upstream dependency's current digest differs from the value recorded in an artifact's baseline
- **THEN** the artifact's status JSON reports it as drifted, listing the upstream ids whose digest changed

#### Scenario: Drift is unknown without a baseline

- **WHEN** an artifact has no recorded baseline
- **THEN** the artifact's status JSON reports drift as `unknown` rather than drifted or clean

### Requirement: Downstream Impact Query

The system SHALL provide an impact selector on the status command that returns the downstream artifacts affected by a change to a given artifact, in revisit (topological) order.

#### Scenario: Impact returns ordered downstream set

- **WHEN** the user runs `openspec status --change <id> --impact <artifact> --json`
- **THEN** the output lists the transitive downstream dependents of `<artifact>` in topological (build) order
- **AND** the listed artifacts include their resolved output paths and content digests so a consumer can read and rewrite them

#### Scenario: Impact ordering is deterministic

- **WHEN** the impact query is run repeatedly for the same change and artifact
- **THEN** the downstream set and its order are identical every time

#### Scenario: Impact entries indicate which downstream artifacts exist

- **WHEN** some transitive downstream artifacts have not been created yet
- **THEN** each impact entry reports its status (e.g. done vs. not-yet-created)
- **AND** a consumer can tell which downstream artifacts exist to revise versus which would need to be created

#### Scenario: Impact on a leaf artifact

- **WHEN** the impact selector targets an artifact with no dependents
- **THEN** the downstream set is empty

#### Scenario: Impact on an unknown artifact

- **WHEN** the impact selector names an artifact id not in the change's schema
- **THEN** the command reports an error identifying the unknown artifact id

#### Scenario: Default human-readable output is unchanged

- **WHEN** the user runs `openspec status --change <id>` without `--json` or `--impact`
- **THEN** the default human-readable status output is unchanged from prior behavior
