## ADDED Requirements
### Requirement: Parser SHALL accept CRLF change proposals
The parser SHALL accept CRLF change proposals without manual edits.

#### Scenario: Validate CRLF change
- **GIVEN** a change proposal saved with CRLF line endings
- **WHEN** a developer runs openspec validate on the proposal
- **THEN** validation succeeds without section errors
