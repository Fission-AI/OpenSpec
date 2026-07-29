# CLI Archive Command Specification

## Purpose
The archive command moves completed changes from the active changes directory to the archive folder with date-based naming, following OpenSpec conventions.

## Command Syntax
```bash
openspec archive [change-name] [--yes|-y]
```

Options:
- `--yes`, `-y`: Skip confirmation prompts (for automation)
## Requirements
### Requirement: Change Selection

The command SHALL support both interactive and direct change selection methods.

#### Scenario: Interactive selection

- **WHEN** no change-name is provided
- **THEN** display interactive list of available changes (excluding archive/)
- **AND** allow user to select one

#### Scenario: Direct selection

- **WHEN** change-name is provided
- **THEN** use that change directly
- **AND** validate it exists

### Requirement: Task Completion Check

The command SHALL verify task completion status before archiving to prevent premature archival.

#### Scenario: Incomplete tasks found

- **WHEN** incomplete tasks are found (marked with `- [ ]`)
- **THEN** display all incomplete tasks to the user
- **AND** prompt for confirmation to continue
- **AND** default to "No" for safety

#### Scenario: All tasks complete

- **WHEN** all tasks are complete OR no tasks.md exists
- **THEN** proceed with archiving without prompting

### Requirement: Archive Process

The archive operation SHALL follow a structured process to safely move changes to the archive.

#### Scenario: Performing archive

- **WHEN** archiving a change
- **THEN** execute these steps:
  1. Create archive/ directory if it doesn't exist
  2. Generate target name as `YYYY-MM-DD-[change-name]` using current date, keeping the name as-is when it already starts with a `YYYY-MM-DD-` prefix
  3. Check if target directory already exists
  4. Update main specs from the change's future state specs (see Spec Update Process below)
  5. Move the entire change directory to the archive location

#### Scenario: Archive already exists

- **WHEN** target archive already exists
- **THEN** fail with error message
- **AND** do not overwrite existing archive

#### Scenario: Successful archive

- **WHEN** move succeeds
- **THEN** display success message with archived name and list of updated specs

### Requirement: Spec Update Process

Before moving the change to archive, the command SHALL apply delta changes to main specs to reflect the deployed reality.

#### Scenario: Applying delta changes

- **WHEN** archiving a change with delta-based specs
- **THEN** parse and apply delta changes as defined in openspec-conventions
- **AND** validate all operations before applying

#### Scenario: Validating delta changes

- **WHEN** processing delta changes
- **THEN** perform validations as specified in openspec-conventions
- **AND** if validation fails, show specific errors and abort

#### Scenario: Conflict detection

- **WHEN** applying deltas would create duplicate requirement headers
- **THEN** abort with error message showing the conflict
- **AND** suggest manual resolution

#### Scenario: New main spec inherits the delta's Purpose

- **WHEN** a delta creates a main spec that does not exist yet
- **AND** the delta spec has a line-initial `## Purpose` header that is not inside a fenced code block or an HTML comment
- **AND** the section body, ignoring fenced blocks and HTML comments, is not empty
- **THEN** write the section body into the new main spec, trimmed but otherwise verbatim, fenced code blocks included
- **AND** the section body runs to the next `## ` heading outside a fenced block

#### Scenario: New main spec without an authored Purpose

- **WHEN** a delta creates a main spec that does not exist yet
- **AND** the delta spec has no such `## Purpose` header, or that section's body is empty once fenced blocks and HTML comments are ignored
- **THEN** write the TBD placeholder Purpose naming the change to update after archive

#### Scenario: Delta Purpose that would leave the new main spec unreadable

- **WHEN** a delta creates a main spec that does not exist yet
- **AND** carrying its `## Purpose` body over would leave a spec that reads differently to different readers - a heading or requirement header that truncates a section, an unterminated code fence that swallows one, or any HTML comment, which the section scan skips but the file keeps
- **THEN** write the TBD placeholder Purpose instead and warn that the delta Purpose was ignored
- **AND** complete the archive rather than aborting it

