## MODIFIED Requirements

### Requirement: Archive Validation

The archive command SHALL validate changes before applying them to ensure data integrity. When validation is enabled, the command SHALL run delta-spec validation and declared-capability coverage consistently with `openspec validate` — that is, whenever the user has not opted out of spec updates via `--skip-specs` — rather than only when delta specs already exist. A change that has no delta specs SHALL be blocked with the same `CHANGE_NO_DELTAS` error that `openspec validate` reports; a change whose spec file is present but not in delta format SHALL be blocked with the same "No delta sections found" error; and a change that declares capabilities it has not delivered as delta specs SHALL be blocked with the same coverage errors — instead of being silently archived with missing, malformed, or partial spec updates. This delta requirement SHALL apply only when the change's schema graph includes a `specs` artifact, so schemas that legitimately have no delta specs are not forced to provide them. The command SHALL also run the same proposal validation as `openspec validate` (required sections + change-shape rules, minus the schema-gated delta requirement) and block on proposal errors in both text and `--json` modes, so archive never syncs or moves a change that validate rejects; proposal warnings remain informative.

#### Scenario: Pre-archive validation

- **WHEN** executing `openspec archive change-name`
- **THEN** validate the change structure first
- **AND** only proceed if validation passes
- **AND** show validation errors if it fails

#### Scenario: No delta specs blocks archive

- **WHEN** executing `openspec archive change-name` without `--skip-specs` or `--no-validate`
- **AND** the change has no delta specs under `changes/change-name/specs/` (the directory is absent or contains no delta sections)
- **THEN** archive validation fails with the `CHANGE_NO_DELTAS` error
- **AND** the archive is aborted with a non-zero exit code
- **AND** the change is not moved to the archive directory

#### Scenario: --yes does not bypass the validation guard

- **WHEN** executing `openspec archive change-name --yes` without `--skip-specs` or `--no-validate`
- **AND** the change has no delta specs (under a schema that produces delta specs)
- **THEN** the archive is still blocked with `CHANGE_NO_DELTAS` and a non-zero exit code
- **AND** the change is not moved to the archive directory
- **AND** `--yes` only suppresses confirmation prompts, never the validation gate

#### Scenario: Non-delta-format spec blocks archive

- **WHEN** executing `openspec archive change-name` without `--skip-specs` or `--no-validate`
- **AND** `changes/change-name/specs/<cap>/spec.md` exists but contains no delta sections (it is a full spec)
- **THEN** archive validation fails with the "No delta sections found" error for that file
- **AND** the archive is aborted with a non-zero exit code
- **AND** the change is not moved to the archive directory

#### Scenario: Schema without a specs artifact is exempt

- **WHEN** executing `openspec archive change-name` under a schema whose graph has no `specs` artifact
- **AND** the change has no delta specs
- **THEN** the delta requirement does not apply
- **AND** the archive proceeds (no `CHANGE_NO_DELTAS` block)

#### Scenario: Declared but undelivered capability blocks archive

- **WHEN** executing `openspec archive change-name` without `--skip-specs` or `--no-validate`
- **AND** the proposal declares a capability that has no matching delta spec under `changes/change-name/specs/`
- **THEN** archive validation fails with the declared-capability coverage error for that capability
- **AND** the archive is aborted with a non-zero exit code
- **AND** the change is not moved to the archive directory

#### Scenario: Archive validation parity with validate command

- **WHEN** a change would be reported invalid by `openspec validate change-name`
- **THEN** `openspec archive change-name` (with validation enabled) blocks on the same errors
- **AND** does not archive the change

#### Scenario: Malformed proposal blocks archive

- **WHEN** executing `openspec archive change-name` without `--no-validate`
- **AND** `changes/change-name/proposal.md` fails the proposal validation that `openspec validate` applies (e.g. missing `## Why`), even though every delta spec is valid
- **THEN** archive validation fails with the same proposal errors
- **AND** the archive is aborted with a non-zero exit code in both text and `--json` modes
- **AND** the change is not moved to the archive directory
- **AND** this applies under proposal-only schemas too, since proposal validation is not gated on the schema producing delta specs

#### Scenario: Force archive without validation

- **WHEN** executing `openspec archive change-name --no-validate`
- **THEN** skip validation (unsafe mode)
- **AND** show warning about skipping validation

### Requirement: Skip Specs Option

The archive command SHALL support a `--skip-specs` flag that skips all spec update operations and proceeds directly to archiving. Because `--skip-specs` declares that the change intentionally has no specs to sync, it SHALL also skip delta-spec validation, so a change with no delta specs can still be archived under this explicit opt-out.

#### Scenario: Skipping spec updates with flag

- **WHEN** executing `openspec archive <change> --skip-specs`
- **THEN** skip spec discovery and update confirmation
- **AND** skip the delta-spec validation that would otherwise block a change with no delta specs
- **AND** proceed directly to moving the change to archive
- **AND** display a message indicating specs were skipped

#### Scenario: Skip-specs allows a spec-less change to archive

- **WHEN** executing `openspec archive <change> --skip-specs` on a change with no delta specs
- **THEN** the `CHANGE_NO_DELTAS` block does not apply
- **AND** the change is archived
