## ADDED Requirements

### Requirement: Change Metadata Priority and Author
The system SHALL support optional `priority` and `author` fields in a change's metadata.

#### Scenario: Priority accepted
- **WHEN** a change's `.openspec.yaml` sets `priority` to one of `low`, `medium`, or `high`
- **THEN** metadata validation accepts the value

#### Scenario: Invalid priority rejected
- **WHEN** a change's `.openspec.yaml` sets `priority` to a value other than `low`, `medium`, or `high`
- **THEN** metadata validation rejects the value

#### Scenario: Author auto-populated from git config
- **WHEN** `createChange` is called without an explicit `author` and `git config user.name` resolves to a non-empty value
- **THEN** the created change's `.openspec.yaml` includes that value as `author`

#### Scenario: Explicit author takes precedence
- **WHEN** `createChange` is called with an explicit `author` option
- **THEN** the created change's `.openspec.yaml` uses the provided value instead of `git config user.name`

#### Scenario: No git config available
- **WHEN** `createChange` is called without an explicit `author` and `git config user.name` is unset or git is unavailable
- **THEN** the created change's `.openspec.yaml` omits the `author` field
