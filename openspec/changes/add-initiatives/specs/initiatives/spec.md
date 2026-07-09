## ADDED Requirements

### Requirement: Initiatives folder convention

The system SHALL treat each subfolder of `openspec/initiatives/` as one
initiative and unnumbered top-level files as evergreen artifacts, without
requiring any manifest or configuration. Numbered folders inside an
initiative SHALL be treated as ordered stages.

#### Scenario: Initiatives and evergreen artifacts are read from the folder

- **WHEN** `openspec/initiatives/` contains `smoother-setup/`, `q3-payments/`, and `roadmap.md`
- **THEN** the system reports `smoother-setup` and `q3-payments` as initiatives
- **AND** reports `roadmap.md` as an evergreen artifact, not an initiative

#### Scenario: Stages are read inside an initiative

- **WHEN** `openspec/initiatives/smoother-setup/` contains `00_goal/`, `01_requirements/`, and `notes.md`
- **THEN** the system reports `00_goal` and `01_requirements` as that initiative's stages, in order

#### Scenario: Stage names encode the team's workflow, any chain length

- **WHEN** `openspec/initiatives/checkout-revamp/` contains `00_analysis/`, `01_product/`, `02_design/`, and `03_engineering/`
- **THEN** the system reports all four as that initiative's stages, in order, with no configuration naming the workflow

### Requirement: Changes link upward to an initiative

The system SHALL let a change declare the initiative it serves with an
`initiative` value in its `.openspec.yaml` — `<name>` for an initiative in
its own root, or `<store-id>/<name>` for one in that registered store.
Legacy object values (`{store, id}`) SHALL remain readable and normalize to
`<store>/<id>`.

#### Scenario: Creating a change linked to an initiative

- **WHEN** a user runs `openspec new change add-search --initiative smoother-setup`
- **THEN** the created change's metadata contains `initiative: smoother-setup`

#### Scenario: Legacy object metadata still resolves

- **WHEN** a change's `.openspec.yaml` contains `initiative: { store: team-plans, id: q3-payments }`
- **THEN** the system reads it as `initiative: team-plans/q3-payments`

### Requirement: Portfolio rollup

The system SHALL show the portfolio — every initiative with every change on
this machine that points at it, with live task status — via
`openspec list --initiatives`.

#### Scenario: Rolling up local changes

- **WHEN** a repo has initiatives and changes whose metadata names one of them
- **AND** the user runs `openspec list --initiatives`
- **THEN** the output groups each linked change under its initiative with task status

#### Scenario: Rolling up across repos toward a store initiative

- **WHEN** a store has an initiative and changes in other checkouts on this
  machine say `initiative: <that-store-id>/<name>`
- **AND** the user runs `openspec list --initiatives --store <that-store-id>`
- **THEN** the output includes those changes with the repo each lives in

#### Scenario: Linking is the registration

- **WHEN** a plain code repo (not a registered store) creates a change with
  `--initiative <store-id>/<name>`
- **THEN** the repo's checkout is recorded machine-locally, with nothing
  written into the repo itself
- **AND** the store's rollup includes that change without any further setup

#### Scenario: A complete initiative prompts the evergreen sync

- **WHEN** every change linked to an initiative is complete
- **THEN** the rollup marks it and suggests syncing the evergreen artifacts
  it served

#### Scenario: Running outside any root

- **WHEN** the user runs `openspec list --initiatives` in a directory with no `openspec/` root
- **THEN** the output shows the initiatives of registered stores that have them, instead of an error

#### Scenario: No initiatives folder

- **WHEN** the resolved root has no `openspec/initiatives/` folder
- **THEN** `openspec list --initiatives` says so and suggests how to start one

### Requirement: Initiatives surface in agent context

The system SHALL include a referenced store's initiative names in
`openspec context` and in the agent instruction block, with the command to
fetch the full rollup.

#### Scenario: A referenced store's initiatives appear in context

- **WHEN** a repo references a store whose initiatives folder is non-empty
- **AND** the user runs `openspec context`
- **THEN** the store's member entry lists the initiative names (and evergreen artifacts when there are no initiatives)
- **AND** shows the `openspec list --initiatives --store <id>` fetch command

#### Scenario: A linked change hands its agent the upstream context

- **WHEN** a change's metadata names an initiative
- **AND** the user runs `openspec instructions <artifact> --change <id>` or
  `openspec instructions apply --change <id>`
- **THEN** the output opens with the initiative the change serves, the
  on-disk path to its folder, and the instruction to read everything
  upstream first
- **AND** a ref whose folder cannot be found says so instead of vanishing
