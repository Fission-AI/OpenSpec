# List Command Specification (Delta)

This delta extends the list command with JSON output for specs mode and an archive listing mode.

## ADDED Requirements

### Requirement: JSON output for specs mode

When `--json` is provided in specs mode, the command SHALL output a single JSON object to stdout with root key `specs` and an array of objects, each with `id` (string) and `requirementCount` (number). When no specs exist, the command SHALL output `{ "specs": [] }`.

#### Scenario: JSON output in specs mode

- **WHEN** `openspec list --specs --json` is executed
- **THEN** output a JSON object with key `specs` and an array of objects each with `id` and `requirementCount`
- **AND** use path.join (or equivalent) when resolving spec directories so behavior is correct on Windows, macOS, and Linux

#### Scenario: JSON output when no specs exist

- **WHEN** `openspec list --specs --json` is executed and no specs exist
- **THEN** output exactly `{ "specs": [] }`

### Requirement: Archive listing mode

The command SHALL support a third mode, archive, so that listing shows archived changes (directories under `openspec/changes/archive/` on the target path). Archive mode SHALL support the same `--sort` and `--json` options as changes mode.

#### Scenario: Scanning for archived changes

- **WHEN** `openspec list --archive` is executed
- **THEN** scan the archive directory (constructed with path.join for the platform) for direct child directories
- **AND** list each directory as an archived change
- **AND** parse each change's tasks.md and last-modified time when producing output

#### Scenario: Archive mode with JSON

- **WHEN** `openspec list --archive --json` is executed
- **THEN** output a JSON object with key `archivedChanges` and an array of objects with `name`, `completedTasks`, `totalTasks`, `lastModified` (ISO 8601 string), and `status`
- **AND** when no archived changes exist, output `{ "archivedChanges": [] }`

#### Scenario: Archive empty or missing directory

- **WHEN** `openspec list --archive` is executed and the archive directory is missing or contains no subdirectories
- **THEN** display "No archived changes found." (without --json) or output `{ "archivedChanges": [] }` (with --json)
- **AND** exit with code 0

### Requirement: Mode precedence

When more than one of `--changes`, `--specs`, or `--archive` is provided, the command SHALL use a single effective mode according to fixed precedence: `--archive` overrides `--specs`, and `--specs` overrides default (changes).

#### Scenario: Precedence when multiple flags given

- **WHEN** the user passes both `--specs` and `--archive`
- **THEN** the effective mode SHALL be archive

## MODIFIED Requirements

### Requirement: Flags

The command SHALL accept flags to select the noun being listed.

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

### Requirement: Output Format

The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts when --json is not provided, or output JSON when --json is provided.

#### Scenario: Displaying change list (default)

- **WHEN** displaying the list of changes without --json
- **THEN** show a table with columns:
  - Change name (directory name)
  - Task progress (e.g., "3/5 tasks" or "✓ Complete")

#### Scenario: Displaying spec list

- **WHEN** displaying the list of specs without --json
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")

#### Scenario: JSON output for specs

- **WHEN** `openspec list --specs --json` is executed
- **THEN** output a JSON object with key `specs` and an array of objects with `id` and `requirementCount`
- **AND** output `{ "specs": [] }` when no specs exist

#### Scenario: Displaying archive list

- **WHEN** displaying the list of archived changes without --json
- **THEN** show a table with columns: archived change name (directory name), task progress, and last modified (e.g. relative time)

#### Scenario: JSON output for archive

- **WHEN** `openspec list --archive --json` is executed
- **THEN** output a JSON object with key `archivedChanges` and an array of objects with `name`, `completedTasks`, `totalTasks`, `lastModified` (ISO string), and `status`

### Requirement: Empty State

The command SHALL provide clear feedback when no items are present for the selected mode.

#### Scenario: Handling empty state (changes)

- **WHEN** no active changes exist (only archive/ or empty changes/)
- **THEN** display: "No active changes found."

#### Scenario: Handling empty state (specs)

- **WHEN** no specs directory exists or contains no capabilities
- **THEN** display: "No specs found."

#### Scenario: Handling empty state (archive)

- **WHEN** `openspec list --archive` is executed and the archive directory is missing or has no subdirectories
- **THEN** display: "No archived changes found." (without --json) or output `{ "archivedChanges": [] }` (with --json)
- **AND** exit with code 0

### Requirement: Sorting

The command SHALL maintain consistent ordering for predictable output. For changes and archive mode, order SHALL follow the `--sort` option (default "recent": by last modified descending; "name": alphabetical by name). For specs mode, order SHALL be alphabetical by spec id.

#### Scenario: Ordering changes

- **WHEN** displaying multiple changes
- **THEN** sort them according to --sort: "recent" (default) by last modified descending, or "name" by change name alphabetical

#### Scenario: Ordering archived changes

- **WHEN** displaying multiple archived changes
- **THEN** sort them according to --sort: "recent" (default) or "name", same as for active changes
