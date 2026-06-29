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

### Requirement: Status Includes Staleness Signal

The system SHALL include a per-artifact staleness signal in the `openspec status --json` output.

#### Scenario: Stale artifact flagged in JSON

- **WHEN** an artifact's output is older than an upstream it transitively requires
- **THEN** that artifact's status JSON includes `stale: true`
- **AND** includes `staleAgainst` listing the upstream artifact ids it is stale against

#### Scenario: Fresh artifact reports not stale

- **WHEN** an artifact is newer than all of its dependencies
- **THEN** its status JSON includes `stale: false` and an empty `staleAgainst`

### Requirement: Downstream Impact Query

The system SHALL provide an impact selector on the status command that returns the downstream artifacts affected by a change to a given artifact, in revisit (topological) order.

#### Scenario: Impact returns ordered downstream set

- **WHEN** the user runs `openspec status --change <id> --impact <artifact> --json`
- **THEN** the output lists the transitive downstream dependents of `<artifact>` in topological order
- **AND** the listed artifacts include their resolved output paths so a consumer can read and rewrite them

#### Scenario: Impact on a leaf artifact

- **WHEN** the impact selector targets an artifact with no dependents
- **THEN** the downstream set is empty

#### Scenario: Impact on an unknown artifact

- **WHEN** the impact selector names an artifact id not in the change's schema
- **THEN** the command reports an error identifying the unknown artifact id

#### Scenario: Default human-readable output is unchanged

- **WHEN** the user runs `openspec status --change <id>` without `--json` or `--impact`
- **THEN** the default human-readable status output is unchanged from prior behavior
