## ADDED Requirements

### Requirement: Bulk validation SHALL provide an opt-in item-findings report

The `validate` command SHALL support `--report full` and `--report findings` for explicit, unambiguous bulk scopes. Omitting `--report` SHALL retain current targeted, interactive, bulk, human, and JSON behavior. Findings mode SHALL return whole issue-bearing item records separately from top-level advisories while preserving full item order, complete requested-scope totals, root selection, issue severities, strict-mode semantics, and exit status.

#### Scenario: Default and explicit bulk full output remain compatible

- **WHEN** a user runs bulk validation without `--report` or with `--report full`
- **THEN** human output SHALL retain the current complete item listing and totals
- **AND** JSON output SHALL retain the documented full-v1 top-level `version: "1.0"` and complete `items` collection
- **AND** the two bulk invocations SHALL have equivalent observable output and exit status for the same scope

#### Scenario: Explicit report values select a bulk report

- **WHEN** a user supplies `--report full` or `--report findings` with exactly one resolvable bulk scope and no item name
- **THEN** validation SHALL run that bulk report without prompting for a scope

#### Scenario: Explicit report values do not alias targeted or interactive flows

- **WHEN** a user supplies an explicit report value with an item name or without a bulk scope
- **THEN** validation SHALL reject the request rather than treating explicit `full` as a targeted or interactive alias

#### Scenario: A changes-only report retains changes scope

- **WHEN** a findings report request uses `--changes` alone
- **THEN** `report.scope` SHALL be `changes`

#### Scenario: A specs-only report retains specs scope

- **WHEN** a findings report request uses `--specs` alone
- **THEN** `report.scope` SHALL be `specs`

#### Scenario: Combined active scopes normalize to all

- **WHEN** a findings report request uses `--changes --specs`, `--all`, or `--all` with either active subset flag
- **THEN** the complete active scope SHALL be validated and `report.scope` SHALL be `all`

#### Scenario: Archived and active scopes cannot be combined for a report

- **WHEN** a user supplies `--archived` with `--all`, `--changes`, or `--specs` and an explicit report value
- **THEN** validation SHALL reject the request rather than choosing one scope by precedence
- **AND** SHALL NOT validate either scope

#### Scenario: Invalid human report requests fail before work

- **WHEN** a non-JSON request has an item/report conflict, archived/active conflict, missing bulk scope, or unsupported report value
- **THEN** validation SHALL write a targeted diagnostic to stderr and nothing to stdout
- **AND** SHALL exit with code 1
- **AND** SHALL NOT resolve a root, prompt, render a spinner, or validate any item

#### Scenario: Invalid JSON report requests return one stable diagnostic

- **WHEN** a JSON request has an item/report conflict, archived/active conflict, missing bulk scope, or unsupported report value
- **THEN** stdout SHALL contain exactly one JSON document with exactly one `status` entry
- **AND** that entry SHALL have `severity: "error"` and stable `code: "invalid_validation_report_request"`
- **AND** it SHALL include a targeted `message` and corrective `fix`
- **AND** no human text SHALL be written to stdout or stderr
- **AND** validation SHALL exit with code 1 without resolving a root, prompting, rendering a spinner, or validating any item

#### Scenario: Findings JSON uses an exact distinct contract

- **WHEN** validation runs with `--json --report findings`
- **THEN** stdout SHALL contain exactly one parseable JSON document and stderr SHALL be empty
- **AND** `report.kind` SHALL equal `validation-findings`
- **AND** `report.version` SHALL equal `1.0`
- **AND** `report` SHALL include canonical `scope`, `returnedItems`, and `totalItems`
- **AND** `summary` SHALL contain totals for the complete requested scope
- **AND** `root` SHALL retain the current resolved-root envelope

#### Scenario: Findings JSON is not the documented full-v1 document

- **WHEN** validation runs with `--json --report findings`
- **THEN** the document SHALL NOT contain a top-level `items` field
- **AND** SHALL NOT contain the full-v1 top-level `version` field
- **AND** contract tests SHALL reject it against the documented full-v1 shape requiring top-level `version: "1.0"` and complete `items`
- **AND** compatibility assertions SHALL be limited to documented full-v1 conformance, leaving undocumented permissive parser behavior outside this contract

#### Scenario: Item findings project whole issue-bearing records

- **GIVEN** the corresponding full result has item records in a defined order
- **WHEN** findings JSON is produced
- **THEN** `itemFindings` SHALL equal those full item records filtered by `issues.length > 0`
- **AND** record order and issue order SHALL match the full result
- **AND** each selected record SHALL preserve every current field and future additive field from that full item record
- **AND** clean item records SHALL be omitted

