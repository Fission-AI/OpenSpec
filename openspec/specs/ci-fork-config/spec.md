## Purpose

CI configuration for this fork removes upstream-only jobs (Nix validation, release preparation) and retains only the jobs that are valid in this fork context.

## Requirements

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

### Requirement: pack-version-check uses enpalspec bin path
`scripts/pack-version-check.mjs` SHALL reference `@enpal/enpalspec` as the bin path, not `@fission-ai/openspec`.

#### Scenario: pack-version-check passes with correct bin path
- **WHEN** `pnpm run check:pack-version` is executed
- **THEN** it SHALL NOT fail due to a mismatched bin path referencing `@fission-ai/openspec`

### Requirement: Changeset config references enpalspec repository
`.changeset/config.json` SHALL reference `enpal/enpalspec` as the GitHub repository for changelog link generation.

#### Scenario: changeset config has correct repo
- **WHEN** `.changeset/config.json` is read
- **THEN** the `changelog` repo value SHALL be `enpal/enpalspec`, not `Fission-AI/OpenSpec`

### Requirement: Inherited openspec changesets are deleted
The files `.changeset/graceful-status-no-changes.md` and `.changeset/fix-opencode-commands-directory.md` SHALL NOT exist in the repository.

#### Scenario: stale changesets are absent
- **WHEN** the `.changeset/` directory is listed
- **THEN** `graceful-status-no-changes.md` and `fix-opencode-commands-directory.md` MUST NOT be present

### Requirement: Postinstall script uses ENPALSPEC_NO_COMPLETIONS env var
`scripts/postinstall.js` SHALL check the `ENPALSPEC_NO_COMPLETIONS` environment variable (not `OPENSPEC_NO_COMPLETIONS`) to suppress shell completion setup. The completion tip text SHALL reference `enpalspec completion install`.

#### Scenario: postinstall skips completions when ENPALSPEC_NO_COMPLETIONS is set
- **WHEN** the `ENPALSPEC_NO_COMPLETIONS` environment variable is set to any truthy value
- **THEN** `postinstall.js` SHALL skip shell completion setup

#### Scenario: postinstall tip text is enpalspec-branded
- **WHEN** the postinstall completion tip is printed
- **THEN** it SHALL display `enpalspec completion install`, not `openspec completion install`

### Requirement: Test postinstall script uses ENPALSPEC_NO_COMPLETIONS env var
`scripts/test-postinstall.sh` SHALL use `ENPALSPEC_NO_COMPLETIONS` when suppressing completions in the test environment.

#### Scenario: test-postinstall uses correct env var
- **WHEN** `scripts/test-postinstall.sh` is read
- **THEN** it SHALL reference `ENPALSPEC_NO_COMPLETIONS`, not `OPENSPEC_NO_COMPLETIONS`

### Requirement: Feedback command references enpalspec repository
`src/commands/feedback.ts` SHALL submit feedback to `enpal/enpalspec` on GitHub, not `Fission-AI/OpenSpec`.

#### Scenario: feedback command opens correct GitHub repo
- **WHEN** a user runs the `feedback` command
- **THEN** the generated GitHub issue URL SHALL reference `enpal/enpalspec`

### Requirement: Feedback command tests reference enpalspec repository
`test/commands/feedback.test.ts` SHALL mock the repository as `enpal/enpalspec` to match the updated `feedback.ts`.

#### Scenario: feedback tests pass with updated repo
- **WHEN** the feedback command tests are executed
- **THEN** all assertions that previously expected `Fission-AI/OpenSpec` SHALL expect `enpal/enpalspec`

### Requirement: Update command learn-more link references enpalspec
`src/core/update.ts` SHALL link users to the enpalspec GitHub repository (or a designated enpalspec URL) rather than a Fission-AI URL when displaying update information.

#### Scenario: update learn-more URL is enpalspec
- **WHEN** `src/core/update.ts` displays a learn-more or update link
- **THEN** the URL SHALL reference `github.com/enpal/enpalspec` (or equivalent enpalspec destination), not a Fission-AI URL

### Requirement: Init command footer link references enpalspec
`src/core/init.ts` SHALL display an enpalspec URL in its footer or completion message, not a Fission-AI URL.

#### Scenario: init footer URL is enpalspec
- **WHEN** `src/core/init.ts` prints its completion footer
- **THEN** the URL SHALL reference `github.com/enpal/enpalspec` (or equivalent enpalspec destination), not a Fission-AI URL
