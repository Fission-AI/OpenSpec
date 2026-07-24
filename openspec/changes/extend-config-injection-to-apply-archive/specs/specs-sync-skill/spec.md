## ADDED Requirements

### Requirement: Carry artifact rules into standalone spec sync

The `/opsx:sync` skill SHALL resolve the artifact that owns each delta spec and SHALL apply that artifact's current rules before writing a main spec.

#### Scenario: Resolve owning artifacts from concrete status paths

- **WHEN** standalone sync discovers concrete delta spec paths for a selected change
- **THEN** it matches each path against `artifactPaths.<id>.existingOutputPaths` from that change's status output
- **AND** requires each path to match exactly one owning artifact ID
- **AND** groups delta paths by owner instead of assuming the owner ID is `specs`

#### Scenario: Standalone sync fetches current artifact rules

- **WHEN** standalone sync is ready to merge one or more delta groups
- **THEN** it requests current instructions once for each owning artifact ID using the selected change and planning root
- **AND** applies only the returned artifact rules to main specs produced from that owner's delta paths
- **AND** keeps artifact rules separate from operation guidance and unrelated workflow steps

#### Scenario: Owning artifact is missing or ambiguous

- **WHEN** a concrete delta spec path matches zero or multiple artifact IDs
- **THEN** the skill reports the path and candidate owners
- **AND** stops before writing any main spec

#### Scenario: Archive supplies an artifact-rule snapshot

- **WHEN** the sync workflow is invoked inline by archive with an owner-to-rules snapshot from current artifact instructions
- **THEN** it reuses that supplied snapshot
- **AND** does not fetch the same artifact instructions again

#### Scenario: Artifact rules are absent

- **WHEN** current instructions contain no rules for an owning artifact
- **THEN** the existing semantic merge behavior continues unchanged for that artifact
