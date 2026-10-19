# cli-validate Specification

## Purpose
Define `openspec validate` behavior for validating changes and specs with actionable remediation guidance and structured output.

## Requirements

### Requirement: Validation SHALL provide actionable remediation steps
Validation output SHALL include specific guidance to fix each error, including expected structure, example headers, and suggested commands to verify fixes.

#### Scenario: No deltas found in change
- **WHEN** validating a change with zero parsed deltas
- **THEN** show error "No deltas found" with guidance:
  - Explain that change specs must include `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`, or `## RENAMED Requirements`
  - Remind authors that files must live under `openspec/changes/{id}/specs/<capability-path>/spec.md`
  - Include an explicit note: "Spec delta files cannot start with titles before the operation headers"
  - Suggest running `openspec change show {id} --json --deltas-only` for debugging

#### Scenario: Missing required sections
- **WHEN** a required section is missing
- **THEN** include expected header names and a minimal skeleton:
  - For Spec: `## Purpose`, `## Requirements`
  - For Change: `## Why`, `## What Changes`
  - Provide an example snippet of the missing section with placeholder prose ready to copy
  - Mention the quick-reference section in `openspec/AGENTS.md` as the authoritative template

#### Scenario: Missing requirement descriptive text
- **WHEN** a requirement header lacks descriptive text before scenarios
- **THEN** emit an error explaining that `### Requirement:` lines must be followed by narrative text before any `#### Scenario:` headers
  - Show compliant example: "### Requirement: Foo" followed by "The system SHALL ..."
  - Suggest adding 1-2 sentences describing the normative behavior prior to listing scenarios
  - Reference the pre-validation checklist in `openspec/AGENTS.md`

### Requirement: Validator SHALL detect likely misformatted scenarios and warn with a fix
The validator SHALL recognize bulleted lines that look like scenarios (e.g., lines beginning with WHEN/THEN/AND) and emit a targeted warning with a conversion example to `#### Scenario:`.

#### Scenario: Bulleted WHEN/THEN under a Requirement
- **WHEN** bullets that start with WHEN/THEN/AND are found under a requirement without any `#### Scenario:` headers
- **THEN** emit warning: "Scenarios must use '#### Scenario:' headers", and show a conversion template:
```
#### Scenario: Short name
- **WHEN** ...
- **THEN** ...
- **AND** ...
```

### Requirement: Normative keyword guidance SHALL not require English

The validation report SHALL include a warning for a non-empty requirement body without the literal English keywords `SHALL` or `MUST`. Normal validation SHALL remain valid when that warning is the only issue, while strict validation SHALL remain invalid because strict mode treats warnings as failures.

A requirement with no body content before its scenarios SHALL remain an error.

#### Scenario: Non-English main spec

- **WHEN** a main spec has a non-empty requirement body written without the English keywords `SHALL` or `MUST`
- **THEN** the validation report includes an RFC 2119 guidance warning
- **AND** normal validation succeeds

#### Scenario: Non-English change delta

- **WHEN** an ADDED or MODIFIED requirement has a non-empty body written without the English keywords `SHALL` or `MUST`
- **THEN** the validation report includes an RFC 2119 guidance warning
- **AND** normal validation succeeds

#### Scenario: Strict validation preserves keyword enforcement

- **WHEN** the same main spec or change is validated in strict mode
- **THEN** the warning causes validation to fail

#### Scenario: Requirement body is missing

- **WHEN** a requirement has no body content before its scenarios
- **THEN** validation reports an error

### Requirement: All issues SHALL include file paths and structured locations
Error, warning, and info messages SHALL include:
- Source file path (`openspec/changes/{id}/proposal.md`, `.../specs/{cap}/spec.md`)
- Structured path (e.g., `deltas[0].requirements[0].scenarios`)

#### Scenario: Zod validation error
- **WHEN** a schema validation fails
- **THEN** the message SHALL include `file`, `path`, and a remediation hint if applicable

### Requirement: Invalid results SHALL include a Next steps footer in human-readable output
The CLI SHALL append a Next steps footer when the item is invalid and not using `--json`, including:
- Summary line with counts
- Top-3 guidance bullets (contextual to the most frequent or blocking errors)
- A suggestion to re-run with `--json` and/or the debug command

