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
  - Blocked by (when `depends_on` is set in `.openspec.yaml` and names at least one still-active change)

#### Scenario: Displaying spec list
- **WHEN** displaying the list of specs
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")

#### Scenario: Change without depends_on
- **WHEN** a change's `.openspec.yaml` does not set `depends_on`
- **THEN** its row omits the "Blocked by" value without breaking table alignment

#### Scenario: Dependency still active
- **WHEN** a change's `depends_on` names a change that is still active (not archived)
- **THEN** its row's "Blocked by" value includes that name

#### Scenario: Dependency archived
- **WHEN** a change's `depends_on` names a change that has been archived
- **THEN** its row's "Blocked by" value excludes that name, since the dependency is already satisfied

## ADDED Requirements

### Requirement: JSON Output Includes Depends On
The command's `--json` output for changes SHALL include the raw `depends_on` array when set in the change's metadata.

#### Scenario: JSON output with depends_on present
- **WHEN** `openspec list --json` is executed and a change's `.openspec.yaml` sets `depends_on`
- **THEN** that change's JSON entry includes `depends_on` with the array exactly as written, whether or not any named dependency is still active

#### Scenario: JSON output with depends_on absent
- **WHEN** `openspec list --json` is executed and a change's `.openspec.yaml` does not set `depends_on`
- **THEN** that change's JSON entry omits the `depends_on` key
