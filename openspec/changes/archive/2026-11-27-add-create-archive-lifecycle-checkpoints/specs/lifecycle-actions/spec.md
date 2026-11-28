## MODIFIED Requirements

### Requirement: Deliver lifecycle actions on operation reads

The system SHALL attach an optional `lifecycle` field to `openspec instructions create|apply|archive --json`, grouping matching actions into `before` and `completed` checkpoints with a short `handling` instruction. An invalid `lifecycle:` block yields `lifecycleError` instead, and the rest of the payload is unchanged. `openspec instructions create` returns `root` and the project `context`. `openspec list` and `openspec status` SHALL stay free of lifecycle actions.

#### Scenario: Checkpoints map to hooks

- **WHEN** an operation read resolves lifecycle actions
- **THEN** `create` returns `change.create.before` actions as `before`
- **AND** `apply` and `archive` return `change.<operation>.before` actions as `before` and `change.<operation>.completed` actions as `completed`
- **AND** checkpoints with no actions are omitted
- **AND** `handling` explains `suggest` and `auto` and keeps the listed order

#### Scenario: No matching triggers

- **WHEN** no trigger targets the operation's hooks
- **THEN** the instruction payload has no `lifecycle` or `lifecycleError` field

#### Scenario: Apply with before and completed actions

- **WHEN** triggers target `change.apply.before` and `change.apply.completed`
- **THEN** `openspec instructions apply --json` includes `lifecycle.before`, `lifecycle.completed`, and `lifecycle.handling`

#### Scenario: Invalid lifecycle config

- **WHEN** the `lifecycle:` block is invalid
- **THEN** `openspec instructions apply --json` exits zero with its normal fields plus `lifecycleError`
- **AND** it has no `lifecycle` field

#### Scenario: Status and list

- **WHEN** a user runs `openspec status` or `openspec list` with lifecycle config, valid or not
- **THEN** the output has no lifecycle actions or lifecycle errors

#### Scenario: Create without an OpenSpec root

- **WHEN** `openspec instructions create --json` runs where no OpenSpec root resolves
- **THEN** it exits non-zero with `root: null` and a `no_openspec_root` status, like `openspec context --json`
- **AND** it does not resolve an implicit root or create files
