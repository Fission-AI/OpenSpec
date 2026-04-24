# CLI Archive Command Specification — Delta

## MODIFIED Requirements

### Requirement: Spec Update Process

Before moving the change to archive, the command SHALL apply delta changes to main specs to reflect the deployed reality, supporting nested capability paths and module-qualified targets.

#### Scenario: Applying delta changes

- **WHEN** archiving a change with delta-based specs
- **THEN** recursively discover all `spec.md` files under the change's `specs/` directory
- **AND** for each delta spec, resolve the target spec location:
  - If the first path segment matches a registered module name, target that module's spec root
  - Otherwise, target the current module's spec root using the full nested path
- **AND** parse and apply delta changes as defined in openspec-conventions
- **AND** validate all operations before applying

#### Scenario: Applying deltas to nested capability paths

- **WHEN** a change contains delta specs at nested paths (e.g., `changes/foo/specs/auth/oauth/spec.md`)
- **THEN** the system creates any missing intermediate directories in the target spec root
- **AND** applies the delta to `specs/auth/oauth/spec.md`

#### Scenario: Applying deltas across modules

- **WHEN** a change contains delta specs prefixed with a module name (e.g., `changes/foo/specs/payments/checkout/spec.md`)
- **AND** `payments` is a registered writable module
- **THEN** the system applies the delta to `{payments_root}/checkout/spec.md`

#### Scenario: Skipping read-only module deltas

- **WHEN** a change contains delta specs targeting a read-only (remote) module
- **THEN** the system skips those deltas during archive
- **AND** displays a message: "Skipped delta for remote module '{name}': {capability}. Coordinate with module owner."
- **AND** the delta specs are preserved in the archived change for reference

### Requirement: Confirmation Behavior

The spec update confirmation SHALL provide clear visibility into changes before they are applied, including module and nested path information.

#### Scenario: Displaying confirmation

- **WHEN** prompting for confirmation
- **THEN** display a clear summary showing:
  - Which specs will be created (new capabilities) with full path including module
  - Which specs will be updated (existing capabilities) with full path including module
  - Which specs were skipped (read-only modules)
  - The source path for each spec
- **AND** format the confirmation prompt as:
  ```
  The following specs will be updated:

  NEW specs to be created:
    - auth/mfa (from changes/add-mfa/specs/auth/mfa/spec.md)
    - payments:fraud-detection (from changes/add-mfa/specs/payments/fraud-detection/spec.md)

  EXISTING specs to be updated:
    - auth/session (from changes/add-mfa/specs/auth/session/spec.md)

  SKIPPED (remote modules):
    - contracts:auth-api (read-only)

  Update 3 specs and archive 'add-mfa'? [y/N]:
  ```

### Requirement: Archive Validation

The archive command SHALL discover and validate delta specs recursively, using full capability paths for all validation operations.

#### Scenario: Recursive delta spec discovery during validation

- **WHEN** `validateChangeDeltaSpecs()` is invoked for a change
- **THEN** it SHALL recursively discover all `spec.md` files under the change's `specs/` directory at any depth
- **AND** it SHALL NOT use shallow `readdir` to enumerate only direct children

#### Scenario: Validating with full capability paths

- **WHEN** validating each discovered delta spec
- **THEN** the validator SHALL resolve the full capability path (e.g., `auth/oauth`) from the delta spec's relative position
- **AND** match against main specs using the full capability path, not just the immediate parent directory name

#### Scenario: Validation errors reference full paths

- **WHEN** a validation error is reported for a delta spec
- **THEN** the error message SHALL include the full capability path (e.g., `auth/oauth`) rather than only the leaf directory name

### Requirement: Display Output

The command SHALL provide clear feedback about delta operations, including full capability paths.

#### Scenario: Showing delta application

- **WHEN** applying delta changes
- **THEN** display for each spec the module-qualified or nested path:
  ```
  Applying changes to auth/session:
    + 2 added
    ~ 3 modified
    - 1 removed
    → 1 renamed

  Applying changes to payments:checkout:
    + 1 added
    ~ 1 modified
  ```
