## MODIFIED Requirements

### Requirement: Display Output

The command SHALL provide clear feedback about delta operations and tracked issues.

#### Scenario: Showing delta application

- **WHEN** applying delta changes
- **THEN** display for each spec:
  - Number of requirements added
  - Number of requirements modified
  - Number of requirements removed
  - Number of requirements renamed
- **AND** use standard output symbols (+ ~ - →) as defined in openspec-conventions:
  ```
  Applying changes to specs/user-auth/spec.md:
    + 2 added
    ~ 3 modified
    - 1 removed
    → 1 renamed
  ```

#### Scenario: Showing tracked issues on archive

- **WHEN** archiving a change with tracked issues in frontmatter
- **THEN** display the tracked issue identifiers in the success message
- **AND** format as: `Archived 'change-name' (ISSUE-ID)`

#### Scenario: Archiving change without tracked issues

- **WHEN** archiving a change without tracked issues
- **THEN** display the standard success message without issue reference
