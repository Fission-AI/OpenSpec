## MODIFIED Requirements
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
