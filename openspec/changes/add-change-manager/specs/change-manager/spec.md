## ADDED Requirements

### Requirement: Change Listing
The system SHALL provide a centralized method to list all active changes in a project.

**Note:** Extracted from `ListCommand.execute()` and `ChangeCommand.getActiveChanges()`.

#### Scenario: List changes with multiple changes
- **WHEN** `openspec/changes/` contains directories `add-auth/` and `refactor-db/`
- **THEN** `listChanges()` returns `['add-auth', 'refactor-db']`

#### Scenario: List changes with no changes
- **WHEN** `openspec/changes/` is empty or does not exist
- **THEN** `listChanges()` returns an empty array

#### Scenario: List changes ignores files
- **WHEN** `openspec/changes/` contains a file `notes.txt` alongside directory `add-auth/`
- **THEN** `listChanges()` returns only `['add-auth']`

#### Scenario: List changes ignores archive directory
- **WHEN** `openspec/changes/` contains `add-auth/` and `archive/`
- **THEN** `listChanges()` returns only `['add-auth']` (excludes archive)

#### Scenario: List changes returns sorted results
- **WHEN** `openspec/changes/` contains `zebra/`, `alpha/`, `beta/`
- **THEN** `listChanges()` returns `['alpha', 'beta', 'zebra']` (alphabetically sorted)

### Requirement: Change Path Resolution
The system SHALL resolve absolute paths to change directories.

**Note:** Extracted from inline `path.join()` calls in CLI commands.

#### Scenario: Existing change path
- **WHEN** `getChangePath('add-auth')` is called and the change exists
- **THEN** returns the absolute path to `openspec/changes/add-auth/`

#### Scenario: Non-existent change path
- **WHEN** `getChangePath('nonexistent')` is called and the change does not exist
- **THEN** throws an error indicating the change was not found with available changes listed

### Requirement: Change Existence Check
The system SHALL check whether a change directory exists.

**Note:** Extracted from inline `fs.access()` checks in CLI commands.

#### Scenario: Change exists
- **WHEN** `changeExists('add-auth')` is called and the directory exists
- **THEN** returns true

#### Scenario: Change does not exist
- **WHEN** `changeExists('nonexistent')` is called and the directory does not exist
- **THEN** returns false

### Requirement: Initialization Check
The system SHALL detect whether a project has an OpenSpec changes directory.

**Note:** Extracted from `ListCommand` directory access check.

#### Scenario: Initialized project
- **WHEN** the `openspec/changes/` directory exists at the project root
- **THEN** `isInitialized()` returns true

#### Scenario: Uninitialized project
- **WHEN** the `openspec/changes/` directory does not exist
- **THEN** `isInitialized()` returns false

### Requirement: Change Creation
The system SHALL create new change directories with proper structure.

**Note:** New functionality - does not exist in current codebase.

#### Scenario: Create change with name only
- **WHEN** `createChange('add-auth')` is called
- **THEN** the system creates `openspec/changes/add-auth/` directory
- **AND** creates a `README.md` file with the change name as title

#### Scenario: Create change with description
- **WHEN** `createChange('add-auth', 'Add user authentication')` is called
- **THEN** the system creates `openspec/changes/add-auth/` directory
- **AND** creates a `README.md` file with the change name and description

#### Scenario: Duplicate change rejected
- **WHEN** `createChange('add-auth')` is called and `openspec/changes/add-auth/` already exists
- **THEN** the system throws an error indicating the change already exists

#### Scenario: Creates parent directories if needed
- **WHEN** `createChange('add-auth')` is called and `openspec/changes/` does not exist
- **THEN** the system creates the full path including parent directories

#### Scenario: Invalid change name rejected
- **WHEN** `createChange('')` is called with an empty name
- **THEN** the system throws an error indicating invalid name

### Requirement: Change Name Validation
The system SHALL validate change names follow kebab-case conventions.

**Note:** New functionality - names are not currently validated.

#### Scenario: Valid kebab-case name accepted
- **WHEN** a change name like `add-user-auth` is validated
- **THEN** validation passes

#### Scenario: Numeric suffixes accepted
- **WHEN** a change name like `add-feature-2` is validated
- **THEN** validation passes

#### Scenario: Single word accepted
- **WHEN** a change name like `refactor` is validated
- **THEN** validation passes

#### Scenario: Uppercase characters rejected
- **WHEN** a change name like `Add-Auth` is validated
- **THEN** validation fails with descriptive error

#### Scenario: Spaces rejected
- **WHEN** a change name like `add auth` is validated
- **THEN** validation fails with descriptive error

#### Scenario: Underscores rejected
- **WHEN** a change name like `add_auth` is validated
- **THEN** validation fails with descriptive error

#### Scenario: Special characters rejected
- **WHEN** a change name like `add-auth!` is validated
- **THEN** validation fails with descriptive error

#### Scenario: Leading hyphen rejected
- **WHEN** a change name like `-add-auth` is validated
- **THEN** validation fails with descriptive error

#### Scenario: Trailing hyphen rejected
- **WHEN** a change name like `add-auth-` is validated
- **THEN** validation fails with descriptive error

#### Scenario: Consecutive hyphens rejected
- **WHEN** a change name like `add--auth` is validated
- **THEN** validation fails with descriptive error