#### Scenario: Change invalid summary
- **WHEN** a change validation fails
- **THEN** print "Next steps" with 2-3 targeted bullets and suggest `openspec change show <id> --json --deltas-only`

### Requirement: Change validation SHALL report scenarios a MODIFIED block would drop

The `validate` command SHALL compare every `MODIFIED` requirement in a change against the main specs and report, as an error naming the delta file, each scenario the main spec still has that the `MODIFIED` block omits. A `MODIFIED` requirement replaces the whole requirement block, so archive refuses to apply one that drops a scenario; this is the same check, run without writing anything.

The comparison SHALL match archive's operation order, comparing a `MODIFIED` that names the new header of a rename against the renamed requirement's scenarios.

The check SHALL be silent when the main spec file or the requirement header is absent, because a `MODIFIED` written against a base that has not landed yet is a separate condition that archive gates. A main spec that exists but cannot be read SHALL be reported instead, since archive fails on it too.

Validation run inside `openspec archive` SHALL NOT report these issues, because archive enforces the same check when it applies the deltas.

#### Scenario: MODIFIED omits an existing scenario

- **GIVEN** the main spec's requirement has scenarios "A" and "B"
- **WHEN** a change MODIFIES that requirement with only scenario "A" and `openspec validate <change>` runs
- **THEN** report an error naming the delta file and scenario "B"
- **AND** exit with code 1

#### Scenario: MODIFIED names the new header of a rename

- **GIVEN** the main spec has requirement "A" with scenarios "S1" and "S2"
- **WHEN** a change renames "A" to "B" and MODIFIES "B" with only scenario "S1"
- **THEN** report an error naming scenario "S2"

#### Scenario: MODIFIED header is not in the main spec

- **GIVEN** a change MODIFIES a requirement header the main spec does not contain
- **WHEN** `openspec validate <change>` runs
- **THEN** do not report a dropped-scenario error for that requirement

### Requirement: Top-level validate command

The CLI SHALL provide a top-level `validate` command for validating changes and specs with flexible selection options.

#### Scenario: Interactive validation selection

- **WHEN** executing `openspec validate` without arguments
- **THEN** prompt user to select what to validate (all, changes, specs, or specific item)
- **AND** perform validation based on selection
- **AND** display results with appropriate formatting

#### Scenario: Non-interactive environments do not prompt

- **GIVEN** stdin is not a TTY or `--no-interactive` is provided or environment variable `OPEN_SPEC_INTERACTIVE=0`
- **WHEN** executing `openspec validate` without arguments
- **THEN** do not prompt interactively
- **AND** print a helpful hint listing available commands/flags and exit with code 1

#### Scenario: Direct item validation

- **WHEN** executing `openspec validate <item-name>`
- **THEN** automatically detect if item is a change or spec
- **AND** validate the specified item
- **AND** display validation results

### Requirement: Bulk and filtered validation

The validate command SHALL support flags for bulk validation (--all) and filtered validation by type (--changes, --specs). These flags SHALL select the same items for full and findings reports. Complete per-item listings SHALL apply when `--report` is omitted or is `full`; findings output SHALL follow the item-findings report contract.

#### Scenario: Validate everything

- **WHEN** executing `openspec validate --all`
- **THEN** validate all changes in openspec/changes/ (excluding archive)
- **AND** validate all specs in openspec/specs/
- **AND** display a summary showing passed/failed items
- **AND** exit with code 1 if any validation fails

#### Scenario: Scope of bulk validation

- **WHEN** validating with `--all` or `--changes`
- **THEN** include all change proposals under `openspec/changes/`
- **AND** exclude the `openspec/changes/archive/` directory

- **WHEN** validating with `--specs`
- **THEN** include all specs that have a `spec.md` under `openspec/specs/<capability-path>/spec.md`

#### Scenario: Validate all changes

- **WHEN** executing `openspec validate --changes` with `--report` omitted or set to `full`
- **THEN** validate all changes in openspec/changes/ (excluding archive)
- **AND** display results for each change
- **AND** show summary statistics

#### Scenario: Validate all specs

- **WHEN** executing `openspec validate --specs` with `--report` omitted or set to `full`
- **THEN** validate all specs in openspec/specs/
- **AND** display results for each spec
- **AND** show summary statistics

### Requirement: Validation options and progress indication

