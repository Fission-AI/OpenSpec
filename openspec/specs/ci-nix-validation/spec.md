# ci-nix-validation Specification

## Purpose

Validates Nix flake builds and maintenance scripts in CI to ensure Nix users can reliably install and use OpenSpec. Prevents regressions in Nix support by testing builds and the update-flake.sh script on every pull request and push to main.
## Requirements
### Requirement: Nix Flake Build Validation

The CI system SHALL validate that the Nix flake builds successfully on every pull request and push to main.

#### Scenario: Successful flake build

- **WHEN** a pull request or push to main is made
- **THEN** the CI SHALL execute `nix build` and verify it completes with exit code 0
- **AND** the build output SHALL contain the openspec binary

#### Scenario: Flake build failure

- **WHEN** the Nix flake configuration is broken
- **THEN** the CI job SHALL fail with a non-zero exit code
- **AND** the CI SHALL prevent merging of the pull request

#### Scenario: Multi-platform support check

- **WHEN** the flake declares support for multiple systems
- **THEN** the CI SHALL validate the flake builds on at least Linux (x86_64-linux)

### Requirement: Update Script Validation

The CI system SHALL validate that the update-flake.sh script executes successfully and produces valid output.

#### Scenario: Update script execution

- **WHEN** the CI runs the update script validation
- **THEN** the script SHALL execute without errors
- **AND** the script SHALL correctly read the version from package.json
- **AND** the script SHALL validate that flake.nix uses dynamic version from package.json

#### Scenario: Update script with mock hash

- **WHEN** validating the update script in CI
- **THEN** the script SHALL be able to detect and extract the correct pnpm dependency hash
- **AND** the flake.nix SHALL be updated with a valid sha256 hash

### Requirement: CI Job Integration

The Nix validation jobs SHALL be integrated into the existing GitHub Actions workflow and required for merge.

#### Scenario: PR merge requirements

- **WHEN** a pull request is created
- **THEN** the Nix validation job SHALL be included in required checks
- **AND** the PR SHALL NOT be mergeable until Nix validation passes

#### Scenario: Job execution triggers

- **WHEN** code is pushed to a pull request OR pushed to main OR manually triggered
- **THEN** the Nix validation job SHALL execute automatically

### Requirement: Local Testing Support

The CI workflow SHALL be testable locally using the `act` tool to enable rapid iteration.

#### Scenario: Local CI execution with act

- **WHEN** a developer runs `act` with the Nix validation workflow
- **THEN** the workflow SHALL execute in the local Docker environment
- **AND** the developer SHALL receive feedback on Nix build status without pushing to GitHub

#### Scenario: Act configuration compatibility

- **WHEN** the workflow is designed
- **THEN** it SHALL use standard GitHub Actions syntax compatible with `act`
- **AND** any Nix-specific setup SHALL work in the act Docker environment

### Requirement: Nix Installation in CI

The CI environment SHALL have Nix properly installed and configured before running validation.

#### Scenario: Nix installation step

- **WHEN** the Nix validation job starts
- **THEN** Nix SHALL be installed using the official Nix installer or determinatesystems/nix-installer-action
- **AND** the Nix installation SHALL be cached for subsequent runs to improve performance

#### Scenario: Nix configuration for CI

- **WHEN** Nix is installed in CI
- **THEN** it SHALL be configured to work in the GitHub Actions environment
- **AND** experimental features (flakes, nix-command) SHALL be enabled

### Requirement: CI Performance Optimization

The Nix validation SHALL be optimized to minimize CI runtime impact.

#### Scenario: Acceptable runtime

- **WHEN** the Nix validation job runs
- **THEN** it SHALL complete in under 5 minutes on a clean run
- **AND** with caching, it SHALL complete in under 3 minutes on subsequent runs

#### Scenario: Parallel execution

- **WHEN** multiple CI jobs are running
- **THEN** the Nix validation job SHALL run in parallel with other validation jobs (tests, lint)
- **AND** SHALL NOT block other independent checks

