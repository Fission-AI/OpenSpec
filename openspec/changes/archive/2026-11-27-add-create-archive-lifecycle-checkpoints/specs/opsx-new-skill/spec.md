## Purpose

Defines how the `/opsx:new` skill and command check for an OpenSpec root and handle the `change.create.before` lifecycle checkpoint.

## ADDED Requirements

### Requirement: Use the create read as the project check

The `/opsx:new` skill and command SHALL run `openspec instructions create --json`, keeping `--store` when a store is selected, as their project check before `openspec new change`, in place of `openspec list --json`.

#### Scenario: Current CLI

- **WHEN** the create read returns `root`
- **THEN** new reads its `root` and `status` as the project check and makes no separate `openspec list --json` call

#### Scenario: CLI predates instructions create

- **WHEN** the create read returns JSON without a `root` field
- **THEN** new runs the project check with `openspec list --json` and continues without lifecycle actions

### Requirement: Handle the create checkpoint in new

Before `openspec new change`, new SHALL handle the create read's lifecycle fields once. It SHALL NOT call `openspec lifecycle actions`.

#### Scenario: Before actions configured

- **WHEN** the create read includes `lifecycle.before`
- **THEN** new handles those actions once, following `lifecycle.handling`, before creating the change

#### Scenario: Invalid lifecycle config

- **WHEN** the create read includes `lifecycleError`
- **THEN** new reports its `issues` and `fix` and stops without creating any files

#### Scenario: No lifecycle fields

- **WHEN** the create read has neither `lifecycle` nor `lifecycleError`
- **THEN** new creates the change as before