The validate command SHALL support standard validation options (--strict, --json) and display progress during bulk operations. Explicit bulk reports SHALL use `--report full` or `--report findings`, independently of JSON serialization. The complete JSON schema below SHALL apply when `--report` is omitted or is `full`; findings output SHALL follow the distinct item-findings report contract.

#### Scenario: Strict validation

- **WHEN** executing `openspec validate --all --strict`
- **THEN** apply strict validation to all items
- **AND** treat warnings as errors
- **AND** fail if any item has warnings or errors

#### Scenario: JSON output

- **WHEN** executing `openspec validate --all --json` with `--report` omitted or set to `full`
- **THEN** output validation results as JSON
- **AND** include detailed issues for each item
- **AND** include summary statistics

#### Scenario: JSON output schema for bulk validation

- **WHEN** executing `openspec validate --all --json` (or `--changes` / `--specs`) with `--report` omitted or set to `full`
- **THEN** output a JSON object with the following shape:
  - `items`: Array of objects with fields `{ id: string, type: "change"|"spec", valid: boolean, issues: Issue[], durationMs: number }`
  - `summary`: Object `{ totals: { items: number, passed: number, failed: number }, byType: { change?: { items: number, passed: number, failed: number }, spec?: { items: number, passed: number, failed: number } } }`
  - `version`: String identifier for the schema (e.g., `"1.0"`)
- **AND** exit with code 1 if any `items[].valid === false`

Where `Issue` follows the existing per-item validation report shape `{ level: "ERROR"|"WARNING"|"INFO", path: string, message: string }`.

#### Scenario: Show validation progress

- **WHEN** validating multiple items (--all, --changes, or --specs)
- **THEN** show progress indicator or status updates
- **AND** indicate which item is currently being validated
- **AND** display running count of passed/failed items

#### Scenario: Concurrency limits for performance

- **WHEN** validating multiple items
- **THEN** run validations with a bounded concurrency (e.g., 4–8 in parallel)
- **AND** ensure progress indicators remain responsive

### Requirement: Item type detection and ambiguity handling

The validate command SHALL handle ambiguous names and explicit type overrides to ensure clear, deterministic behavior.

#### Scenario: Direct item validation with automatic type detection

- **WHEN** executing `openspec validate <item-name>`
- **THEN** if `<item-name>` uniquely matches a change or a spec, validate that item

#### Scenario: Ambiguity between change and spec names

- **GIVEN** `<item-name>` exists both as a change and as a spec
- **WHEN** executing `openspec validate <item-name>`
- **THEN** print an ambiguity error explaining both matches
- **AND** suggest passing `--type change` or `--type spec`, or using `openspec change validate` / `openspec spec validate`
- **AND** exit with code 1 without performing validation

#### Scenario: Unknown item name

- **WHEN** the `<item-name>` matches neither a change nor a spec
- **THEN** print a not-found error
- **AND** show nearest-match suggestions when available
- **AND** exit with code 1

#### Scenario: Explicit type override

- **WHEN** executing `openspec validate --type change <item>`
- **THEN** treat `<item>` as a change ID and validate it (skipping auto-detection)

- **WHEN** executing `openspec validate --type spec <item>`
- **THEN** treat `<item>` as a spec ID and validate it (skipping auto-detection)

### Requirement: Interactivity controls

- The CLI SHALL respect `--no-interactive` to disable prompts.
- The CLI SHALL respect `OPEN_SPEC_INTERACTIVE=0` to disable prompts globally.
- Interactive prompts SHALL only be shown when stdin is a TTY and interactivity is not disabled.

#### Scenario: Disabling prompts via flags or environment

- **WHEN** `openspec validate` is executed with `--no-interactive` or with environment `OPEN_SPEC_INTERACTIVE=0`
- **THEN** the CLI SHALL not display interactive prompts
- **AND** SHALL print non-interactive hints or chosen outputs as appropriate

### Requirement: Parser SHALL handle cross-platform line endings
The markdown parser SHALL correctly identify sections regardless of line ending format (LF, CRLF, CR).

#### Scenario: Required sections parsed with CRLF line endings
- **GIVEN** a change proposal markdown saved with CRLF line endings
- **AND** the document contains `## Why` and `## What Changes`
- **WHEN** running `openspec validate <change-id>`
- **THEN** validation SHALL recognize the sections and NOT raise parsing errors

