# opsx-propose-skill Specification

## Purpose

Defines how the `/opsx:propose` skill and command load create inputs from the CLI and handle the `change.create.before` lifecycle checkpoint.

## Requirements

### Requirement: Load create inputs from the CLI

The `/opsx:propose` skill and command SHALL run `openspec instructions create --json`, keeping `--store` when a store is selected, before choosing a schema or creating the change. They SHALL use the returned `root.path` and `context`, and SHALL NOT read `openspec/config.yaml` by hand.

#### Scenario: Current CLI

- **WHEN** the create read returns `root`
- **THEN** propose uses `root.path` as the OpenSpec root and applies `context` before exploring the codebase or making planning decisions

#### Scenario: No OpenSpec root

- **WHEN** the create read reports `no_openspec_root`
- **THEN** propose stops without creating or changing any files and follows the project check

#### Scenario: CLI predates instructions create

- **WHEN** the create read returns JSON without a `root` field
- **THEN** propose runs `openspec context --json` for the root checks
- **AND** continues without early project context or lifecycle actions

### Requirement: Handle the create checkpoint in propose

Before `openspec new change`, propose SHALL handle the create read's lifecycle fields once. It SHALL NOT call `openspec lifecycle actions`.

#### Scenario: Before actions configured

- **WHEN** the create read includes `lifecycle.before`
- **THEN** propose handles those actions once, following `lifecycle.handling`, before creating the change

#### Scenario: Invalid lifecycle config

- **WHEN** the create read includes `lifecycleError`
- **THEN** propose reports its `issues` and `fix` and stops without creating or editing any files

#### Scenario: No lifecycle fields

- **WHEN** the create read has neither `lifecycle` nor `lifecycleError`
- **THEN** propose creates the change as before
