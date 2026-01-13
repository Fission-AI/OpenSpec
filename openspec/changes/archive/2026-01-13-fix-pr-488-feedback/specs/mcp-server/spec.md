## ADDED Requirements

### Requirement: Secure Resource Resolution
The server SHALL validate all inputs used to construct file paths for resources to prevent unauthorized access.

#### Scenario: Path Traversal Prevention
- **WHEN** a client requests a resource with a path parameter containing `..` or path separators
- **THEN** the server SHALL reject the request
- **AND** return an error indicating invalid input.