### Requirement: Validate SHALL resolve changes by directory existence, matching status

`openspec validate` SHALL resolve whether a named item is a change using the same rule `openspec status` and `openspec instructions` use — directory existence within the resolved root — rather than requiring a `proposal.md` to be present. This SHALL apply to targeted validation (`openspec validate <name>`), bulk validation (`openspec validate --all` / `--changes`), and the interactive "pick one" selector shown when no item is given in a TTY — within both the repository root and a `--store`-selected root. A resolved change with a nested multi-area spec layout SHALL have its deltas discovered and validated. Spec/change ambiguity handling and `--type` overrides SHALL remain unchanged. The spec-resolution side (a spec is resolved by the presence of its `spec.md`) is correct today and SHALL be left unchanged.

#### Scenario: Scaffolded change without proposal.md

- **GIVEN** a change directory created by `openspec new change <name>` that has not yet had `proposal.md` written
- **WHEN** executing `openspec validate <name>`
- **THEN** validate resolves the change and validates it
- **AND** it SHALL NOT print `Unknown item '<name>'`

#### Scenario: Targeted-resolution parity with status

- **GIVEN** any change that `openspec status --change <name>` resolves, including a change in a `--store`-selected root
- **WHEN** executing `openspec validate <name>` (passing the same `--store` when applicable)
- **THEN** validate SHALL resolve the same change that status resolved, and SHALL NOT report it as unknown

#### Scenario: Bulk validation includes a sole proposal-less change

- **GIVEN** a repository whose only active change lacks `proposal.md` and is listed by `openspec status`
- **WHEN** executing `openspec validate --all` (or `--changes`)
- **THEN** validate SHALL validate that change, and SHALL NOT print "No items found to validate"
- **AND** the exit status SHALL reflect the change's validity

#### Scenario: Interactive selector lists proposal-less changes

- **GIVEN** a TTY and a change directory without `proposal.md` that `openspec status` lists
- **WHEN** executing `openspec validate` with no item name
- **THEN** the interactive "pick one" selector SHALL include that change

#### Scenario: Resolved-but-invalid change exits non-zero

- **GIVEN** a change that resolves by directory existence but fails validation
- **WHEN** executing `openspec validate <name>` or `openspec validate --all`
- **THEN** validate SHALL exit with a non-zero status
- **AND** SHALL NOT exit 0 while reporting the change as having issues

#### Scenario: Nested multi-area delta discovery

- **GIVEN** a resolved change whose deltas live at `specs/<area>/<capability>/spec.md` (nested deeper than one directory)
- **WHEN** validating that change
- **THEN** validate SHALL discover and validate those delta specs
- **AND** SHALL NOT report "No delta sections found" for a change that does contain deltas

#### Scenario: Change/spec ambiguity is preserved

- **GIVEN** a name that exists both as a change directory and as a spec
- **WHEN** executing `openspec validate <name>`
- **THEN** validate SHALL print the ambiguity error and respect `--type change` / `--type spec`, exactly as before

#### Scenario: Changes with proposal.md are unaffected

- **GIVEN** a change that already contains `proposal.md`
- **WHEN** validating it targeted or in bulk
- **THEN** resolution and validation behavior SHALL be byte-for-byte unchanged from today

### Requirement: SHALL/MUST body-keyword hint SHALL apply to main specs

When a requirement places the normative keyword (SHALL or MUST) only in its `### Requirement:` header and omits it from the requirement body line, `openspec validate` SHALL emit the same targeted remediation guidance for main specs under `openspec/specs/**` as it already does for change delta specs, instead of the generic "must contain SHALL or MUST" message. The targeted message SHALL be emitted exactly once for such a requirement, the generic `REQUIREMENT_NO_SHALL` message SHALL no longer be emitted on the main-spec path, and the behavior SHALL be uniform across every main-spec validation surface (`openspec validate <spec>`, `--all`, JSON output, `openspec spec validate`, and rebuilt-spec validation via `validateSpecContent`). The main-spec message's actionable sentence SHALL be byte-identical to the change-delta message; only the leading prefix differs (main specs have no `ADDED`/`MODIFIED` action).

#### Scenario: Main spec with the keyword in the header only

