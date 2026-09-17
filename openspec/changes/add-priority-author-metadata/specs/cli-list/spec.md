## MODIFIED Requirements

### Requirement: Output Format
The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts.

#### Scenario: Displaying change list (default)
- **WHEN** displaying the list of changes
- **THEN** show a table with columns:
  - Change name (directory name)
  - Task progress (e.g., "3/5 tasks" or "✓ Complete")
  - Priority (when set in `.openspec.yaml`, e.g. "high")
  - Author (when set in `.openspec.yaml`)

#### Scenario: Displaying spec list
- **WHEN** displaying the list of specs
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")

#### Scenario: Change without priority or author
- **WHEN** a change's `.openspec.yaml` sets neither `priority` nor `author`
- **THEN** its row omits those columns' values without breaking table alignment

## ADDED Requirements

### Requirement: JSON Output Includes Priority and Author
The command's `--json` output for changes SHALL include `priority` and `author` fields when set in the change's metadata.

#### Scenario: JSON output with metadata present
- **WHEN** `openspec list --json` is executed and a change's `.openspec.yaml` sets `priority` and `author`
- **THEN** that change's JSON entry includes `priority` and `author` with those values

#### Scenario: JSON output with metadata absent
- **WHEN** `openspec list --json` is executed and a change's `.openspec.yaml` sets neither field
- **THEN** that change's JSON entry omits the `priority` and `author` keys
