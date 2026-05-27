# CLI Archive Command Specification

## Purpose
The archive command moves completed changes from the active changes directory to the archive folder with date-based naming, following Pastelsdd conventions.

## Command Syntax
```bash
pastelsdd archive [change-name] [--yes|-y] [--skip-specs]
```

Options:
- `--yes`, `-y`: Skip confirmation prompts (for automation)
- `--skip-specs`: Skip spec update operations entirely (for changes without spec modifications)

## Behavior

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
  2. Generate target name as `YYYY-MM-DD-[change-name]` using current date
  3. Check if target directory already exists
  4. Update main specs from the change's future state specs unless `--skip-specs` is provided (see Spec Update Process below)
  5. Move the entire change directory to the archive location

#### Scenario: Archive already exists

- **WHEN** target archive already exists
- **THEN** fail with error message
- **AND** do not overwrite existing archive

#### Scenario: Successful archive

- **WHEN** move succeeds
- **THEN** display success message with archived name and list of updated specs (if any)

### Requirement: Spec Update Process

Before moving the change to archive, the command SHALL update main specs to reflect the deployed reality unless the `--skip-specs` flag is provided.

#### Scenario: Skipping spec updates

- **WHEN** the `--skip-specs` flag is provided
- **THEN** skip all spec discovery and update operations
- **AND** proceed directly to moving the change to archive
- **AND** display message indicating specs were skipped

#### Scenario: Updating specs from change

- **WHEN** the change contains specs in `changes/[name]/specs/` AND `--skip-specs` is NOT provided
- **THEN** execute these steps:
  1. Analyze which specs will be affected by comparing with existing specs
  2. Display a summary of spec updates to the user (see Confirmation Behavior below)
  3. Prompt for confirmation unless `--yes` flag is provided
  4. If confirmed, for each capability spec in the change directory:
     - Copy the spec from `changes/[name]/specs/[capability]/spec.md` to `pastelsdd/specs/[capability]/spec.md`
     - Create the target directory structure if it doesn't exist
     - Overwrite existing spec files (specs represent current reality, change specs are the new reality)
     - Track which specs were updated for the success message

#### Scenario: No specs in change

- **WHEN** no specs exist in the change AND `--skip-specs` is NOT provided
- **THEN** skip the spec update step
- **AND** proceed with archiving

### Requirement: Confirmation Behavior

The spec update confirmation SHALL provide clear visibility into changes before they are applied.

#### Scenario: Displaying confirmation

- **WHEN** prompting for confirmation AND `--skip-specs` is NOT provided
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
- **AND** skip entire spec confirmation when `--skip-specs` flag is provided

#### Scenario: User declines spec update confirmation

- **WHEN** user declines the spec update confirmation
- **THEN** skip the spec update operations
- **AND** display message: "Skipping spec updates. Proceeding with archive."
- **AND** continue with the archive operation
- **AND** display success message indicating specs were not updated

## Error Handling

### Requirement: Error Conditions

The command SHALL handle various error conditions gracefully.

#### Scenario: Handling errors

- **WHEN** errors occur
- **THEN** handle the following conditions:
  - Missing pastelsdd/changes/ directory
  - Change not found
  - Archive target already exists
  - File system permissions issues

## Why These Decisions

**Interactive selection**: Reduces typing and helps users see available changes
**Task checking**: Prevents accidental archiving of incomplete work
**Date prefixing**: Maintains chronological order and prevents naming conflicts
**No overwrite**: Preserves historical archives and prevents data loss
**Spec updates before archiving**: Specs in the main directory represent current reality; when a change is deployed and archived, its future state specs become the new reality and must replace the main specs
**Confirmation for spec updates**: Provides visibility into what will change, prevents accidental overwrites, and ensures users understand the impact before specs are modified
**Non-blocking confirmation**: Declining spec updates doesn't cancel archiving - users can review specs and choose to update them separately if needed
**--yes flag for automation**: Allows CI/CD pipelines to archive without interactive prompts while maintaining safety by default for manual use
**--skip-specs flag**: Enables archiving of changes that don't modify specs (like infrastructure, tooling, or documentation changes) without unnecessary spec update prompts or operations

## ADDED Requirements

### Requirement: Skip Specs Option

The archive command SHALL support a `--skip-specs` flag that skips all spec update operations and proceeds directly to archiving.

#### Scenario: Skipping spec updates with flag

- **WHEN** executing `pastelsdd archive <change> --skip-specs`
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