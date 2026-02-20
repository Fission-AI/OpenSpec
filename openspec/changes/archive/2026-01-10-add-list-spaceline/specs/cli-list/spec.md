## ADDED Requirements

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

## MODIFIED Requirements

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
