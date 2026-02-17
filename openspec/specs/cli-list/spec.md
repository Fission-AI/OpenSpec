# List Command Specification

## Purpose

The `openspec list` command SHALL provide developers with a quick overview of all active changes, specs, or archived changes in the project, showing names and task/requirement completion as appropriate.
## Requirements
### Requirement: Command Execution
The command SHALL scan and analyze active changes, specs, or archived changes based on the selected mode.

#### Scenario: Scanning for changes (default)
- **WHEN** `openspec list` is executed without flags (or with `--changes`)
- **THEN** scan the `openspec/changes/` directory for change directories
- **AND** exclude the `archive/` subdirectory from results
- **AND** parse each change's `tasks.md` file to count task completion

#### Scenario: Scanning for specs
- **WHEN** `openspec list --specs` is executed
- **THEN** scan the `openspec/specs/` directory for capabilities
- **AND** read each capability's `spec.md`
- **AND** parse requirements to compute requirement counts

#### Scenario: Scanning for archived changes
- **WHEN** `openspec list --archive` is executed
- **THEN** scan the archive directory (`openspec/changes/archive/` on the target path, using path.join for the platform) for direct child directories
- **AND** list each directory as an archived change and parse tasks.md and last-modified time when producing output

### Requirement: Task Counting

The command SHALL accurately count task completion status using standard markdown checkbox patterns.

#### Scenario: Counting tasks in tasks.md

- **WHEN** parsing a `tasks.md` file
- **THEN** count tasks matching these patterns:
  - Completed: Lines containing `- [x]`
  - Incomplete: Lines containing `- [ ]`
- **AND** calculate total tasks as the sum of completed and incomplete

### Requirement: Output Format
The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts when `--json` is not provided, or output JSON when `--json` is provided.

#### Scenario: Displaying change list (default)
- **WHEN** displaying the list of changes without `--json`
- **THEN** show a table with columns:
  - Change name (directory name)
  - Task progress (e.g., "3/5 tasks" or "✓ Complete")

#### Scenario: Displaying spec list
- **WHEN** displaying the list of specs without `--json`
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")

#### Scenario: JSON output for specs
- **WHEN** `openspec list --specs --json` is executed without `--detail`
- **THEN** output a JSON object with key `specs` and an array of objects with `id` and `requirementCount` only
- **AND** output `{ "specs": [] }` when no specs exist

#### Scenario: JSON output for specs with detail
- **WHEN** `openspec list --specs --json --detail` is executed
- **THEN** output a JSON object with key `specs` and an array of objects with `id`, `requirementCount`, `title`, and `overview`
- **AND** `title` SHALL be the spec's display title (from document H1 or spec id)
- **AND** `overview` SHALL be the spec's Purpose section content
- **AND** output `{ "specs": [] }` when no specs exist

#### Scenario: Displaying archive list
- **WHEN** displaying the list of archived changes without `--json`
- **THEN** show a table with columns: archived change name (directory name), task progress, and last modified (e.g. relative time)

#### Scenario: JSON output for archive
- **WHEN** `openspec list --archive --json` is executed
- **THEN** output a JSON object with key `archivedChanges` and an array of objects with `name`, `completedTasks`, `totalTasks`, `lastModified` (ISO string), and `status`

### Requirement: Flags
The command SHALL accept flags to select the noun being listed. When more than one of `--changes`, `--specs`, or `--archive` is provided, the effective mode SHALL be determined by precedence: `--archive` overrides `--specs`, `--specs` overrides default (changes). The command SHALL accept a `--detail` flag that, when used with `--specs --json`, causes each spec entry to include `title` and `overview`.

#### Scenario: Selecting specs
- **WHEN** `--specs` is provided
- **THEN** list specs instead of changes

#### Scenario: Selecting changes
- **WHEN** `--changes` is provided
- **THEN** list changes explicitly (same as default behavior)

#### Scenario: Selecting archive
- **WHEN** `--archive` is provided
- **THEN** list archived changes (directories under openspec/changes/archive/)

#### Scenario: Mode precedence
- **WHEN** more than one of `--changes`, `--specs`, or `--archive` is provided
- **THEN** the effective mode SHALL be determined by precedence: `--archive` overrides `--specs`, `--specs` overrides default (changes)

#### Scenario: Requesting detail for spec list JSON
- **WHEN** `--detail` is provided together with `--specs --json`
- **THEN** each object in the `specs` array SHALL include `title` and `overview` in addition to `id` and `requirementCount`
- **AND** when `--detail` is omitted, spec list JSON SHALL remain unchanged (id and requirementCount only)

### Requirement: Empty State
The command SHALL provide clear feedback when no items are present for the selected mode.

#### Scenario: Handling empty state (changes)
- **WHEN** no active changes exist (only archive/ or empty changes/)
- **THEN** display: "No active changes found."

#### Scenario: Handling empty state (specs)
- **WHEN** no specs directory exists or contains no capabilities
- **THEN** display: "No specs found." (or output `{ "specs": [] }` with `--json`)

#### Scenario: Handling empty state (archive)
- **WHEN** `openspec list --archive` is executed and the archive directory is missing or has no subdirectories
- **THEN** display: "No archived changes found." (without `--json`) or output `{ "archivedChanges": [] }` (with `--json`)
- **AND** exit with code 0

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

The command SHALL maintain consistent ordering for predictable output. For changes and archive mode, order SHALL follow the `--sort` option (default "recent": by last modified descending; "name": alphabetical by name). For specs mode, order SHALL be alphabetical by spec id.

#### Scenario: Ordering changes

- **WHEN** displaying multiple changes
- **THEN** sort them according to `--sort`: "recent" (default) by last modified descending, or "name" by change name alphabetical

#### Scenario: Ordering archived changes

- **WHEN** displaying multiple archived changes
- **THEN** sort them according to `--sort`: "recent" (default) or "name", same as for active changes

## Why

Developers need a quick way to:
- See what changes are in progress
- Identify which changes are ready to archive
- Understand the overall project evolution status
- Get a bird's-eye view without opening multiple files

This command provides that visibility with minimal effort, following OpenSpec's philosophy of simplicity and clarity.