## ADDED Requirements

### Requirement: Plan folder convention

The system SHALL treat numbered folders under `openspec/plan/` as ordered
stages and unnumbered entries as ambient context, without requiring any
manifest or configuration.

#### Scenario: Stages and context are read from folder names

- **WHEN** `openspec/plan/` contains `00_goal/`, `01_requirements/`, and `vision.md`
- **THEN** the system reports `00_goal` and `01_requirements` as stages, in order
- **AND** reports `vision.md` as context, not a stage

### Requirement: Changes link upward to a plan

The system SHALL let a change declare the plan it serves with a `plan` value
in its `.openspec.yaml` — `local` for the plan in its own root, or a
registered store id for that store's plan.

#### Scenario: Creating a change linked to a plan

- **WHEN** a user runs `openspec new change add-search --plan local`
- **THEN** the created change's metadata contains `plan: local`

### Requirement: Plan rollup

The system SHALL show a plan's stages and every change on this machine that
points at it, with live task status, via `openspec list --plan`.

#### Scenario: Rolling up local changes

- **WHEN** a repo has a plan folder and changes whose metadata says `plan: local`
- **AND** the user runs `openspec list --plan`
- **THEN** the output lists the stages and each linked change with its task status

#### Scenario: Rolling up across repos toward a store plan

- **WHEN** a store has a plan folder and changes in other registered repos say
  `plan: <that-store-id>`
- **AND** the user runs `openspec list --plan --store <that-store-id>`
- **THEN** the output includes those changes with the repo each lives in

#### Scenario: No plan folder

- **WHEN** the resolved root has no `openspec/plan/` folder
- **THEN** `openspec list --plan` says so and suggests how to start one

### Requirement: Plan stages surface in agent context

The system SHALL include a referenced store's plan stage names in
`openspec context` and in the agent instruction block, with the command to
fetch the full rollup.

#### Scenario: A referenced store's plan appears in context

- **WHEN** a repo references a store whose plan folder has stages
- **AND** the user runs `openspec context`
- **THEN** the store's member entry lists the stage names in order
- **AND** shows the `openspec list --plan --store <id>` fetch command
