## MODIFIED Requirements

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