- **GIVEN** a main spec requirement whose header contains SHALL or MUST but whose body line omits it
- **WHEN** running `openspec validate` over that spec
- **THEN** the error message SHALL contain the actionable sentence: "must contain SHALL or MUST in the requirement body, not only in the header. Move the SHALL/MUST statement to the line immediately after the \"### Requirement: ...\" header."
- **AND** SHALL NOT be the generic "Requirement must contain SHALL or MUST keyword" message

#### Scenario: Actionable-sentence parity with change deltas

- **GIVEN** the identical header-only-keyword mistake authored once in a main spec and once in a change delta
- **WHEN** validating each
- **THEN** the actionable remediation sentence SHALL be byte-identical between the two (the change-delta `ADDED`/`MODIFIED` prefix is not required for the main-spec message)

#### Scenario: Exactly one issue is emitted

- **GIVEN** a main spec requirement with the keyword in the header only
- **WHEN** validating it
- **THEN** validate SHALL emit exactly one issue for the missing body keyword
- **AND** SHALL NOT emit both the generic message and the targeted message for the same requirement

#### Scenario: Requirement missing the keyword entirely still errors

- **GIVEN** a main spec requirement that contains no SHALL or MUST in either the header or the body
- **WHEN** running `openspec validate` over that spec
- **THEN** validate SHALL report that the requirement must contain SHALL or MUST, as it does today

#### Scenario: Keyword present in the body is not flagged

- **GIVEN** a main spec requirement whose body line contains SHALL or MUST (whether or not the header also does)
- **WHEN** running `openspec validate` over that spec
- **THEN** validate SHALL NOT raise a missing-keyword error for that requirement

#### Scenario: Lowercase keyword does not satisfy the body requirement

- **GIVEN** a main spec requirement whose only "shall"/"must" is lowercase
- **WHEN** running `openspec validate` over that spec
- **THEN** validate SHALL report a missing-keyword error, matching the change-delta behavior for the same lowercase mistake

#### Scenario: Header keyword with no body line emits the hint

- **GIVEN** a main spec requirement whose header contains SHALL or MUST and that has no body line before its first scenario
- **WHEN** running `openspec validate` over that spec
- **THEN** validate SHALL emit the body-keyword hint (the keyword is only in the header)
- **AND** this case, which is reported valid today, becomes a deliberate, additive validation improvement

#### Scenario: Renamed requirements are not subject to the body-keyword hint

- **GIVEN** a change delta `## RENAMED Requirements` whose TO header contains SHALL or MUST
- **WHEN** validating that change
- **THEN** validate SHALL NOT emit the body-keyword hint for the renamed pair
- **AND** RENAMED validation behavior SHALL be byte-for-byte unchanged

### Requirement: Bulk validation SHALL provide an opt-in item-findings report

The `validate` command SHALL support case-sensitive `--report full` and `--report findings` for explicit, unambiguous bulk scopes. Omitting `--report` SHALL retain current targeted, interactive, bulk, human, and JSON behavior. Findings mode SHALL return whole issue-bearing item records separately from top-level advisories while preserving full item order, complete requested-scope totals, root selection, issue severities, strict-mode semantics, and exit status. The current full-result fields are `items`, `summary`, `version`, and `root`; this implementation SHALL NOT invent advisory fields or copy unknown top-level fields. A future advisory section requires an explicit contract update.

#### Scenario: Default and explicit bulk full output remain compatible

- **WHEN** a user runs bulk validation without `--report` or with a valid explicit `--report full` request
- **THEN** human output SHALL retain the current complete item listing and totals, or the current empty-scope message when no items exist
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

#### Scenario: Missing report arguments retain parser errors

- **WHEN** the CLI parser rejects a missing required argument such as bare `--report`
- **THEN** the existing CLI syntax-error behavior SHALL remain unchanged
- **AND** the command SHALL NOT run or resolve a root
- **AND** generic parser errors SHALL NOT be covered by the structured `invalid_validation_report_request` contract

#### Scenario: Root and scope-discovery failures remain diagnostics

- **GIVEN** a syntactically valid report request with a supported scope
- **WHEN** root resolution fails or scope discovery encounters a fatal error
- **THEN** validation SHALL retain the existing diagnostic and nonzero exit status for that failure
- **AND** JSON output SHALL contain the existing `status` diagnostic envelope rather than a findings document with empty totals
- **AND** a per-item validation failure SHALL instead remain an item result in the completed findings report

