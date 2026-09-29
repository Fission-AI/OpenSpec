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

### Requirement: Local Library Discovery
The list command SHALL discover the selected local OpenSpec library and valid descendant libraries by default in both changes and specs modes. It SHALL reuse local-root validity rules and support the legacy project.md layout. Discovery SHALL skip directory symlinks, dependencies, build/cache directories, virtual environments, worktrees, and OpenSpec planning contents, and deduplicate physical roots.

#### Scenario: Split repository
- **WHEN** the selected local project contains descendant libraries
- **THEN** list each library under its relative path, root first and descendants in stable path order
- **AND** show a compact library/item total and per-library empty states
- **AND** retain the requested sorting within each library

#### Scenario: No local root
- **WHEN** no local root resolves from the current directory
- **THEN** discover descendant libraries from the current directory before using a default store

#### Scenario: Store scope
- **WHEN** a store is explicitly selected or selected through a project pointer
- **THEN** list only that store
- **AND** leave other commands' root-selection and mutation semantics unchanged

#### Scenario: Aggregated JSON
- **WHEN** more than one library is discovered with --json
- **THEN** retain the changes/specs array and add an owning library to each entry
- **AND** include discovered root metadata without presentation text
- **AND** preserve existing single-library JSON behavior

#### Scenario: Library failure
- **WHEN** a discovered library is malformed or unreadable
- **THEN** report one actionable diagnostic for that library and exit nonzero
- **AND** retain successfully read libraries

### Requirement: Task Counting

The command SHALL accurately count task completion status using standard markdown checkbox patterns.

#### Scenario: Counting tasks in tasks.md

- **WHEN** parsing a `tasks.md` file
- **THEN** count tasks matching these patterns:
  - Completed: Lines containing `- [x]`
  - Incomplete: Lines containing `- [ ]`
- **AND** calculate total tasks as the sum of completed and incomplete

### Requirement: Output Format
The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts.

#### Scenario: Displaying change list (default)
- **WHEN** displaying the list of changes
- **THEN** show a table with columns:
  - Change name (directory name)
  - Task progress (e.g., "3/5 tasks" or "✓ Complete")

#### Scenario: Displaying spec list
- **WHEN** displaying the list of specs
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")

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
- **THEN** display a per-library "No active changes" state for recursive local listing

#### Scenario: Handling empty state (specs)
- **WHEN** no specs directory exists or contains no capabilities
- **THEN** display a per-library "No specs" state for recursive local listing

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
- **THEN** sort them by recency by default, or alphabetically with --sort name, within each library

## Why

Developers need a quick way to:
- See what changes are in progress
- Identify which changes are ready to archive
- Understand the overall project evolution status
- Get a bird's-eye view without opening multiple files

This command provides that visibility with minimal effort, following OpenSpec's philosophy of simplicity and clarity.