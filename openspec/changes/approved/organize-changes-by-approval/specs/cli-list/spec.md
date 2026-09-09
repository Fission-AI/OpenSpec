## MODIFIED Requirements

### Requirement: Command Execution
The command SHALL scan and analyze either active changes or specs based on the selected mode.

#### Scenario: Scanning for changes (default)
- **WHEN** `openspec list` is executed without flags
- **THEN** scan proposed, approved, and legacy active change directories in the selected planning root
- **AND** exclude archive, hidden directories, and the proposed and approved container directories themselves from results
- **AND** parse each change's `tasks.md` file to count task completion

#### Scenario: Scanning for specs
- **WHEN** `openspec list --specs` is executed
- **THEN** scan the `openspec/specs/` directory for capabilities
- **AND** read each capability's `spec.md`
- **AND** parse requirements to compute requirement counts

#### Scenario: Windows discovery
- **WHEN** changes exist in both proposed and approved on Windows
- **THEN** both are listed by their bare names with the same approval and progress semantics as on macOS and Linux
