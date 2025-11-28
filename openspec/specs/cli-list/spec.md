# List Command Specification

## Purpose

The `openspec list` command SHALL provide developers with a quick overview of all active changes in the project, showing their names and task completion status.
## Requirements
### Requirement: Command Execution
The command SHALL scan and analyze either active changes or specs based on the selected mode.

#### Scenario: Scanning for changes (default)
- **WHEN** `openspec list` is executed without flags
- **THEN** scan the `openspec/changes/` directory for change directories
- **AND** exclude the `archive/` subdirectory from results
- **AND** parse each change's `tasks.md` file to count task completion

#### Scenario: Scanning for specs
- **WHEN** `openspec list --specs` is executed
- **THEN** scan the `openspec/specs/` directory for capabilities
- **AND** read each capability's `spec.md`
- **AND** parse requirements to compute requirement counts

### Requirement: Task Counting

The command SHALL accurately count task completion status using standard markdown checkbox patterns.

#### Scenario: Counting tasks in tasks.md

- **WHEN** parsing a `tasks.md` file
- **THEN** count tasks matching these patterns:
  - Completed: Lines containing `- [x]`
  - Incomplete: Lines containing `- [ ]`
- **AND** calculate total tasks as the sum of completed and incomplete

### Requirement: Output Format
The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts by default, and SHALL support machine-readable JSON output via the `--json` flag for automation.

#### Scenario: Displaying change list (default)
- **WHEN** `openspec list` is executed without flags
- **THEN** show a table with columns:
- Change name (directory name)
- Task progress (e.g., "3/5 tasks" or "✓ Complete")

#### Scenario: Displaying spec list (default)
- **WHEN** `openspec list --specs` is executed
- **THEN** show a table with columns:
- Spec id (directory name)
- Requirement count (e.g., "requirements 12")

#### Scenario: Displaying JSON change list
- **WHEN** `openspec list --json` is executed
- **THEN** output a JSON array of objects each with fields `name`, `completedTasks`, `totalTasks`
- **AND** preserve alphabetical sort order by change name
- **AND** output only JSON (no leading human-readable header text)

#### Scenario: Displaying JSON spec list
- **WHEN** `openspec list --specs --json` is executed
- **THEN** output a JSON array of objects each with fields `id`, `requirementCount`
- **AND** preserve alphabetical sort order by spec id
- **AND** output only JSON (no leading human-readable header text)

#### Scenario: Empty JSON change list
- **WHEN** `openspec list --json` is executed and there are no active changes
- **THEN** output `[]` (an empty JSON array) with exit code 0

#### Scenario: Empty JSON spec list
- **WHEN** `openspec list --specs --json` is executed and there are no specs
- **THEN** output `[]` (an empty JSON array) with exit code 0

### Requirement: Flags
The command SHALL accept flags to select the noun being listed.

#### Scenario: Selecting specs
- **WHEN** `--specs` is provided
- **THEN** list specs instead of changes

#### Scenario: Selecting changes
- **WHEN** `--changes` is provided
- **THEN** list changes explicitly (same as default behavior)

### Requirement: Empty State
The command SHALL provide clear feedback when no items are present for the selected mode.

#### Scenario: Handling empty state (changes)
- **WHEN** no active changes exist (only archive/ or empty changes/)
- **THEN** display: "No active changes found."

#### Scenario: Handling empty state (specs)
- **WHEN** no specs directory exists or contains no capabilities
- **THEN** display: "No specs found."

### Requirement: Error Handling

The command SHALL gracefully handle missing files and directories with appropriate messages.

#### Scenario: Missing tasks.md file

- **WHEN** a change directory has no `tasks.md` file
- **THEN** display the change with "No tasks" status

#### Scenario: Missing changes directory

- **WHEN** `openspec/changes/` directory doesn't exist
- **THEN** display error: "No OpenSpec changes directory found. Run 'openspec init' first."
- **AND** exit with code 1

### Requirement: Sorting

The command SHALL maintain consistent ordering of changes for predictable output.

#### Scenario: Ordering changes

- **WHEN** displaying multiple changes
- **THEN** sort them in alphabetical order by change name

## Why

Developers need a quick way to:
- See what changes are in progress
- Identify which changes are ready to archive
- Understand the overall project evolution status
- Get a bird's-eye view without opening multiple files

This command provides that visibility with minimal effort, following OpenSpec's philosophy of simplicity and clarity.