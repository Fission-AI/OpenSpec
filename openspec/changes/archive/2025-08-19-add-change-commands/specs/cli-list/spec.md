## MODIFIED Requirements

### Requirement: Command Execution

The current `list` command behavior SHALL be preserved but marked as deprecated.

#### Scenario: Deprecation notice

- **WHEN** using the legacy `list` command
- **THEN** continue to work as before
- **AND** display deprecation notice
- **AND** suggest using `pastelsdd change list` instead