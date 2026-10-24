## MODIFIED Requirements

### Requirement: Bulk and filtered validation

The validate command SHALL support flags for bulk validation (--all) and filtered validation by type (--changes, --specs).

#### Scenario: Validate everything

- **WHEN** executing `openspec validate --all`
- **THEN** validate all changes in each discovered library's openspec/changes/ (excluding archive)
- **AND** validate all specs in each discovered library's openspec/specs/
- **AND** display a summary showing passed/failed items
- **AND** exit with code 1 if any validation fails

#### Scenario: Scope of bulk validation

- **WHEN** validating with `--all` or `--changes`
- **THEN** include all change proposals under each discovered library's `openspec/changes/`
- **AND** exclude the `openspec/changes/archive/` directory

- **WHEN** validating with `--specs`
- **THEN** include all specs that have a `spec.md` under each discovered library's `openspec/specs/<capability-path>/spec.md`

#### Scenario: Validate all changes

- **WHEN** executing `openspec validate --changes`
- **THEN** validate all changes in each discovered library's openspec/changes/ (excluding archive)
- **AND** display results for each change
- **AND** show summary statistics

#### Scenario: Validate all specs

- **WHEN** executing `openspec validate --specs`
- **THEN** validate all specs in each discovered library's openspec/specs/
- **AND** display results for each spec
- **AND** show summary statistics

#### Scenario: Library-aware validation results
- **WHEN** bulk validation spans multiple local libraries
- **THEN** group results by relative library and include owning library metadata in JSON items
- **AND** retain distinct results for repeated item identifiers

#### Scenario: Direct descendant validation
- **WHEN** validate names an item found uniquely in a descendant library
- **THEN** validate against that library's specs and schemas

#### Scenario: Partial validation failure
- **WHEN** one discovered library cannot be inspected
- **THEN** continue validating readable libraries and report an actionable library diagnostic
- **AND** exit nonzero

