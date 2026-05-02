## MODIFIED Requirements

### Requirement: Spec Update Process

Before moving the change to archive, the command SHALL apply delta changes to main specs to reflect the deployed reality.

#### Scenario: Applying delta changes

- **WHEN** archiving a change with delta-based specs
- **THEN** recursively discover delta specs within the change's `specs/` directory
- **AND** parse and apply delta changes as defined in openspec-conventions
- **AND** validate all operations before applying
- **AND** create nested directories under `openspec/specs/` as needed for new hierarchical specs

#### Scenario: Applying hierarchical delta specs

- **WHEN** a change contains delta spec at `changes/<name>/specs/cli/show/spec.md`
- **THEN** apply the delta to `openspec/specs/cli/show/spec.md`
- **AND** create intermediate directories (`cli/`) if they do not exist

#### Scenario: Validating delta changes

- **WHEN** processing delta changes
- **THEN** perform validations as specified in openspec-conventions
- **AND** if validation fails, show specific errors and abort

#### Scenario: Conflict detection

- **WHEN** applying deltas would create duplicate requirement headers
- **THEN** abort with error message showing the conflict
- **AND** suggest manual resolution

### Requirement: Confirmation Behavior

The spec update confirmation SHALL provide clear visibility into changes before they are applied.

#### Scenario: Displaying confirmation with hierarchical paths

- **WHEN** prompting for confirmation
- **THEN** display a clear summary showing:
  - Which specs will be created (new capabilities) with full hierarchical paths
  - Which specs will be updated (existing capabilities) with full hierarchical paths
  - The source path for each spec
- **AND** format the confirmation prompt as:
  ```
  The following specs will be updated:

  NEW specs to be created:
    - cli/archive (from changes/add-archive-command/specs/cli/archive/spec.md)

  EXISTING specs to be updated:
    - cli/init (from changes/update-init-command/specs/cli/init/spec.md)

  Update 2 specs and archive 'add-archive-command'? [y/N]:
  ```
