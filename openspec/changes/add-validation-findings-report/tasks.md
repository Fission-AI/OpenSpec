## 1. Request and scope contract

- [x] 1.1 Add `--report <full|findings>` to bulk `validate` help and registration, leave omitted-report behavior unchanged, and verify explicit `--report full` and `--report findings` require a bulk scope without an item name
- [x] 1.2 Implement one typed request normalizer before root resolution that maps `--changes` to `changes`, `--specs` to `specs`, `--changes --specs` and `--all` plus active subsets to `all`, and `--archived` to `archived`; verify archived+active, item+report, missing-scope, and unsupported-value requests are rejected before validation
- [x] 1.3 Emit invalid human requests only to stderr and invalid JSON requests as one stdout document with one `status` entry and stable code `invalid_validation_report_request`; verify exit 1, empty opposite streams, and absence of root resolution, prompts, spinners, and validator calls
- [x] 1.4 Register the `--report` flag on the existing Bash, Zsh, Fish, and PowerShell completion outputs; add fixed `full`/`findings` value suggestions only to Zsh and Fish, leave Bash and PowerShell unchanged beyond flag registration, and verify no completion capability or generator is added
- [x] 1.5 Verify case-sensitive report values, preserve parser errors for missing option arguments, and preserve root/discovery failure diagnostics without emitting a findings success envelope

## 2. Shared item projection and renderers

- [x] 2.1 Define one typed projector used by active and archived validation that derives `itemFindings` with `full.items.filter(item => item.issues.length > 0)`, preserving full item order, issue order, and whole item records including additive fields; verify both paths use it rather than filtering independently
- [x] 2.2 Produce the exact findings JSON contract with `report.kind: "validation-findings"`, JSON-string `report.version: "1.0"`, scope/item counts, `itemFindings`, complete `summary`, and `root`; omit full-v1 top-level `items` and `version`
- [x] 2.3 Implement human findings with independently ordered streams: stdout `Scope:` -> optional `No item findings.` -> `Totals:` -> existing active `Details:`; stderr item blocks/all severities -> explicitly named advisories; add tests that capture each stream independently and make no merged stdout/stderr ordering assertion
- [x] 2.4 Preserve full-scope validation work, totals, root, strictness, and exit status in findings mode, and verify ERROR-, WARNING-, INFO-only, no-item-finding, empty-scope, failure, active, archived, and selected-store cases

## 3. Baseline and compatibility gate

- [x] 3.1 Update from main before implementation and verify the full-result inventory is exactly `items`, `summary`, `version`, and `root`; explicitly map those fields without copying unknown top-level fields
- [x] 3.2 Verify existing INFO-bearing full item records appear unchanged in `itemFindings`, and no advisory field is invented when the full report has none
- [x] 3.3 Add human-byte and normalized-JSON compatibility tests proving omitted `--report` and explicit bulk `--report full` preserve current output for active, spec, archived, empty, and selected-store scopes while ignoring expected timing-field variation between runs
- [x] 3.4 Add contract tests proving `report.version` is exactly the JSON string `"1.0"` and findings output does not conform to the documented full-v1 shape requiring top-level `version: "1.0"` and complete `items`; do not assert failure behavior for arbitrary undocumented parsers

## 4. Documentation and release tracking

- [x] 4.1 Document report-versus-serialization semantics, canonical/invalid scope combinations, independent within-stream human section ordering, the exact findings JSON and invalid-request JSON documents, item/advisory distinction, exit codes, and the unchanged full-v1 contract
- [x] 4.2 Document external `jq` and PowerShell filtering as compatible alternatives for existing releases and explain that findings mode reduces emitted output but does not claim faster validation
- [x] 4.3 Add the appropriate release changeset for the implemented feature and verify release tracking passes

## 5. Verification

- [x] 5.1 Run focused validate command, archived validation, completion, store-root, structured-error, and CLI end-to-end tests and verify all pass
- [x] 5.2 Run build, full tests, TypeScript checks, lint, and `git diff --check`, and verify all repository checks pass
- [x] 5.3 Run `openspec validate add-validation-findings-report --strict` and reconcile implementation and documentation against every scenario before marking the change complete
- [x] 5.4 Measure the available repository archive (a replacement for the unavailable original 895-change corpus) against the implemented `itemFindings` envelope, verify default/full compatibility and complete item findings/totals/exit status, and report the new bytes separately from the 6,740-byte feasibility candidate without a runtime claim

## Verification results

- Build, TypeScript checks, lint, strict validation of this change, release tracking, and `git diff --check` pass.
- Full suite: 148 files and 4,273 tests pass. The build completed before the run. Local verification used a temporary `USERPROFILE`, unset inherited `ZSH`/`ZSH_CUSTOM`, and allowed localhost HTTP fixtures; the original environment-sensitive failures reproduced on unchanged main.
- The 83-change archive measurement retains all 12 failures, full totals, root, and exit 1 while reducing JSON output by 72.5%. See `design.md` for the measured bytes and corpus distinction.
- Independent implementation review found no remaining blockers.
- Documentation examples were checked against the built CLI. The Bash/jq alternatives were executed. PowerShell examples were source-reviewed only because `pwsh` is unavailable locally; rendered docs QA was unavailable because no browser was connected.
