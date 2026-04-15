## ADDED Requirements

### Requirement: Archive ADR Changes

The `openspec archive` command SHALL apply ADR deltas from change proposals to the `openspec/adrs/` directory using the same delta-based approach as specs.

#### Scenario: Archiving change with ADR deltas

- **WHEN** running `openspec archive [change-name]`
- **THEN** the command SHALL process ADR deltas in `changes/[change-name]/adrs/`
- **AND** apply delta operations to `openspec/adrs/` directory
- **AND** process in order: RENAMED → REMOVED → MODIFIED → ADDED
- **AND** update both specs and ADRs atomically

#### Scenario: Processing ADDED ADR decisions

- **WHEN** archiving a change with `## ADDED Decisions`
- **THEN** the command SHALL create new ADR directory under `openspec/adrs/[decision-name]/`
- **AND** copy both files from the delta:
  - `decision.md` - Decision summary
  - `adr.md` - Full rationale
- **AND** validate that the decision doesn't already exist
- **AND** report errors if conflicts are detected

#### Scenario: Processing MODIFIED ADR decisions

- **WHEN** archiving a change with `## MODIFIED Decisions`
- **THEN** the command SHALL locate the existing ADR by header matching
- **AND** update the modified file(s):
  - Replace `decision.md` if present in delta
  - Replace `adr.md` if present in delta
  - Preserve files not included in delta
- **AND** preserve the directory structure
- **AND** report errors if the referenced decision doesn't exist

#### Scenario: Processing REMOVED ADR decisions

- **WHEN** archiving a change with `## REMOVED Decisions`
- **THEN** the command SHALL delete the entire ADR directory (both files)
- **AND** validate that the decision exists before removal
- **AND** report errors if the decision doesn't exist
- **AND** log the removal reason for audit purposes

#### Scenario: Processing RENAMED ADR decisions

- **WHEN** archiving a change with `## RENAMED Decisions`
- **THEN** the command SHALL rename the ADR directory from old to new name
- **AND** update the headers in both files to match new name:
  - `# Decision:` in decision.md
  - `# ADR:` in adr.md
- **AND** validate that FROM decision exists and TO decision doesn't
- **AND** process renames before other operations to avoid conflicts

#### Scenario: Combined spec and ADR archiving

- **WHEN** archiving a change with both spec and ADR deltas
- **THEN** the command SHALL apply both sets of deltas
- **AND** validate both specs and ADRs before applying changes
- **AND** apply changes atomically (all or nothing)
- **AND** roll back all changes if any delta application fails

#### Scenario: Skip ADR archiving

- **WHEN** running `openspec archive [change-name] --skip-adrs`
- **THEN** the command SHALL archive only spec deltas
- **AND** move the change to archive without applying ADR deltas
- **AND** leave ADR deltas in the archived change for future reference

#### Scenario: ADR archiving conflicts

- **WHEN** ADR delta operations conflict with current state
- **THEN** the command SHALL detect conflicts before applying changes
- **AND** report specific conflict details (which decision, what conflict)
- **AND** require manual resolution before proceeding
- **AND** provide guidance on resolving conflicts

#### Scenario: Archive with no ADR deltas

- **WHEN** archiving a change with no ADR deltas
- **THEN** the command SHALL skip ADR processing
- **AND** archive only spec deltas if present
- **AND** move the change to archive normally

#### Scenario: Validate before archive

- **WHEN** running `openspec archive [change-name]`
- **THEN** the command SHALL validate all ADR deltas before applying
- **AND** check for structural correctness, conflicts, and missing references
- **AND** abort archiving if validation fails
- **AND** display validation errors clearly