#### Scenario: Every item issue severity counts as an item finding

- **GIVEN** separate item records containing only `ERROR`, only `WARNING`, or only `INFO` issues
- **WHEN** findings mode is produced
- **THEN** all three records SHALL appear in `itemFindings`
- **AND** every issue SHALL retain its original severity, path, and message
- **AND** `valid` and exit behavior SHALL remain whatever full mode reports under the same strictness

#### Scenario: Item counts exclude top-level advisories

- **WHEN** findings JSON is produced
- **THEN** `report.returnedItems` SHALL equal `itemFindings.length`
- **AND** `report.totalItems` SHALL equal `summary.totals.items`
- **AND** separately named top-level advisory records SHALL NOT increase either item count

#### Scenario: Zero item findings in a non-empty scope remain auditable

- **GIVEN** the requested bulk scope contains one or more items and none has an issue
- **WHEN** validation runs with `--json --report findings`
- **THEN** `itemFindings` SHALL be an empty array and `report.returnedItems` SHALL be `0`
- **AND** `report.totalItems`, `report.scope`, `summary`, and `root` SHALL still identify the complete validated scope
- **AND** the successful exit status SHALL match full mode for the same scope

#### Scenario: Empty JSON scope is explicit and successful

- **GIVEN** the selected bulk scope contains no items
- **WHEN** validation runs with `--json --report findings`
- **THEN** `itemFindings` SHALL be empty, item counts and summary totals SHALL be zero, and scope and root SHALL remain explicit
- **AND** validation SHALL preserve the current successful empty-scope exit status

#### Scenario: Human findings use defined sections and streams

- **GIVEN** a bulk scope with issue-bearing and clean item records
- **WHEN** validation runs with `--report findings` and without `--json`
- **THEN** the final report SHALL emit a `Scope:` line to stdout first
- **AND** SHALL emit item-finding blocks to stderr in full item order, with each item heading followed by all issues in issue order
- **AND** `ERROR`, `WARNING`, and `INFO` labels, paths, and messages SHALL all be emitted to stderr
- **AND** clean item rows SHALL be omitted
- **AND** any explicitly named advisory section SHALL be emitted to stderr after item findings
- **AND** complete-scope `Totals:` SHALL be emitted to stdout after diagnostic sections
- **AND** any existing active-scope first-failure `Details:` command SHALL be emitted to stdout after totals
- **AND** archived scope SHALL NOT gain a new details command

#### Scenario: Human output distinguishes no item findings from advisories

- **GIVEN** no item record has an issue
- **WHEN** validation runs with `--report findings` and without `--json`
- **THEN** `No item findings.` SHALL be emitted to stdout after `Scope:`
- **AND** any explicitly named advisory section SHALL still be emitted separately to stderr before totals
- **AND** `No item findings.` SHALL NOT assert that no top-level advisory exists

#### Scenario: Human empty scope is explicit and successful

- **GIVEN** the selected bulk scope contains no items
- **WHEN** validation runs with `--report findings` and without `--json`
- **THEN** stdout SHALL contain zero-item `Scope:`, `No item findings.`, and zero `Totals:` in that order
- **AND** validation SHALL preserve the current successful empty-scope exit status

#### Scenario: Full and findings verdicts remain equal

- **GIVEN** the same bulk scope, root, inputs, and strictness
- **WHEN** full mode and findings mode run
- **THEN** both modes SHALL validate the same items
- **AND** SHALL produce the same complete summary totals and exit status
- **AND** store and archived scopes SHALL inspect exactly the items their corresponding full invocations inspect

#### Scenario: Completion support follows existing shell capabilities

- **WHEN** completion output is generated for the currently supported Bash, Zsh, Fish, and PowerShell surfaces
- **THEN** the `--report` flag SHALL be registered on all four surfaces
- **AND** Zsh and Fish SHALL suggest the fixed values `full` and `findings`
- **AND** Bash and PowerShell SHALL remain unchanged beyond registering the flag and SHALL NOT be required to suggest fixed values
- **AND** this change SHALL NOT add another completion generator or completion capability

#### Scenario: Findings output is cross-platform

- **WHEN** the same findings validation scenario runs on Windows, macOS, and Linux
- **THEN** report selection, projection, totals, severities, streams, and exit status SHALL be equivalent
- **AND** paths in item records or the root envelope SHALL retain the platform-native form used by full validation
