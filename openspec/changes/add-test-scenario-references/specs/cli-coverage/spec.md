## ADDED Requirements

### Requirement: Report which scenarios the project's tests reference

The system SHALL provide an `openspec coverage` command that collects the scenario references declared in a project, resolves each one against the project's specs, and reports both the references that did not resolve and the scenarios that nothing references. The command SHALL read files and specs only; it SHALL NOT run a test suite, write to the project, or contact the network.

#### Scenario: Human report leads with the problems

- **WHEN** a user runs `openspec coverage` in a project
- **THEN** the report names the scan scope first, then every malformed, unresolved and ambiguous reference with its file and line, then a summary of scenarios and references
- **AND** each finding carries the repair for that outcome: the canonical spelling for a malformed reference, the missing part for an unresolved one, the expanded references to choose from for an ambiguous one
- **AND** resolved references whose declared spelling is not the canonical one are collected under a separate note, naming the canonical reference, without being counted as findings or affecting exit status
- **AND** the full list of unreferenced scenarios is summarized as a count per capability rather than printed in full
- **AND** a project with no reference problems reports that plainly

#### Scenario: A project that has not adopted the convention still reports

- **GIVEN** a project whose files declare no references
- **WHEN** a user runs `openspec coverage`
- **THEN** the report shows zero references and every scenario unreferenced
- **AND** the command exits successfully
- **AND** the output does not present an unadopted project as a failure

#### Scenario: Canonical references are reported for unreferenced scenarios

- **GIVEN** a capability with unreferenced scenarios
- **WHEN** a user asks for those scenarios
- **THEN** each one is reported with the canonical reference to paste into a test
- **AND** that reference is the short form when the scenario segment is unique in its capability, and the expanded form otherwise

#### Scenario: Coverage requires an OpenSpec project

- **GIVEN** a directory with no resolvable OpenSpec root
- **WHEN** a user runs `openspec coverage`
- **THEN** the command reports the existing missing-root diagnostic and exits with the existing nonzero status
- **AND** no files are scanned

#### Scenario: Coverage never runs or reads test results

- **WHEN** coverage runs for any project
- **THEN** no test command, build step or package script is executed
- **AND** no coverage data from a test runner is read
- **AND** the report is derived only from file contents and the project's specs

### Requirement: A coverage scan bounds the files it reads and says what it read

The command SHALL enumerate candidate files from the project's own ignore rules where it can, SHALL never read outside the resolved OpenSpec root, and SHALL report which enumeration ran along with the number of files read and skipped. A scan whose scope is wrong SHALL be visible in the report rather than reported as unreferenced scenarios.

#### Scenario: A git work tree uses the project's ignore rules

- **GIVEN** an OpenSpec root inside a git work tree
- **WHEN** coverage enumerates candidate files
- **THEN** candidates are the tracked and non-ignored untracked files git reports
- **AND** ignored build output is not read, so an annotation copied into a build directory is not counted twice
- **AND** the report states that the git enumeration ran

#### Scenario: Without git the walk is declared

- **GIVEN** an OpenSpec root that is not in a git work tree, or a machine where git cannot be run
- **WHEN** coverage enumerates candidate files
- **THEN** candidates come from a directory walk that excludes `node_modules` and `.git`
- **AND** the report states that the walk ran instead of the git enumeration
- **AND** the report does not claim that ignored files were excluded

#### Scenario: The spec tree and the git directory are never scanned

- **GIVEN** any project and any configuration
- **WHEN** coverage scans for annotations
- **THEN** `openspec/` and `.git/` are not read for annotations
- **AND** an annotation quoted as an example inside a spec declares no reference
- **AND** no configuration option can bring either path into the scan

#### Scenario: Unreadable and oversized files are skipped and counted

- **GIVEN** a candidate file that contains a NUL byte in its first 8 KiB, exceeds 2 MiB, or cannot be read
- **WHEN** coverage scans
- **THEN** the file is skipped rather than failing the command
- **AND** the report counts it under its reason
- **AND** the scan continues with the remaining candidates

#### Scenario: The scan stays inside the root

- **GIVEN** a candidate path that resolves outside the OpenSpec root, including through a directory symlink
- **WHEN** coverage scans
- **THEN** that path is not read
- **AND** it is counted as skipped for leaving the root
- **AND** the same decision is made on Windows, macOS and Linux

