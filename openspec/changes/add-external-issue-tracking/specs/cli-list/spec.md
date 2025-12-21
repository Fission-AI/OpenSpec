## MODIFIED Requirements

### Requirement: Output Format
The command SHALL display items in a clear, readable table format with mode-appropriate progress or counts, including tracked issue references when available.

#### Scenario: Displaying change list (default)
- **WHEN** displaying the list of changes
- **THEN** show a table with columns:
  - Change name (directory name)
  - Tracked issue identifier (if present in frontmatter, e.g., "(SM-123)")
  - Task progress (e.g., "3/5 tasks" or "✓ Complete")

#### Scenario: Displaying change with tracked issue
- **WHEN** a change has `tracked-issues` in proposal.md frontmatter
- **THEN** display the first issue identifier in parentheses after the change name
- **AND** format as: `change-name (ISSUE-ID) [task progress]`

#### Scenario: Displaying change without tracked issue
- **WHEN** a change has no `tracked-issues` in proposal.md frontmatter
- **THEN** display the change without issue identifier
- **AND** format as: `change-name [task progress]`

#### Scenario: Displaying spec list
- **WHEN** displaying the list of specs
- **THEN** show a table with columns:
  - Spec id (directory name)
  - Requirement count (e.g., "requirements 12")
