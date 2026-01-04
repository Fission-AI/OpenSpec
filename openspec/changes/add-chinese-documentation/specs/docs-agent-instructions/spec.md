# docs-agent-instructions Specification Delta

## ADDED Requirements

### Requirement: Chinese Documentation Support
The documentation system SHALL provide Chinese translations of all core documentation files to support Chinese-speaking developers.

#### Scenario: Chinese version availability
- **WHEN** a developer accesses any core documentation file
- **THEN** a Chinese version SHALL be available with the naming convention `<filename>.zh-CN.md`
- **AND** the English version SHALL include a link to the Chinese version at the top

#### Scenario: Translation consistency
- **WHEN** Chinese documentation is created or updated
- **THEN** all technical terms, code examples, and CLI commands SHALL remain in English
- **AND** the translation SHALL maintain the same structure and formatting as the English version
- **AND** all links and references SHALL point to the correct locations

#### Scenario: Documentation synchronization
- **WHEN** English documentation is updated
- **THEN** the corresponding Chinese documentation SHOULD be updated to maintain consistency
- **AND** version indicators or timestamps MAY be used to track translation currency
