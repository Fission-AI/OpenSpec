## MODIFIED Requirements

### Requirement: Command Execution
The command SHALL scan and analyze either active changes or specs based on the selected mode.

#### Scenario: Scanning for changes (default)
- **WHEN** `openspec list` is executed without flags
- **THEN** scan the `openspec/changes/` directory for change directories
- **AND** exclude the `archive/` subdirectory from results
- **AND** parse each change's `tasks.md` file to count task completion

#### Scenario: Scanning for specs
- **WHEN** `openspec list --specs` is executed
- **THEN** recursively scan the `openspec/specs/` directory tree for capabilities at any depth
- **AND** read each capability's `spec.md`
- **AND** parse requirements to compute requirement counts

#### Scenario: Scanning for specs in subtree
- **WHEN** `openspec list --specs cli/` is executed
- **THEN** recursively scan only specs whose ID starts with `cli/` at a segment boundary (i.e., the character after the prefix must be a path separator or the prefix must end with `/`)
- **AND** display them with their full hierarchical IDs
- **AND** `cli/` matches `cli/show` and `cli/bar/baz` but NOT `client/foo`

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
  - Spec id (full hierarchical path, e.g., `cli/show` or `cli-show`)
  - Requirement count (e.g., "requirements 12")

### Requirement: Sorting

The command SHALL maintain consistent ordering of items for predictable output.

#### Scenario: Ordering changes

- **WHEN** displaying multiple changes
- **THEN** sort them in alphabetical order by change name

#### Scenario: Ordering specs

- **WHEN** displaying multiple specs
- **THEN** sort them in alphabetical order by full spec ID
- **AND** hierarchical IDs sort naturally (e.g., `cli/archive` before `cli/show`)
