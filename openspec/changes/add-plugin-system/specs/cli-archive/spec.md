## ADDED Requirements

### Requirement: Post-archive hook dispatch

After the archive operation completes (directory moved), the archive command SHALL dispatch `archive.post` hooks from loaded plugins.

#### Scenario: Hooks execute after successful archive
- **WHEN** `openspec archive my-change` completes successfully
- **AND** loaded plugins have `archive.post` hooks
- **THEN** the system executes command hooks and collects prompt hooks
- **AND** includes hook results in the archive output

#### Scenario: No plugins loaded
- **WHEN** `openspec archive my-change` completes
- **AND** no plugins are loaded (no `plugins` in config or empty list)
- **THEN** archive operates exactly as before (no hook dispatch)

#### Scenario: Hook failure does not undo archive
- **WHEN** an `archive.post` command hook fails
- **AND** `ignore_failure` is not set
- **THEN** the system reports the hook failure
- **AND** the archive directory move is NOT rolled back (already committed)

#### Scenario: Archive output includes hook results
- **WHEN** archive completes with plugin hooks
- **THEN** the output includes a `hooks` section with `executed` and `pending` arrays

### Requirement: Pre-archive hook dispatch

Before the archive operation begins, the archive command SHALL dispatch `archive.pre` hooks from loaded plugins.

#### Scenario: Pre-hook blocks archive
- **WHEN** an `archive.pre` command hook exits with non-zero code
- **AND** `ignore_failure` is false
- **THEN** the archive operation is aborted
- **AND** error message includes the hook's output
