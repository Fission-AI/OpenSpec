# CLI Archive Command - Changes

## MODIFIED Requirements

### Requirement: Spec Update Process

Before moving the change to archive, the command SHALL apply delta changes to main specs to reflect the deployed reality.

#### Scenario: Applying delta changes

- **WHEN** archiving a change with delta-based specs
- **THEN** parse and apply delta changes as defined in pastelsdd-conventions
- **AND** validate all operations before applying

#### Scenario: Validating delta changes

- **WHEN** processing delta changes
- **THEN** perform validations as specified in pastelsdd-conventions
- **AND** if validation fails, show specific errors and abort

#### Scenario: Conflict detection

- **WHEN** applying deltas would create duplicate requirement headers
- **THEN** abort with error message showing the conflict
- **AND** suggest manual resolution

## ADDED Requirements

### Requirement: Display Output

The command SHALL provide clear feedback about delta operations.

#### Scenario: Showing delta application

- **WHEN** applying delta changes
- **THEN** display for each spec:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed
- **AND** use standard output symbols (+ ~ - →) as defined in pastelsdd-conventions:
  ```
  Applying changes to specs/user-auth/spec.md:
    + 2 added
    ~ 3 modified
    - 1 removed
    → 1 renamed
  ```