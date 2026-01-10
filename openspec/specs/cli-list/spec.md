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

The command SHALL accept flags to select the noun being listed and output format.

#### Scenario: Selecting specs
- **WHEN** `--specs` is provided
- **THEN** list specs instead of changes

#### Scenario: Selecting changes
- **WHEN** `--changes` is provided
- **THEN** list changes explicitly (same as default behavior)

#### Scenario: Spaceline output format
- **WHEN** `--spaceline` is provided
- **THEN** display changes in compact spaceline format with emoji indicators
- **AND** include progress bars, task status, and Git stats

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

### Requirement: Spaceline Output Format

The command SHALL support a `--spaceline` flag that displays changes in a compact, visually rich horizontal format with emoji indicators and progress metrics.

#### Scenario: Spaceline basic format

- **WHEN** `openspec list --spaceline` is executed
- **THEN** display each change in a multi-line format:
  - Line 1: Change icon, ID, and progress bar with percentage
  - Line 2: Task status, delta count, open items, and branch with Git stats
- **AND** sort changes alphabetically by ID

#### Scenario: Spaceline with all elements

- **WHEN** a change has all available information
- **THEN** display:
  ```
  📝 {change-id} | {progress-bar} {percentage}%
  {status-icon} {category} ({completed}/{total} tasks) | {delta-icon} {count} | {open-icon} {open} | {branch-icon} {branch} ({added}↑ {removed}↓)
  ```
- **WHERE**:
  - `progress-bar` is a 10-character visual bar using `█` and `░`
  - `percentage` is task completion percentage
  - `status-icon` is implementation stage emoji (󰷫 for implementation, etc.)
  - `category` is derived from change ID prefix (e.g., "add" → "Implementation")
  - `delta-icon` `✎` shows spec delta count
  - `open-icon` `📋` shows open TODO/pr items count
  - `branch-icon` `󰘬` shows current Git branch
  - `added↑` shows number of files with net additions
  - `removed↓` shows number of files with net removals

#### Scenario: Spaceline with minimal data

- **WHEN** Git stats cannot be computed
- **THEN** display placeholder values:
  - Git stats: omitted or `(?)`
  - Branch: current branch or `(no branch)`

### Requirement: Git Statistics

The command SHALL compute file change statistics from the Git repository when in spaceline mode.

#### Scenario: Computing Git diff statistics

- **WHEN** computing Git statistics for a change
- **THEN** run `git diff --numstat` against the relevant branch or base
- **AND** count files where additions > deletions as `added` (↑)
- **AND** count files where deletions > additions as `removed` (↓)
- **AND** handle non-Git directories gracefully by showing `(?)`

#### Scenario: Git statistics errors

- **WHEN** Git commands fail or repo is unavailable
- **THEN** display `(?)` instead of statistics
- **AND** do not fail the entire list command

### Requirement: Spaceline Flag Compatibility

The `--spaceline` flag SHALL be mutually exclusive with `--json` and take precedence over `--long`.

#### Scenario: Spaceline overrides long format

- **WHEN** both `--spaceline` and `--long` are provided
- **THEN** use spaceline format
- **AND** ignore `--long` flag

#### Scenario: Spaceline conflicts with JSON

- **WHEN** both `--spaceline` and `--json` are provided
- **THEN** display error: "Cannot use --spaceline with --json"
- **AND** exit with code 2

## Why

Developers need a quick way to:
- See what changes are in progress
- Identify which changes are ready to archive
- Understand the overall project evolution status
- Get a bird's-eye view without opening multiple files

This command provides that visibility with minimal effort, following OpenSpec's philosophy of simplicity and clarity.