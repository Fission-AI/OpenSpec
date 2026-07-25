## ADDED Requirements

### Requirement: Carry artifact rules into standalone spec sync

The `/opsx:sync` skill SHALL use the selected change's concrete `specs` artifact outputs as its delta-spec input and SHALL apply current `specs` artifact rules before writing a main spec.

#### Scenario: Discover delta specs from status

- **WHEN** standalone sync assesses a selected change
- **THEN** it uses `artifactPaths.specs.existingOutputPaths` from that change's status output as the complete delta-spec input
- **AND** does not infer delta specs from other artifacts

#### Scenario: Standalone sync fetches current artifact rules

- **WHEN** `artifactPaths.specs.existingOutputPaths` contains one or more delta specs
- **THEN** standalone sync requests `openspec instructions specs --change "<name>" --json` once using the selected change and planning root
- **AND** applies only the returned artifact rules to main specs produced from those delta paths
- **AND** keeps artifact rules separate from operation guidance and unrelated workflow steps

#### Scenario: Specs instruction lookup fails

- **WHEN** `openspec instructions specs --change "<name>" --json` exits non-zero or does not return valid artifact-instruction JSON
- **THEN** standalone sync reports the instruction lookup error
- **AND** stops before writing any main spec
- **AND** does not treat the failed lookup as an absent artifact rule set

#### Scenario: Schema or change has no specs outputs

- **WHEN** `artifactPaths.specs` is absent or its `existingOutputPaths` list is empty
- **THEN** standalone sync reports that there are no delta specs to sync
- **AND** does not request artifact instructions or write a main spec

#### Scenario: Archive supplies an artifact-rule snapshot

- **WHEN** the sync workflow is invoked inline by archive with a specs-rule snapshot from current artifact instructions
- **THEN** it reuses that supplied snapshot
- **AND** does not fetch `specs` artifact instructions again

#### Scenario: Artifact rules are absent

- **WHEN** current `specs` instructions contain no rules
- **THEN** the existing semantic merge behavior continues unchanged
