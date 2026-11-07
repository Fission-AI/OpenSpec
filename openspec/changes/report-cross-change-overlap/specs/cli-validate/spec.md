## ADDED Requirements

### Requirement: Bulk validation SHALL report requirements that more than one active change claims

When active changes are in scope of a bulk validation (`--changes` or `--all`), the `validate` command SHALL report each requirement that two or more active changes claim in their delta specs. A requirement is identified by its spec id and its normalized name. The report SHALL be advisory: it SHALL NOT change the exit code, SHALL NOT fail the run, and SHALL NOT state which change is wrong or which archive order is correct.

#### Scenario: Two changes modify the same requirement

- **WHEN** two active changes each have a MODIFIED block for the same requirement in the same spec
- **AND** that requirement exists in the main spec
- **THEN** human output SHALL include one advisory entry naming the spec, the requirement, and `(in the main spec)`
- **AND** the entry SHALL list both changes with the operation each applies

#### Scenario: Two changes add the same requirement

- **WHEN** two active changes each ADD a requirement with the same name to the same spec
- **AND** the main spec does not hold that requirement
- **THEN** the entry SHALL say `(not in the main spec yet)`

#### Scenario: A rename claims both of its names

- **WHEN** one active change RENAMES a requirement from an old name to a new name
- **AND** a second active change claims the old name, and a third claims the new name
- **THEN** the report SHALL include an entry for the old name listing `RENAMED_FROM` beside the second change's operation
- **AND** an entry for the new name listing `RENAMED_TO` beside the third change's operation

#### Scenario: One change never overlaps itself

- **WHEN** a single change is the only claimant of a requirement, including a change whose RENAMED pair names it twice
- **THEN** no overlap SHALL be reported for that requirement

#### Scenario: The same name in different specs is not an overlap

- **WHEN** two active changes claim requirements with the same name in two different specs
- **THEN** no overlap SHALL be reported

#### Scenario: Overlap never changes the exit code

- **WHEN** every change in scope is valid and an overlap exists
- **THEN** validation SHALL exit 0
- **AND WHEN** a change in scope is invalid and an overlap exists
- **THEN** validation SHALL exit 1 exactly as it would without the overlap

#### Scenario: Nothing is printed when nothing overlaps

- **WHEN** no requirement is claimed by more than one active change
- **THEN** human output SHALL be unchanged from validation without this report

#### Scenario: JSON output carries an overlaps array whenever changes are in scope

- **WHEN** a user runs `validate --changes --json` or `validate --all --json`
- **THEN** the full v1 document SHALL include an `overlaps` array, empty when nothing overlaps and also when the scope holds no changes
- **AND** each entry SHALL carry `specId`, `requirement`, `inMainSpec`, and `claimants`, where each claimant carries `changeId`, `operation`, and `requirement`
- **AND** `operation` SHALL be one of `ADDED`, `MODIFIED`, `REMOVED`, `RENAMED_FROM`, `RENAMED_TO`

#### Scenario: No overlaps field without changes in scope

- **WHEN** a user runs `validate --specs --json` or `validate --archived --json`
- **THEN** the document SHALL NOT include an `overlaps` field

#### Scenario: The findings report is unchanged

- **WHEN** a user runs bulk validation with `--report findings`
- **THEN** the findings document SHALL NOT include overlaps
- **AND** the overlap scan SHALL NOT run

#### Scenario: Targeted validation does not scan

- **WHEN** a user validates a single named change
- **THEN** no overlap report SHALL be produced

#### Scenario: The scan reads what archive applies

- **WHEN** a change stores delta specs under nested capability paths
- **THEN** the scan SHALL find them with the same discovery archive uses and report their nested spec ids
- **AND WHEN** a run selects a store
- **THEN** the scan SHALL read that store's changes and main specs

#### Scenario: An unreadable change is skipped

- **WHEN** a change's delta files cannot be read during the scan
- **THEN** the scan SHALL skip that change without an error of its own
- **AND** overlaps among the remaining changes SHALL still be reported
- **AND** the change's own validation SHALL report the problem as it does today

#### Scenario: Output order is stable

- **WHEN** overlaps are reported
- **THEN** they SHALL be ordered by spec id and then requirement name, with claimants ordered by change id and then operation
- **AND** the order SHALL NOT depend on the locale of the machine
