## 1. Request and scope contract

- [ ] 1.1 Add `--report <full|findings>` to bulk `validate` help and registration, leave omitted-report behavior unchanged, and verify explicit `--report full` and `--report findings` require a bulk scope without an item name
- [ ] 1.2 Implement one typed request normalizer before root resolution that maps `--changes` to `changes`, `--specs` to `specs`, `--changes --specs` and `--all` plus active subsets to `all`, and `--archived` to `archived`; verify archived+active, item+report, missing-scope, and unsupported-value requests are rejected before validation
- [ ] 1.3 Emit invalid human requests only to stderr and invalid JSON requests as one stdout document with one `status` entry and stable code `invalid_validation_report_request`; verify exit 1, empty opposite streams, and absence of root resolution, prompts, spinners, and validator calls
- [ ] 1.4 Register the `--report` flag on the existing Bash, Zsh, Fish, and PowerShell completion outputs; add fixed `full`/`findings` value suggestions only to Zsh and Fish, leave Bash and PowerShell unchanged beyond flag registration, and verify no completion capability or generator is added

## 2. Shared item projection and renderers

- [ ] 2.1 Define one typed projector used by active and archived validation that derives `itemFindings` with `full.items.filter(item => item.issues.length > 0)`, preserving full item order, issue order, and whole item records including additive fields; verify both paths use it rather than filtering independently
- [ ] 2.2 Produce the exact findings JSON contract with `report.kind: "validation-findings"`, JSON-string `report.version: "1.0"`, scope/item counts, `itemFindings`, complete `summary`, and `root`; omit full-v1 top-level `items` and `version`
- [ ] 2.3 Implement human findings with independently ordered streams: stdout `Scope:` -> optional `No item findings.` -> `Totals:` -> existing active `Details:`; stderr item blocks/all severities -> explicitly named advisories; add tests that capture each stream independently and make no merged stdout/stderr ordering assertion
- [ ] 2.4 Preserve full-scope validation work, totals, root, strictness, and exit status in findings mode, and verify ERROR-, WARNING-, INFO-only, no-item-finding, empty-scope, failure, active, archived, and selected-store cases

## 3. Rebase and compatibility gate

- [ ] 3.1 Rebase before implementation, inventory the then-current typed full-result top-level sections, and update proposal/design/spec/tasks to name every additional section included in findings mode rather than generically copying unknown fields
- [ ] 3.2 If #1698 has landed, add `overlaps` as an explicitly named top-level advisory JSON field and human stderr section that does not affect item counts; if #1710 has landed, verify INFO-bearing full item records appear unchanged in `itemFindings`
- [ ] 3.3 Add human-byte and normalized-JSON compatibility tests proving omitted `--report` and explicit bulk `--report full` preserve current output for active, spec, archived, empty, and selected-store scopes while ignoring expected timing-field variation between runs
- [ ] 3.4 Add contract tests proving `report.version` is exactly the JSON string `"1.0"` and findings output does not conform to the documented full-v1 shape requiring top-level `version: "1.0"` and complete `items`; do not assert failure behavior for arbitrary undocumented parsers

## 4. Documentation and release tracking

- [ ] 4.1 Document report-versus-serialization semantics, canonical/invalid scope combinations, independent within-stream human section ordering, the exact findings JSON and invalid-request JSON documents, item/advisory distinction, exit codes, and the unchanged full-v1 contract
- [ ] 4.2 Document external `jq` and PowerShell filtering as compatible alternatives for existing releases and explain that findings mode reduces emitted output but does not claim faster validation
- [ ] 4.3 Add the appropriate release changeset with the implementation PR and verify release tracking passes; do not add a changeset to the proposal-only PR

## 5. Verification

- [ ] 5.1 Run focused validate command, archived validation, completion, store-root, structured-error, and CLI end-to-end tests and verify all pass
- [ ] 5.2 Run build, full tests, TypeScript checks, lint, and `git diff --check`, and verify all repository checks pass
- [ ] 5.3 Run `openspec validate add-validation-findings-report --strict` and reconcile implementation and documentation against every scenario before marking the change complete
- [ ] 5.4 Re-run the bounded real-corpus measurement against the implemented `itemFindings` envelope, verify default/full compatibility and complete item findings/totals/exit status, and report the new bytes separately from the 6,740-byte feasibility candidate without a runtime claim
