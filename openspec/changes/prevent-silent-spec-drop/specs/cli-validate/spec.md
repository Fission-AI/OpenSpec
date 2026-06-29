## ADDED Requirements

### Requirement: Schema-Aware Delta Validation

`openspec validate` SHALL gate delta-spec validation (including the at-least-one-delta `CHANGE_NO_DELTAS` rule) on whether the change's schema produces delta specs, so that `validate` and `archive` apply the same rule and proposal-only schemas are not forced to have delta specs. A schema produces delta specs when any of its artifacts' `generates` glob writes under `specs/`. This SHALL apply to both single-change and bulk (`--changes` / `--all`) validation.

#### Scenario: Spec-driven change with no delta specs fails

- **WHEN** validating a change whose schema produces delta specs (e.g. `spec-driven`)
- **AND** the change has no delta specs under `specs/`
- **THEN** validation fails with the `CHANGE_NO_DELTAS` error and a non-zero exit code

#### Scenario: Proposal-only schema with no delta specs passes

- **WHEN** validating a change whose schema does NOT produce delta specs (no artifact generates under `specs/`)
- **AND** the change has no delta specs
- **THEN** the `CHANGE_NO_DELTAS` rule does not apply
- **AND** the change is not marked invalid on account of missing delta specs

#### Scenario: Validate and archive agree on the delta requirement

- **WHEN** the same change is checked by `openspec validate` and (with validation enabled) by `openspec archive`
- **THEN** both apply the identical schema-aware delta gate and reach the same verdict on whether delta specs are required

#### Scenario: Indeterminate schema defaults to requiring deltas

- **WHEN** resolving the change's schema throws (e.g. a malformed project schema), as distinct from absent metadata which resolves to the default schema
- **THEN** delta-spec validation is applied (fail-safe to the current strict behavior), not skipped

#### Scenario: Schema resolution is memoized within a run

- **WHEN** bulk validation (`--changes` / `--all`) checks many changes
- **THEN** `schemaProducesDeltaSpecs` is resolved at most once per distinct schema name, not once per change

### Requirement: Declared Capability Coverage

Validating a change SHALL deterministically check that every capability declared in the proposal's `## Capabilities` section has a corresponding delta spec present, so a change cannot pass validation while silently omitting specs it promised. The check SHALL be a pure function of the proposal text and the change's `specs/` directory listing: the same inputs always produce the same result. The check SHALL apply only when the change's schema graph includes a `specs` artifact, so schemas that legitimately have no delta specs are never required to declare them.

A declared capability is resolved as follows:

- The `### New Capabilities` and `### Modified Capabilities` subsections under `## Capabilities` are considered. Both heading form (`### New Capabilities`) and bold-label form (`**New Capabilities**:`) SHALL be accepted, so a proposal written to the documented template is never under-extracted.
- A capability id is the first inline-code span (`` `id` ``) of a top-level `- ` bullet within those subsections.
- A capability id that is not kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) SHALL be reported as a malformed-capability warning rather than silently ignored, so a mis-cased declaration cannot make coverage pass vacuously. Inline code that is not the first span of a capability bullet (paths, prose) is not treated as a capability.
- `None`, `_None_`, HTML-comment, and empty subsections declare nothing.

A declared capability `id` is covered when `specs/<id>/spec.md` is present. For a Modified capability, the declared id MUST be the existing spec folder name (as the schema instruction directs), which is the same key `findSpecUpdates` uses — so coverage and sync stay aligned. Coverage checks presence only; whether a present spec file is a well-formed delta (uses `## ADDED/MODIFIED/REMOVED/RENAMED Requirements` headers) is enforced by the existing delta-spec validation, so a present-but-non-delta file produces one precise "No delta sections found" error rather than a duplicate. Coverage is one-directional: delta specs for capabilities not declared in the proposal SHALL NOT be flagged.

#### Scenario: Declared capability has no spec file

- **WHEN** validating a change (under a schema with a `specs` artifact) whose proposal declares capability `foo`
- **AND** no `specs/foo/spec.md` exists
- **THEN** validation reports an ERROR identifying `foo` as a declared capability missing its delta spec at `specs/foo/spec.md`
- **AND** the error guidance explains that the `## Capabilities` id must match the delta spec folder name (for a Modified capability, the existing `openspec/specs/<id>/` folder)
- **AND** the change is invalid (non-zero exit)