#### Scenario: Findings JSON uses an exact distinct contract

- **WHEN** a valid `--json --report findings` request completes root resolution, scope discovery, and validation
- **THEN** stdout SHALL contain exactly one parseable JSON document and stderr SHALL be empty
- **AND** `report.kind` SHALL equal `validation-findings`
- **AND** `report.version` SHALL be the JSON string `"1.0"`
- **AND** `report` SHALL include canonical `scope`, `returnedItems`, and `totalItems`
- **AND** `summary` SHALL contain totals for the complete requested scope
- **AND** `root` SHALL retain the current resolved-root envelope

#### Scenario: Findings JSON is not the documented full-v1 document

- **WHEN** a valid `--json --report findings` request produces a completed report
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

#### Scenario: Human findings use independently ordered streams

- **GIVEN** a bulk scope with issue-bearing and clean item records
- **WHEN** validation runs with `--report findings` and without `--json`
- **THEN** within stdout the final report SHALL emit `Scope:` first, followed by complete-scope `Totals:`, followed by any existing active-scope first-failure `Details:` command
- **AND** within stderr the final report SHALL emit item-finding blocks in full item order, with each item heading followed by all issues in issue order
- **AND** `ERROR`, `WARNING`, and `INFO` labels, paths, and messages SHALL all be emitted to stderr
- **AND** clean item rows SHALL be omitted
- **AND** within stderr any explicitly named advisory section SHALL be emitted after item-finding blocks
- **AND** archived scope SHALL NOT gain a new details command
- **AND** no relative ordering between stdout and stderr sections SHALL be required

#### Scenario: Human output distinguishes no item findings from advisories

- **GIVEN** no item record has an issue
- **WHEN** validation runs with `--report findings` and without `--json`
- **THEN** within stdout `No item findings.` SHALL be emitted after `Scope:` and before `Totals:`
- **AND** any explicitly named advisory section SHALL still be emitted separately to stderr
- **AND** `No item findings.` SHALL NOT assert that no top-level advisory exists
- **AND** no relative ordering between that stderr advisory and stdout sections SHALL be required

#### Scenario: Human empty scope is explicit and successful

- **GIVEN** the selected bulk scope contains no items
- **WHEN** validation runs with `--report findings` and without `--json`
- **THEN** within stdout the report SHALL contain zero-item `Scope:`, `No item findings.`, and zero `Totals:` in that order
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
- **AND** paths in item records and the root envelope SHALL remain exactly as emitted by full validation, including native root paths and existing POSIX-normalized issue paths

### Requirement: Requirement bodies SHALL be parsed in full for normative keywords
The validator SHALL detect `SHALL`/`MUST` across the entire requirement body, not only the first body line. Requirement-text extraction SHALL capture every body line from after the `### Requirement:` header up to the first Markdown header on a non-fenced line (a `#### Scenario:` header, or a stray `###` divider absorbed into a delta block), skipping blank lines and lines inside fenced code blocks. `**metadata**:` lines SHALL be skipped only when other body text remains; a body consisting solely of metadata lines SHALL be kept as the requirement text. Detection SHALL run over the full captured body. Canonical `### Requirement:` blocks with no body text SHALL NOT satisfy body-keyword validation from the header title alone; they SHALL receive the existing body-keyword hint when the keyword appears only in the header. The Markdown parser MAY still use the header title as display text for supported bare-header specs. The change-delta reader and the main-spec validator SHALL share this body extraction so they cannot diverge.

#### Scenario: Normative keyword on the second wrapped line (change and spec)
- **GIVEN** a requirement whose text wraps across two lines with `SHALL` on the second line
- **WHEN** running `openspec validate <id> --strict` for both a change delta and a main spec
- **THEN** both SHALL detect the keyword and SHALL NOT report a missing-`SHALL`/`MUST` error

#### Scenario: Metadata fields precede the description
- **GIVEN** a requirement whose body begins with `**ID**:`/`**Priority**:` lines before a `MUST` description
- **WHEN** running `openspec validate <spec-id> --strict`
- **THEN** validation SHALL skip the metadata lines, detect `MUST`, and pass — matching `openspec validate <change-id>`

