## MODIFIED Requirements

### Requirement: Output Format
The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts.

#### Scenario: Displaying change list (default)
- **WHEN** displaying the list of changes
- **THEN** show a table with columns:
  - Priority (when set in `.openspec.yaml`, e.g. "high")
  - Change name (directory name)
  - Task progress (e.g., "3/5 tasks" or "✓ Complete")
  - Author (when set in `.openspec.yaml`)

#### Scenario: Displaying spec list
- **WHEN** displaying the list of specs
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")

#### Scenario: Priority column included only when some change sets it
- **WHEN** displaying the list of changes and at least one listed change's `.openspec.yaml` sets `priority`
- **THEN** the table includes a Priority column, with an empty cell for any row whose change does not set `priority`

#### Scenario: Author column included only when some change sets it
- **WHEN** displaying the list of changes and at least one listed change's `.openspec.yaml` sets `author`
- **THEN** the table includes an Author column, with an empty cell for any row whose change does not set `author`

#### Scenario: Legacy layout when no change sets priority or author
- **WHEN** displaying the list of changes and no listed change's `.openspec.yaml` sets `priority` or `author`
- **THEN** the table renders with only the Change name and Task progress columns, unchanged from today's layout

## ADDED Requirements

### Requirement: JSON Output Includes Priority and Author
The command's `--json` output for changes SHALL include `priority` and `author` fields when set in the change's metadata.

#### Scenario: JSON output with metadata present
- **WHEN** `openspec list --json` is executed and a change's `.openspec.yaml` sets `priority` and `author`
- **THEN** that change's JSON entry includes `priority` and `author` with those values

#### Scenario: JSON output with metadata absent
- **WHEN** `openspec list --json` is executed and a change's `.openspec.yaml` sets neither field
- **THEN** that change's JSON entry omits the `priority` and `author` keys
