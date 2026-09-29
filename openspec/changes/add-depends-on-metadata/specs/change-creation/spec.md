## ADDED Requirements

### Requirement: Change Metadata Dependencies
The system SHALL support an optional `depends_on` field in a change's metadata, naming other changes it builds on.

#### Scenario: Depends_on accepted
- **WHEN** a change's `.openspec.yaml` sets `depends_on` to an array of kebab-case change names
- **THEN** metadata validation accepts the value

#### Scenario: Non-kebab-case entry rejected
- **WHEN** a change's `.openspec.yaml` sets `depends_on` to an array containing a value that is not kebab-case
- **THEN** metadata validation rejects the value

#### Scenario: Empty depends_on omitted safely
- **WHEN** a change's `.openspec.yaml` does not set `depends_on`
- **THEN** metadata validation accepts the change exactly as before this field existed

### Requirement: Create Change Dependency Option
`createChange` SHALL accept an optional list of dependency names and validate each against the currently active changes.

#### Scenario: Valid dependency recorded
- **WHEN** `createChange` is called with `--depends-on` naming one or more changes that are currently active
- **THEN** the created change's `.openspec.yaml` includes those names as `depends_on`

#### Scenario: Unknown dependency rejected
- **WHEN** `createChange` is called with `--depends-on` naming a change that is not currently active (never existed, misspelled, or already archived)
- **THEN** the system throws a validation error identifying the unrecognized name, and no change is created

#### Scenario: Self-dependency rejected
- **WHEN** `createChange` is called with `--depends-on` naming the change being created
- **THEN** the system throws a validation error, and no change is created

#### Scenario: No dependency option provided
- **WHEN** `createChange` is called without `--depends-on`
- **THEN** the created change's `.openspec.yaml` omits the `depends_on` field