#### Scenario: Bold-label capabilities form is recognized

- **WHEN** a proposal declares capabilities using bold labels (`**New Capabilities**:` / `**Modified Capabilities**:`) rather than `###` headings
- **THEN** the declared capabilities are extracted the same way as the heading form

#### Scenario: Mis-cased capability id is reported, not dropped

- **WHEN** a declared capability bullet's id is not kebab-case (e.g. `User-Auth`)
- **THEN** validation reports a malformed-capability warning naming the bullet
- **AND** does not silently omit it from coverage

#### Scenario: Capability deletion or rename uses explicit opt-out

- **WHEN** a change's purpose is to delete or rename a whole capability/spec folder, for which there is no natural delta spec
- **THEN** the user explicitly passes `--skip-specs` (the skill never does so on its own) and coverage does not block
- **AND** removing a capability's requirements (rather than the whole capability) is expressed as a `## REMOVED Requirements` delta under the existing folder, which satisfies coverage normally

#### Scenario: Declared capability present but not in delta format

- **WHEN** a proposal declares capability `foo`
- **AND** `specs/foo/spec.md` exists but contains no delta sections (it is a full spec)
- **THEN** the delta-spec validation reports a "No delta sections found" ERROR for `specs/foo/spec.md`
- **AND** the coverage check does not additionally report `foo` as missing

#### Scenario: One ERROR per missing capability

- **WHEN** a proposal declares capabilities `foo`, `bar`, and `baz`
- **AND** only `specs/foo/spec.md` exists
- **THEN** validation reports a distinct ERROR for `bar` and for `baz`

#### Scenario: All declared capabilities covered

- **WHEN** every capability declared in the proposal has a matching `specs/<id>/spec.md`
- **THEN** the coverage check contributes no errors

#### Scenario: Schema without a specs artifact is exempt

- **WHEN** validating a change whose schema graph has no `specs` artifact
- **THEN** the coverage check is not applied and contributes no errors

#### Scenario: Proposal without a Capabilities section

- **WHEN** validating a change whose proposal has no `## Capabilities` section
- **THEN** the coverage check declares nothing and contributes no errors
- **AND** other validation (such as the at-least-one-delta rule) is unaffected

#### Scenario: Empty or None subsection declares nothing

- **WHEN** a `### Modified Capabilities` subsection contains only `None`, `_None_`, an HTML comment, or no bullets
- **THEN** no capability is declared from that subsection

#### Scenario: Capability id is the first inline-code token

- **WHEN** a declared capability bullet is `` - `tool-command-surface`: classifies tools as `adapter` or `none` ``
- **THEN** the declared id is `tool-command-surface`
- **AND** the inline code in the description (`adapter`, `none`) is ignored

#### Scenario: Undeclared delivered spec is not flagged

- **WHEN** a change ships `specs/extra/spec.md` for a capability not listed in the proposal
- **THEN** the coverage check does not report an error for `extra`

#### Scenario: Coverage applies in single and bulk validation

- **WHEN** running `openspec validate <change>` or `openspec validate --changes` (including the interactive single-item path, which shares the same validation routine)
- **THEN** the declared-capability coverage check runs for each validated change

### Requirement: Archived Spec-Drift Audit

`openspec validate` SHALL provide a deterministic audit that detects already-archived changes whose declared capabilities never reached `openspec/specs/`, so teams who accumulated silent drift before this change can find it. The audit is detection only; it does not regenerate lost spec content.

#### Scenario: Archived change with un-synced capability is flagged

- **WHEN** the audit runs over `openspec/changes/archive/`
- **AND** an archived change's proposal declares a capability with no corresponding `openspec/specs/<id>/spec.md`
- **THEN** the audit reports that archived change and the missing capability as drift

#### Scenario: Audit is forward-only and says so

- **WHEN** an archived change's proposal predates the `## Capabilities` contract (its capabilities cannot be extracted)
- **THEN** the audit does not report false drift for it
- **AND** the audit output notes that pre-contract archives are not auditable, rather than implying completeness

#### Scenario: Audit does not regenerate content

- **WHEN** drift is detected
- **THEN** the audit points the user at what to rebuild
- **AND** does not write or fabricate spec content
