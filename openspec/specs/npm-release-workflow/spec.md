## Purpose

Automates publishing `@enpal/enpalspec` to npm on every push to `main` via a GitHub Actions release workflow.

## Requirements

### Requirement: Release workflow file exists
The repository SHALL contain `.github/workflows/release.yml` that automates publishing `@enpal/enpalspec` to npm on every push to `main`.

#### Scenario: release.yml is present
- **WHEN** the `.github/workflows/` directory is listed
- **THEN** `release.yml` MUST be present

### Requirement: Release workflow triggers on push to main
The `release.yml` workflow SHALL trigger on `push` to the `main` branch and on no other automatic trigger.

#### Scenario: push to main triggers publish
- **WHEN** a commit is pushed to the `main` branch
- **THEN** the release workflow SHALL start

#### Scenario: push to non-main branch does not trigger publish
- **WHEN** a commit is pushed to any branch other than `main`
- **THEN** the release workflow SHALL NOT start

### Requirement: Release workflow uses pnpm release:ci command
The `release.yml` workflow SHALL execute `pnpm run release:ci` to publish the package. It SHALL NOT invoke `changeset publish` directly.

#### Scenario: workflow runs release:ci
- **WHEN** the release job executes
- **THEN** it SHALL call `pnpm run release:ci` (which runs `check:pack-version && changeset publish`)

### Requirement: Release workflow authenticates with NPM_TOKEN
The `release.yml` workflow SHALL authenticate to npm using the `NPM_TOKEN` repository secret. The secret SHALL be passed as the `NODE_AUTH_TOKEN` environment variable during publish.

#### Scenario: NPM_TOKEN is available to publish step
- **WHEN** the publish step runs
- **THEN** `NODE_AUTH_TOKEN` SHALL be set from `secrets.NPM_TOKEN`

### Requirement: Release workflow installs dependencies before publishing
The `release.yml` workflow SHALL install all dependencies via `pnpm install --frozen-lockfile` before running the release command.

#### Scenario: dependencies installed before publish
- **WHEN** the release job runs
- **THEN** `pnpm install --frozen-lockfile` SHALL complete successfully before `pnpm run release:ci` is called

### Requirement: Release workflow builds the project before publishing
The `release.yml` workflow SHALL build the project (TypeScript compilation) before publishing.

#### Scenario: build runs before publish
- **WHEN** the release job runs
- **THEN** the build step SHALL run and complete before `pnpm run release:ci` is called
