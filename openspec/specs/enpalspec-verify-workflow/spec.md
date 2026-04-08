# enpalspec-verify-workflow Specification

## Purpose

TBD — Defines the verify workflow as part of the enpalspec core profile, including its position in the workflow order, its presence in the dev environment, and its role as the mandatory step between apply and archive.

## Requirements

### Requirement: Verify is part of the core workflow

The `core` profile SHALL include `verify` as a workflow step positioned between `apply` and `archive`.

#### Scenario: CORE_WORKFLOWS includes verify

- **WHEN** `getProfileWorkflows('core')` is called
- **THEN** the returned array SHALL include `'verify'`
- **AND** the order SHALL be: `['propose', 'explore', 'apply', 'verify', 'archive']`

#### Scenario: Core profile workflow order

- **WHEN** the core profile workflows are enumerated
- **THEN** `verify` SHALL appear after `apply` and before `archive`

### Requirement: Verify command exists in dev environment

The enpalspec development environment SHALL include a `.claude/commands/enpalspec/verify.md` file for dogfooding the verify workflow.

#### Scenario: Dev environment verify command present

- **WHEN** inspecting the enpalspec repository
- **THEN** `.claude/commands/enpalspec/verify.md` SHALL exist
- **AND** its content SHALL match what `enpalspec init` generates for Claude Code targets
- **AND** it SHALL use `enpalspec` CLI binary calls and `EnpalSpec: Verify` display name
