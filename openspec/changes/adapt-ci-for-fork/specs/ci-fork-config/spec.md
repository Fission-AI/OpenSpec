## ADDED Requirements

### Requirement: CI workflow contains no Nix jobs
The `ci.yml` workflow SHALL NOT contain any job that installs Nix, runs `nix build`, or depends on Nix flake files. The `nix-flake-validate` job and the `changes` path-filter job that gates it SHALL be removed.

#### Scenario: ci.yml has no nix-flake-validate job
- **WHEN** `ci.yml` is read
- **THEN** it MUST NOT contain a job named `nix-flake-validate`

#### Scenario: ci.yml has no changes detection job
- **WHEN** `ci.yml` is read
- **THEN** it MUST NOT contain a job named `changes`

### Requirement: Required-checks jobs do not reference Nix validation
The `required-checks-pr` and `required-checks-main` jobs in `ci.yml` SHALL NOT list `nix-flake-validate` in their `needs` array and SHALL NOT check the result of that job.

#### Scenario: required-checks-pr needs array is clean
- **WHEN** the `required-checks-pr` job's `needs` array is inspected
- **THEN** it MUST contain only `test_pr` and `lint`

#### Scenario: required-checks-main needs array is clean
- **WHEN** the `required-checks-main` job's `needs` array is inspected
- **THEN** it MUST contain only `test_matrix` and `lint`

### Requirement: Release prepare workflow is removed
The `.github/workflows/release-prepare.yml` file SHALL NOT exist in the repository, as it relies on upstream infrastructure not available in this fork.

#### Scenario: release-prepare.yml does not exist
- **WHEN** the `.github/workflows/` directory is listed
- **THEN** `release-prepare.yml` MUST NOT be present

### Requirement: Remaining CI jobs continue to run
The `test_pr`, `test_matrix`, `lint`, and `validate-changesets` jobs SHALL remain in `ci.yml` with their existing trigger conditions and steps unchanged.

#### Scenario: test_pr runs on pull_request events
- **WHEN** a pull request is opened against `main`
- **THEN** the `test_pr` job SHALL run and execute build and test steps

#### Scenario: lint runs on all triggers
- **WHEN** CI is triggered by pull_request, merge_group, push, or workflow_dispatch
- **THEN** the `lint` job SHALL run without any condition gate
