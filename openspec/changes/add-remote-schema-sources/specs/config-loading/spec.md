## ADDED Requirements

### Requirement: Parse remote schema source declarations independently

The system SHALL parse `schemaSources` as a map from valid schema names to Git source declarations while preserving valid unrelated project configuration when individual declarations are invalid.

#### Scenario: Valid source map
- **WHEN** config contains `schemaSources.qeda-sdd` with non-empty `git`, `ref`, and `path` strings
- **THEN** the returned project configuration SHALL include the normalized `qeda-sdd` source declaration

#### Scenario: Invalid schema source name
- **WHEN** a `schemaSources` key is not a valid kebab-case schema name
- **THEN** that source SHALL be omitted with a warning
- **AND** valid schema, context, rules, references, store, and other valid source fields SHALL remain available

#### Scenario: Invalid source member
- **WHEN** one source has a missing or non-string `git`, `ref`, or `path` member
- **THEN** that source SHALL be omitted with a warning naming the source and invalid member
- **AND** other valid sources SHALL remain available

#### Scenario: Credential-bearing HTTPS URL
- **WHEN** a source contains an HTTPS URL with user information
- **THEN** that source SHALL be omitted with a credential-safe warning
- **AND** the warning SHALL not repeat the credential-bearing URL

#### Scenario: Source name prototype key
- **WHEN** `schemaSources` contains a key capable of mutating object prototypes
- **THEN** the key SHALL be rejected through explicit key comparison
- **AND** parsing SHALL not change any object prototype