#### Scenario: Configuration can narrow a scan but not widen it

- **GIVEN** `coverage.include` or `coverage.exclude` globs in the project configuration
- **WHEN** coverage scans
- **THEN** the globs narrow the candidate list
- **AND** neither can reach past the paths that are never scanned
- **AND** the report states that a narrowing configuration applied

#### Scenario: Scan scope is reported on every run

- **WHEN** coverage completes for any project
- **THEN** the report includes the enumeration that ran, the number of files read, and the number skipped by reason
- **AND** those counts appear in both the human and JSON reports

### Requirement: Coverage reporting has a machine-readable report

The command SHALL support `--json`, emitting exactly one JSON document on stdout with a stable, schema-versioned shape for editors, agents and scripts. JSON runs SHALL write nothing else to stdout.

#### Scenario: The JSON document is one stable envelope

- **WHEN** a user runs `openspec coverage --json` in a project
- **THEN** stdout contains exactly one valid JSON document
- **AND** the document contains `schemaVersion: 1`, `root`, `scan`, `references`, `scenarios` and `summary`
- **AND** `scan` contains `enumeration`, `filesRead` and `filesSkipped`
- **AND** `root` retains the existing resolved-root envelope

#### Scenario: Every reference appears with its outcome

- **GIVEN** a project declaring references
- **WHEN** JSON output is produced
- **THEN** each entry in `references` contains `file`, `line`, `reference` and `status`
- **AND** `status` is one of `resolved`, `malformed`, `unresolved` or `ambiguous`
- **AND** a resolved entry names the `capability`, `requirement` and `scenario` it resolved to
- **AND** a resolved entry carries the `canonicalReference` for that scenario, and says whether the declared reference differs from it
- **AND** a `malformed`, `unresolved` or `ambiguous` entry carries a `message` stating the repair
- **AND** `file` is reported relative to the OpenSpec root using `/` separators on every platform

#### Scenario: Every scenario appears with its references

- **WHEN** JSON output is produced
- **THEN** each entry in `scenarios` contains `capability`, `requirement`, `scenario` and `canonicalReference`
- **AND** each entry lists the `file` and `line` of every reference that resolved to it
- **AND** a scenario nothing references lists an empty set rather than being omitted

#### Scenario: Summary counts are explicit

- **WHEN** JSON output is produced
- **THEN** `summary` contains the number of capabilities, requirements and scenarios indexed
- **AND** the number of scenarios that are referenced and the number that are not
- **AND** the number of references by status
- **AND** those counts are consistent with the `references` and `scenarios` collections in the same document

#### Scenario: JSON runs emit nothing else

- **WHEN** coverage runs with `--json`
- **THEN** stdout contains no human text, telemetry notice, completion tip or color escape sequence
- **AND** diagnostics that would be printed for a human go to stderr

### Requirement: Coverage reporting is advisory

A broken reference SHALL fail the `coverage` command, and an unreferenced scenario SHALL NOT. No other command's behavior SHALL change, and nothing in the workflow SHALL require references to exist.

#### Scenario: Broken references fail the command

- **GIVEN** a project with at least one malformed, unresolved or ambiguous reference
- **WHEN** a user runs `openspec coverage`, with or without `--json`
- **THEN** the command exits with code 1
- **AND** the report still lists every reference and scenario it found

#### Scenario: Unreferenced scenarios do not fail the command

- **GIVEN** a project where every declared reference resolves and some scenarios are unreferenced
- **WHEN** a user runs `openspec coverage`
- **THEN** the command exits successfully
- **AND** the unreferenced scenarios are reported as information

#### Scenario: No other command changes

- **WHEN** `openspec validate`, `openspec archive`, `openspec status` or any workflow runs
- **THEN** their behavior, output and exit status are unchanged by this capability
- **AND** none of them collects or resolves references
- **AND** no command requires a scenario to have a reference

#### Scenario: Coverage behaves the same across platforms

- **WHEN** the same project is scanned on Windows, macOS and Linux
- **THEN** the enumeration, the set of files read, the reference outcomes, the counts and the exit status are equivalent
- **AND** paths in the report use `/` separators relative to the root on all three
- **AND** files differing only by case on a case-insensitive file system are read once
