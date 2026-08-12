## ADDED Requirements

### Requirement: Install scope configuration via the profile flow
The action-first `openspec config profile` workflow SHALL display and allow independent modification of the persisted install scope without requiring profile, delivery, or workflow changes.

#### Scenario: Current profile summary includes install scope
- **WHEN** the user runs `openspec config profile` in an interactive terminal
- **THEN** the current-state header SHALL include effective install scope
- **AND** SHALL indicate when the value is a legacy default rather than explicit

#### Scenario: Action menu offers scope-only modification
- **WHEN** the profile action menu is displayed
- **THEN** it SHALL offer an action to change installation scope independently
- **AND** the existing delivery-only, workflows-only, combined, and keep actions SHALL remain available

#### Scenario: Install scope prompt marks the current selection
- **WHEN** install scope selection is shown
- **THEN** `global` and `project` SHALL be available
- **AND** the effective current value SHALL be marked and preselected

#### Scenario: Save install scope without changing other settings
- **WHEN** the user selects a different install scope
- **THEN** the profile flow SHALL display the old and new effective scope before confirmation
- **AND** SHALL warn that a later init/update without `--scope` may remove managed artifacts from the previous scope after replacement verification
- **AND** SHALL require confirmation before saving
- **AND** after confirmation, `installScope` SHALL be saved explicitly in global config
- **AND** profile, delivery, and workflow values SHALL remain unchanged unless separately edited
- **AND** the config command itself SHALL NOT write or remove tool artifacts

#### Scenario: Scope selection is a no-op
- **WHEN** the user confirms the existing effective scope without changing any other setting
- **THEN** the existing `No config changes.` behavior SHALL apply
- **AND** the command SHALL NOT rewrite config or prompt to update the current project

#### Scenario: Apply changed scope to the current project
- **WHEN** install scope changed and was saved inside an OpenSpec project
- **THEN** the existing apply-now prompt SHALL offer to run update for that project
- **AND** an accepted update SHALL use the newly persisted install scope without a run-only override
- **AND** the update SHALL be authorized to complete a durable cross-scope transition after replacement verification

#### Scenario: Profile preset preserves install scope
- **WHEN** the user applies a profile preset shortcut
- **THEN** an explicit or legacy-effective install scope SHALL be preserved unless the command explicitly changes it

#### Scenario: Profile update preserves legacy provenance
- **WHEN** the existing global config lacks `installScope`
- **AND** the user changes only profile, delivery, or workflows
- **THEN** the saved file SHALL continue to omit `installScope`
- **AND** effective install scope SHALL remain `project` from `legacy-default`

### Requirement: Install scope visibility and direct configuration
The config command SHALL expose install scope through the existing list, get, set, unset, reset, and validation behavior.

#### Scenario: Human-readable config list
- **WHEN** the user runs `openspec config list`
- **THEN** output SHALL include effective `installScope`
- **AND** SHALL label its source as `explicit`, `new-default`, or `legacy-default`

#### Scenario: JSON config list
- **WHEN** the user runs `openspec config list --json`
- **THEN** output SHALL remain valid JSON without explanatory text
- **AND** SHALL represent the effective install scope consistently with other defaulted config fields

#### Scenario: Set install scope directly
- **WHEN** the user runs `openspec config set installScope global` or `project`
- **THEN** the value SHALL be schema-validated and persisted
- **AND** when the effective value changes, output SHALL identify the old and new scope and warn about cleanup during a later durable migration
- **AND** the config command SHALL NOT write or remove tool artifacts

#### Scenario: Unset install scope in an existing config
- **WHEN** the user removes `installScope` from an existing global config
- **THEN** subsequent resolution SHALL use the legacy default `project`
- **AND** config list SHALL make that source visible
- **AND** unrelated raw and unknown config fields SHALL remain unchanged
- **AND** when the effective scope changes, output SHALL warn about cleanup during a later durable migration

#### Scenario: Set an unrelated key in a legacy config
- **WHEN** an existing global config lacks `installScope`
- **AND** the user sets or unsets a different supported config key
- **THEN** the command SHALL modify only the requested key
- **AND** SHALL NOT persist merged default fields that were absent from the raw file
- **AND** `installScope` SHALL remain absent with effective source `legacy-default`

#### Scenario: Config mutation rejects an invalid existing file
- **WHEN** the existing global config is malformed, unreadable, or schema-invalid
- **AND** the user runs config set, unset, or profile
- **THEN** the command SHALL fail with guidance to edit or reset the config
- **AND** SHALL preserve the existing file unchanged

#### Scenario: Reset changes effective install scope
- **WHEN** config reset changes the effective install scope
- **THEN** output SHALL identify the old and new scope and warn about cleanup during a later durable migration
- **AND** reset SHALL NOT write or remove tool artifacts

#### Scenario: Confirmed reset repairs invalid config
- **WHEN** the existing global config is invalid
- **AND** the user confirms `config reset --all`
- **THEN** the command SHALL replace it with the complete current defaults
- **AND** the resulting `installScope` SHALL be explicit `global`

#### Scenario: Config storage scope flag remains distinct
- **WHEN** the user invokes the config command's existing `--scope` option
- **THEN** that option SHALL continue to select which config store is operated on
- **AND** it SHALL NOT be interpreted as the `installScope` preference
