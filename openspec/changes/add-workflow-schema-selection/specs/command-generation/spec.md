## ADDED Requirements

### Requirement: Creation workflows select a schema before creating a change

The system SHALL generate `new`, `propose`, and `ff` skill and slash-command workflows that determine one confirmed schema before invoking change creation.

#### Scenario: User explicitly names a schema

- **WHEN** the user's current request explicitly names a schema
- **THEN** the workflow SHALL treat that schema as confirmed
- **AND** it SHALL create the change with `--schema <name>` without asking for redundant confirmation

#### Scenario: User names a schema but requests another confirmation

- **WHEN** the user's current request names a schema and explicitly asks to confirm before creation
- **THEN** the workflow SHALL wait for that confirmation before creating the change

#### Scenario: Workflow discovers schemas for an implicit choice

- **WHEN** the user has not explicitly named a schema
- **THEN** the workflow SHALL resolve the authoritative root with `openspec context --json`, including an explicitly selected registered store when present
- **AND** it SHALL run `openspec schemas --json` from the returned `root.path` before `openspec new change`
- **AND** it MAY run schema discovery from the current working directory only when context reports `no_openspec_root`
- **AND** it SHALL use schema descriptions as the authority for semantic recommendation
- **AND** it SHALL use schema names and artifact lists only to identify, display, and explain candidates

#### Scenario: One schema is clearly recommended

- **WHEN** schema discovery succeeds and one available schema is the unique clear match for the requested change
- **THEN** the workflow SHALL present the schema and a concise reason
- **AND** it SHALL wait for explicit user confirmation before creating the change

#### Scenario: Current request clearly waives confirmation

- **WHEN** the user's current request clearly authorizes creation without another confirmation after schema recommendation
- **AND** one schema is the unique clear recommendation
- **THEN** the workflow MAY create the change without asking again

#### Scenario: Schema description clearly waives confirmation

- **WHEN** the uniquely recommended schema's description clearly states that selection of that schema needs no additional confirmation
- **THEN** the workflow MAY create the change without asking again

#### Scenario: Confirmation waiver is ambiguous

- **WHEN** a request or schema description does not clearly and unambiguously waive confirmation
- **THEN** the workflow SHALL require confirmation

#### Scenario: Current user requires confirmation over schema policy

- **WHEN** a schema description waives confirmation but the user's current request explicitly requires it
- **THEN** the current user instruction SHALL take precedence
- **AND** the workflow SHALL wait for confirmation

#### Scenario: Recommendation is ambiguous

- **WHEN** the available schema descriptions do not support one unique clear recommendation
- **THEN** the workflow SHALL stop before creating the change
- **AND** it SHALL list the relevant candidate schemas and descriptions for the user to choose
- **AND** it SHALL NOT silently use the project default schema

#### Scenario: User rejects a recommendation

- **WHEN** the user rejects the recommended schema
- **THEN** the workflow SHALL stop before creating the change
- **AND** it SHALL list relevant candidates and wait for the user to choose

#### Scenario: User chooses from candidates

- **WHEN** the user selects a schema from the presented candidates
- **THEN** the workflow SHALL treat that selection as confirmed
- **AND** it SHALL create the change with `--schema <selected-name>`

#### Scenario: Schema discovery fails

- **WHEN** authoritative-root resolution or `openspec schemas --json` fails or its output cannot be interpreted
- **THEN** the workflow SHALL stop before creating the change and report the failure
- **AND** it SHALL NOT fall back to the project default schema

#### Scenario: No schema is available

- **WHEN** schema discovery returns no available schema
- **THEN** the workflow SHALL stop and explain that a change cannot be created until a schema is available

#### Scenario: Confirmed recommendation is persisted explicitly

- **WHEN** a schema has been confirmed or confirmation has been clearly waived
- **THEN** the workflow SHALL invoke `openspec new change` with `--schema <confirmed-name>`
- **AND** it SHALL continue with its existing post-creation steps only after change creation succeeds