#### Scenario: Carried Purpose shorter than the strict-mode minimum

- **WHEN** the Purpose parsed back out of the new main spec is shorter than the minimum Purpose length strict validation enforces
- **THEN** carry it over unchanged and warn that `openspec validate --strict` reports it as too brief

#### Scenario: Delta Purpose for a capability that already has a main spec

- **WHEN** a delta carries a `## Purpose` and the target main spec already exists
- **THEN** leave the existing Purpose untouched
- **AND** warn that the delta Purpose was ignored, naming the spec file to edit directly, but only when that spec has a Purpose of its own and it differs from the delta's

### Requirement: Capability Retirement

A delta whose REMOVED entries cover every requirement a capability has SHALL retire that capability instead of writing a main spec with no requirements, which can never pass validation.

#### Scenario: Deciding that a rebuilt spec cannot be written

- **WHEN** applying a delta leaves the rebuilt spec with no requirement blocks, and the capability's `## Requirements` section holds no `###` heading other than its requirement headers, wherever in the section it sits
- **THEN** put that rebuilt spec to the spec validator
- **AND** treat it as retirable only when its sole validation error is that the spec has no requirements
- **AND** otherwise write or reject it exactly as any other rebuilt spec, so a spec the validator still accepts, one broken in some further way, and one still holding a `###` heading are all left alone

#### Scenario: Validation was skipped

- **WHEN** the archive runs with validation disabled
- **THEN** retire nothing, because no verdict was produced to justify moving a spec out of the live tree
- **AND** write the rebuilt spec exactly as an archive without this behavior would

#### Scenario: Delta removes the capability's last requirement

- **WHEN** a retirable rebuilt spec belongs to a capability whose main spec exists
- **AND** at least one requirement was actually removed by this run
- **THEN** move the capability's `spec.md` into the change being archived instead of writing it, so it comes to rest at `<archive>/retired-specs/<capability>/spec.md`
- **AND** delete no spec content, leaving the file recoverable from the archive
- **AND** remove any directory the move leaves empty, resolving symlinks so nothing outside the real specs root is removed, and never the specs root itself
- **AND** count every operation the delta applied in the archive totals
- **AND** record the retirement in the archive warnings, naming where the spec moved to, the sections that moved with it, and the resolved path when a symlinked directory placed the file outside the specs tree

#### Scenario: Retired spec is staged inside the change

- **WHEN** moving a retired capability's `spec.md`
- **THEN** stage it inside the change directory, which is renamed onto the archive path, so the spec travels with the change that retired it
- **AND** refuse to overwrite a spec already staged there by an earlier aborted run of the same archive
- **AND** copy the file's content, rather than the link, when the main spec is a symlink, leaving the link's target untouched
- **AND** remove the staging directories it created when the move fails, so no empty folder rides into the archive claiming a retirement that never happened, while keeping any retirement the same run already staged beside it

#### Scenario: Retirement is deferred until every spec is written

- **WHEN** an archive both retires one capability and updates another
- **THEN** settle the archive destination before touching any spec, so a name collision cannot strand a retirement
- **AND** perform the move only after every spec write has succeeded
- **AND** report a destination claimed while the merge ran as the same collision, rather than as a raw filesystem error

#### Scenario: Capability directory holds other files

- **WHEN** retiring a capability whose directory still holds other files after `spec.md` moves out
- **THEN** leave that directory in place

#### Scenario: Removal was already synced

- **WHEN** a retirable rebuilt spec removed nothing this run and its main spec exists
- **THEN** leave the file untouched
- **AND** abort the archive with the validation error, as for any other unwritable spec, unless validation was skipped

#### Scenario: Main spec is already gone

- **WHEN** a REMOVED-only delta targets a capability that has no main spec
- **THEN** complete the archive without creating or retiring one

