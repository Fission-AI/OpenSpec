# change-creation Specification

## Purpose
Provide programmatic utilities for creating and validating OpenSpec change directories.
## Requirements
### Requirement: Change Creation
The system SHALL provide a function to create new change directories programmatically.

#### Scenario: Create change
- **WHEN** `createChange(projectRoot, 'add-auth')` is called
- **THEN** the system creates `openspec/changes/add-auth/` directory

#### Scenario: Duplicate change rejected
- **WHEN** `createChange(projectRoot, 'add-auth')` is called and `openspec/changes/add-auth/` already exists
- **THEN** the system throws an error indicating the change already exists

#### Scenario: Creates parent directories if needed
- **WHEN** `createChange(projectRoot, 'add-auth')` is called and `openspec/changes/` does not exist
- **THEN** the system creates the full path including parent directories

#### Scenario: Invalid change name rejected
- **WHEN** `createChange(projectRoot, 'Add Auth')` is called with an invalid name
- **THEN** the system throws a validation error

### Requirement: Change Name Validation
The system SHALL validate change names follow kebab-case conventions.

#### Scenario: Valid kebab-case name accepted
- **WHEN** a change name like `add-user-auth` is validated
- **THEN** validation returns `{ valid: true }`

#### Scenario: Numeric suffixes accepted
- **WHEN** a change name like `add-feature-2` is validated
- **THEN** validation returns `{ valid: true }`

#### Scenario: Single word accepted
- **WHEN** a change name like `refactor` is validated
- **THEN** validation returns `{ valid: true }`

#### Scenario: Uppercase characters rejected
- **WHEN** a change name like `Add-Auth` is validated
- **THEN** validation returns `{ valid: false, error: "..." }`

#### Scenario: Spaces rejected
- **WHEN** a change name like `add auth` is validated
- **THEN** validation returns `{ valid: false, error: "..." }`

#### Scenario: Underscores rejected
- **WHEN** a change name like `add_auth` is validated
- **THEN** validation returns `{ valid: false, error: "..." }`

#### Scenario: Special characters rejected
- **WHEN** a change name like `add-auth!` is validated
- **THEN** validation returns `{ valid: false, error: "..." }`

#### Scenario: Leading hyphen rejected
- **WHEN** a change name like `-add-auth` is validated
- **THEN** validation returns `{ valid: false, error: "..." }`

#### Scenario: Trailing hyphen rejected
- **WHEN** a change name like `add-auth-` is validated
- **THEN** validation returns `{ valid: false, error: "..." }`

#### Scenario: Consecutive hyphens rejected
- **WHEN** a change name like `add--auth` is validated
- **THEN** validation returns `{ valid: false, error: "..." }`

### Requirement: Workspace-aware change creation
Change creation SHALL support both repo-local and workspace planning homes.

#### Scenario: Creating a change from a workspace root
- **GIVEN** the command runs from an OpenSpec workspace root
- **WHEN** the user creates a new change
- **THEN** OpenSpec SHALL create the change under the workspace planning path
- **AND** it SHALL not create the change under a linked repo's `openspec/changes/` directory
- **AND** it SHALL use the `workspace-planning` schema when no explicit schema is provided

#### Scenario: Creating a change from inside a workspace
- **GIVEN** the command runs from a subdirectory of an OpenSpec workspace planning home
- **WHEN** the user creates a new change
- **THEN** OpenSpec SHALL resolve the current workspace as the planning home
- **AND** it SHALL create the change under that workspace's planning path
- **AND** it SHALL use the `workspace-planning` schema when no explicit schema is provided

#### Scenario: Creating a change from inside a linked repo
- **GIVEN** a repo or folder is registered as a workspace link
- **AND** the command runs from inside that linked repo or folder rather than from the workspace planning home
- **WHEN** the user creates a new change without explicitly selecting a workspace
- **THEN** OpenSpec SHALL preserve repo-local change creation behavior for that location
- **AND** it SHALL not create a workspace-scoped change merely because the location is registered as a workspace link

#### Scenario: Preserving repo-local change creation
- **GIVEN** the command runs outside an OpenSpec workspace
- **WHEN** the user creates a new change in a repo-local OpenSpec project
- **THEN** OpenSpec SHALL continue to create the change under `openspec/changes/`

#### Scenario: Rejecting invalid workspace affected areas
- **GIVEN** a workspace change creation request includes affected area names
- **WHEN** one or more names are not registered workspace links
- **THEN** OpenSpec SHALL reject those invalid affected areas
- **AND** it SHALL list the valid workspace link names

#### Scenario: Creating without affected areas
- **GIVEN** the user is still exploring scope
- **WHEN** the user creates a workspace change without affected areas
- **THEN** OpenSpec SHALL create the workspace change
- **AND** it SHALL allow affected areas to be identified later

