## Purpose

Lets tests and other evidence point at the spec scenarios they verify, so a project can see which behavior is linked to proof and which is not, without adding structure to specs.

## ADDED Requirements

### Requirement: Scenario references in project files
The system SHALL recognize a reference of the form `@spec <capability-path> > <Requirement name>` optionally followed by ` > <Scenario name>`, on any line of a git-tracked text file. Names SHALL match using the same normalization archive applies to requirement headings.

#### Scenario: Reference to a scenario
- **WHEN** a test file contains `// @spec cli-archive > Archive refuses scenario loss > MODIFIED block drops a scenario`
- **THEN** the reference links that file and line to that scenario

#### Scenario: Reference to a whole requirement
- **WHEN** a reference names a capability and a requirement but no scenario
- **THEN** the reference links to the requirement as a whole

#### Scenario: Name containing a hash
- **WHEN** a requirement is named `Parse C# projects`
- **THEN** `@spec parsers > Parse C# projects` links to it

### Requirement: Coverage report
`openspec spec coverage [spec-id]` SHALL list every scenario in the main specs, or in the given spec only, as linked (with each referencing `file:line`) or unlinked. It SHALL read main specs from the resolved OpenSpec root, including a configured store. With `--json`, it SHALL emit the same data as a JSON document.

#### Scenario: Linked and unlinked scenarios
- **WHEN** one scenario of a requirement has a reference and another has none
- **THEN** the report lists the first as linked with its `file:line` and the second as unlinked

#### Scenario: Requirement-level reference
- **WHEN** a reference names only a requirement
- **THEN** the report shows that link on the requirement, and does not count its scenarios as linked

### Requirement: Dangling references are reported
The report SHALL list every reference that matches no current requirement or scenario as dangling. It SHALL give the file, the line, and the nearest existing name when one is close.

#### Scenario: Requirement renamed after the test was written
- **WHEN** a test references `cli-archive > Old name` and the requirement is now `New name`
- **THEN** the report lists the reference as dangling, with `New name` as the nearest match

### Requirement: The report is advisory
`openspec spec coverage` SHALL exit with status 0 whatever it finds, including unlinked scenarios, dangling references, or no git repository to scan. It SHALL NOT change the behavior or exit code of `validate` or `archive`.

#### Scenario: Nothing is linked
- **WHEN** a project has no `@spec` references
- **THEN** every scenario is reported as unlinked and the command exits 0

#### Scenario: Outside a git repository
- **WHEN** the command runs where no git repository can be found
- **THEN** it reports that it cannot scan for references and exits 0
