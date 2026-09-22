## MODIFIED Requirements

### Requirement: Change Creation
The system SHALL provide a function to create new change directories programmatically in the proposed location of the selected planning root.

#### Scenario: Create change
- **WHEN** `createChange(projectRoot, 'add-auth')` is called
- **THEN** the system creates `openspec/changes/proposed/add-auth/` directory

#### Scenario: Duplicate change rejected
- **WHEN** `createChange(projectRoot, 'add-auth')` is called and that name already exists in proposed, approved, or legacy active changes
- **THEN** the system throws an error indicating the change already exists

#### Scenario: Creates parent directories if needed
- **WHEN** `createChange(projectRoot, 'add-auth')` is called and the proposed parent directory does not exist
- **THEN** the system creates the full path including parent directories

#### Scenario: Invalid change name rejected
- **WHEN** `createChange(projectRoot, 'Add Auth')` is called with an invalid name
- **THEN** the system throws a validation error

#### Scenario: Cross-platform creation
- **WHEN** a change is created on Windows, macOS, or Linux
- **THEN** the proposed directory and returned artifact paths use the platform's native path handling