#### Scenario: Requirement written entirely as a metadata line
- **GIVEN** a requirement whose whole body is `**Constraint**: The system MUST ...`
- **WHEN** running `openspec validate <id> --strict` for both a change delta and a main spec
- **THEN** both SHALL keep that line as the requirement text and detect the `MUST`

#### Scenario: Stray divider bounds the requirement body
- **GIVEN** a delta requirement followed by a stray `### Background` divider whose notes contain `MUST`
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** the requirement body SHALL end at the divider and the `MUST` in the notes SHALL NOT satisfy the keyword check

#### Scenario: Single-line requirement is unaffected
- **GIVEN** a requirement whose `SHALL` statement is on a single body line
- **WHEN** running `openspec validate <id> --strict`
- **THEN** validation behavior, messages, and displayed text SHALL be unchanged from before this change

### Requirement: Fenced code blocks SHALL NOT corrupt extraction or scenario counting
The validator and Markdown parser SHALL ignore lines inside fenced code blocks (` ``` ` or `~~~`) when extracting requirement body text, when locating the body-ending header boundary, and when counting scenarios. A fenced block before the prose line SHALL NOT make the fence marker the requirement text, and a `#### Scenario:` inside a fenced block SHALL NOT count as a real scenario.

#### Scenario: Fenced block before the prose line
- **GIVEN** a requirement whose body opens with a fenced code block containing `#`-comment lines, followed by the `SHALL` prose line
- **WHEN** the spec or change is validated
- **THEN** the captured requirement text SHALL be the prose line (not the fence marker) and validation SHALL pass

#### Scenario: Fenced scenario is not a real scenario
- **GIVEN** a requirement whose only `#### Scenario:` appears inside a fenced code example, with no real scenario
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** validation SHALL report the requirement as missing a scenario — the same result as `openspec validate <spec-id>`

### Requirement: A single normative-keyword predicate SHALL be used across readers
All `SHALL`/`MUST` detection SHALL use one predicate that matches `SHALL` or `MUST` as whole words (delimited by word boundaries, so a substring inside a longer word such as `MARSHALL` does not match), so the change-delta reader and the schema-based reader accept and reject identical text.

#### Scenario: Keyword detection agrees across readers
- **GIVEN** identical requirement body text validated once as a change delta and once as a main spec
- **WHEN** running `openspec validate` on each
- **THEN** both SHALL reach the same conclusion about whether the body contains a normative keyword

### Requirement: Non-canonical headers in delta sections SHALL be surfaced without changing recognition
When an `## ADDED`/`## MODIFIED Requirements` section in a change delta contains a level-3 header that is not a canonical `### Requirement:` header, `openspec validate <change>` SHALL emit an INFO-level note identifying it, because the delta reader will otherwise skip it silently. The note SHALL be derived from the headers the delta reader actually skips while parsing, so it describes the reader's real section and fence boundaries. This note SHALL NOT change which headers are recognized as requirements, and SHALL NOT change the `valid` result — including under `--strict`. This behavior applies only to change deltas: bare `### <statement>` headers in main specs are recognized requirements (see the scenario below) and SHALL NOT trigger such notes.

#### Scenario: Stray divider header is reported, not silently skipped
- **GIVEN** a delta whose `## ADDED Requirements` section contains `### Documentation Requirements` followed by a valid `### Requirement: …` block
- **WHEN** running `openspec validate <change-id> --strict`
- **THEN** validation SHALL emit an INFO note naming the stray `### Documentation Requirements` header
- **AND** the `valid` result SHALL be unchanged from current behavior (the INFO does not cause failure)

#### Scenario: Nameless requirement header gets a dedicated hint
- **GIVEN** a delta whose `## ADDED Requirements` section contains a bare `### Requirement:` header with no name
- **WHEN** running `openspec validate <change-id>`
- **THEN** the INFO note SHALL say the header is missing a requirement name (not suggest `### Requirement: Requirement:`)

#### Scenario: Bare requirement headers in main specs remain supported
- **GIVEN** a main spec whose requirements use bare `### <statement>` headers without the `Requirement:` prefix
- **WHEN** running `openspec validate <spec-id> --strict`
- **THEN** those headers SHALL continue to be recognized as requirements exactly as before this change

### Requirement: Spec validation SHALL report a Purpose left as the archive placeholder

The `validate` command SHALL report, as a warning against the spec's Purpose, a
`## Purpose` that is still a placeholder rather than a Purpose someone wrote:
the sentence `openspec archive` writes for a new capability, or a marker left in
its place. The report SHALL name the line the placeholder is on when it can be
located, and SHALL omit the line rather than point at the wrong text when it
cannot.

The remediation SHALL say to edit the main spec directly, because a `## Purpose`
in a delta is read only when a capability is created and therefore cannot replace
one that already exists.

The finding SHALL be a warning. A project that already carries placeholders
therefore keeps validating by default, and only `--strict` fails — the
placeholder is worth keeping at the moment archive writes it, and worth reporting
once it has outlived that moment.

Detection SHALL be narrow, because a Purpose is prose and prose that raises an
open question is not a placeholder:

- the sentence archive itself writes SHALL be reported wherever it appears in the
  Purpose, since nobody writes it by accident;
- otherwise only a `TBD` or `TODO` marker opening the Purpose SHALL be reported.
  The two words SHALL be read the same way, because which one got typed says
  nothing about whether the Purpose was written;
- a marker appearing inside a sentence SHALL NOT be reported;
- a longer word that merely begins with those letters SHALL NOT be reported,
  in any script.

Text inside a fenced code block SHALL NOT be read as the Purpose speaking, for
either rule. A Purpose that quotes the placeholder is documenting it rather than
carrying it, and a check that fails the document explaining the placeholder
teaches its readers to ignore the warning.

An empty Purpose SHALL NOT be reported by this requirement, which the
empty-Purpose error already covers. A Purpose reported as a placeholder SHALL NOT
also be reported as too brief, so a bare `TBD` yields one finding and not two.

Validation performed inside `openspec archive` SHALL be unaffected, because
archive validates a rebuilt spec without `--strict` and a warning does not change
that verdict: a spec archive writes SHALL still pass the validation it would have
passed before this requirement existed.

#### Scenario: The placeholder passes by default and fails under strict

- **GIVEN** a main spec whose Purpose is the placeholder archive wrote
- **WHEN** `openspec validate --specs` runs
- **THEN** report a warning against the Purpose, naming the line it is on and
  saying to edit the main spec directly
- **AND** the spec is reported valid

#### Scenario: Strict validation fails on the placeholder

- **GIVEN** the same main spec
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** the spec is reported invalid

#### Scenario: An authored Purpose raising an open question is not reported

- **GIVEN** a Purpose reading "Bounds how often a failed delivery is retried. The exact budget is TBD pending load tests."
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** report no placeholder warning, because the marker does not open the Purpose
- **AND** the spec is reported valid

#### Scenario: A Purpose left as a TODO is reported like a TBD

- **GIVEN** a Purpose consisting only of "TODO"
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** report the placeholder warning, the same finding a bare "TBD" reports

#### Scenario: A Purpose quoting the placeholder inside a fence is not reported

- **GIVEN** a Purpose that explains the placeholder and shows it inside a fenced
  code block
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** report no placeholder warning
- **AND** the spec is reported valid

#### Scenario: A word beginning with the marker is not reported

- **GIVEN** a Purpose opening "TBDs raised during design review are tracked in the linked issue.", or the same sentence opening with "TODOs"
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** report no placeholder warning

#### Scenario: A bare TBD is reported once

- **GIVEN** a Purpose consisting only of "TBD"
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** report exactly one finding against the Purpose, the placeholder warning
  rather than the too-brief warning

#### Scenario: A terse but authored Purpose still reports as too brief

- **GIVEN** a Purpose reading "Does stuff."
- **WHEN** `openspec validate --specs --strict` runs
- **THEN** report the too-brief warning and no placeholder warning

#### Scenario: Archive still writes the spec it would have written

- **GIVEN** a change whose delta introduces a capability with no usable `## Purpose`
- **WHEN** `openspec archive` validates the rebuilt spec before writing it
- **THEN** that spec is reported valid and archive completes exactly as before

#### Scenario: Line endings do not change what is reported

- **GIVEN** two main specs with the same placeholder Purpose, one saved with LF
  line endings and one with CRLF
- **WHEN** `openspec validate --specs` runs on each
- **THEN** both report the same warning against the same line number
