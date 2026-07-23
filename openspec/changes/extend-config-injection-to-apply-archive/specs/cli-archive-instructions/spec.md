## ADDED Requirements

### Requirement: Provide current archive operation inputs

The CLI SHALL provide `openspec instructions archive --change <name>` as a read-only workflow instruction surface for current archive operation inputs.

#### Scenario: Archive JSON contains context and guidance

- **WHEN** a user runs `openspec instructions archive --change <name> --json`
- **AND** config contains project context and `operations.archive.guidance`
- **THEN** the JSON contains `changeName`, `context`, and `operationGuidance` as separate fields
- **AND** includes the normal resolved-root envelope

#### Scenario: Archive text contains context and guidance

- **WHEN** a user runs `openspec instructions archive --change <name>` with configured inputs
- **THEN** text output labels project context and operation guidance as separate advisory sections

#### Scenario: Archive inputs are absent

- **WHEN** config has no non-empty context or archive guidance
- **THEN** the command succeeds with change and root metadata
- **AND** omits both optional fields

#### Scenario: Archive reads current config

- **WHEN** config changes between two archive instruction calls
- **THEN** the second output reflects the current context and archive guidance

### Requirement: Scope archive inputs to a valid selected root

The archive instruction surface SHALL require a valid change and use existing repo/store root selection before reading config.

#### Scenario: Change is missing

- **WHEN** the archive instruction command is called without `--change`
- **THEN** it returns the existing actionable missing-change error

#### Scenario: Change does not exist in the selected root

- **WHEN** the supplied change is absent from the resolved repo or store
- **THEN** the command fails before returning operation inputs

#### Scenario: Store is selected

- **WHEN** the command is run with a selected store
- **THEN** change validation and config loading both use that store's planning root

### Requirement: Keep archive instructions read-only

The archive instruction surface SHALL return runtime guidance without performing archive execution work.

#### Scenario: Archive instructions are requested

- **WHEN** the command succeeds
- **THEN** it does not inspect or rewrite delta specs
- **AND** does not update main specs
- **AND** does not move or otherwise modify the change
- **AND** does not include the static archive workflow template in JSON output