### Requirement: Confirmation Behavior

The spec update confirmation SHALL provide clear visibility into changes before they are applied.

#### Scenario: Displaying confirmation

- **WHEN** prompting for confirmation
- **THEN** display a clear summary showing:
  - Which specs will be created (new capabilities)
  - Which specs will be updated (existing capabilities)
  - The source path for each spec
- **AND** format the confirmation prompt as:
  ```
  The following specs will be updated:
  
  NEW specs to be created:
    - cli-archive (from changes/add-archive-command/specs/cli-archive/spec.md)
  
  EXISTING specs to be updated:
    - cli-init (from changes/update-init-command/specs/cli-init/spec.md)
  
  Update 2 specs and archive 'add-archive-command'? [y/N]:
  ```
#### Scenario: Handling confirmation response

- **WHEN** waiting for user confirmation
- **THEN** default to "No" for safety (require explicit "y" or "yes")
- **AND** skip confirmation when `--yes` or `-y` flag is provided

#### Scenario: User declines confirmation

- **WHEN** user declines the confirmation
- **THEN** abort the entire archive operation
- **AND** display message: "Archive cancelled. No changes were made."
- **AND** exit with non-zero status code

### Requirement: Error Conditions

The command SHALL handle various error conditions gracefully.

#### Scenario: Handling errors

- **WHEN** errors occur
- **THEN** handle the following conditions:
  - Missing openspec/changes/ directory
  - Change not found
  - Archive target already exists
  - File system permissions issues

### Requirement: Skip Specs Option

The archive command SHALL support a `--skip-specs` flag that skips all spec update operations and proceeds directly to archiving.

#### Scenario: Skipping spec updates with flag

- **WHEN** executing `openspec archive <change> --skip-specs`
- **THEN** skip spec discovery and update confirmation
- **AND** proceed directly to moving the change to archive
- **AND** display a message indicating specs were skipped

### Requirement: Non-blocking confirmation

The archive operation SHALL proceed when the user declines spec updates instead of cancelling the entire operation.

#### Scenario: User declines spec update confirmation

- **WHEN** the user declines spec update confirmation
- **THEN** skip spec updates
- **AND** continue with the archive operation
- **AND** display a success message indicating specs were not updated

### Requirement: Display Output

The command SHALL provide clear feedback about delta operations.

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

### Requirement: Archive Validation

The archive command SHALL validate changes before applying them to ensure data integrity.

#### Scenario: Pre-archive validation

- **WHEN** executing `openspec archive change-name`
- **THEN** validate the change structure first
- **AND** only proceed if validation passes
- **AND** show validation errors if it fails

#### Scenario: Proposal warnings stay proposal-level

- **WHEN** archiving a change
- **THEN** the non-blocking proposal warnings SHALL NOT repeat requirement-level
  issues reached through the delta specs
- **AND** a requirement removed by a `## REMOVED Requirements` delta SHALL NOT be
  reported as missing a scenario
- **AND** proposal-level issues SHALL still be reported

#### Scenario: Force archive without validation

- **WHEN** executing `openspec archive change-name --no-validate`
- **THEN** skip validation (unsafe mode)
- **AND** show warning about skipping validation

## Why These Decisions

**Interactive selection**: Reduces typing and helps users see available changes
**Task checking**: Prevents accidental archiving of incomplete work
**Date prefixing**: Maintains chronological order and prevents naming conflicts; a name that already carries a date prefix keeps it, so archived names never stack dates
**No overwrite**: Preserves historical archives and prevents data loss
**Spec updates before archiving**: Specs in the main directory represent current reality; when a change is deployed and archived, its future state specs become the new reality and must replace the main specs
**Confirmation for spec updates**: Provides visibility into what will change, prevents accidental overwrites, and ensures users understand the impact before specs are modified
**--yes flag for automation**: Allows CI/CD pipelines to archive without interactive prompts while maintaining safety by default for manual use