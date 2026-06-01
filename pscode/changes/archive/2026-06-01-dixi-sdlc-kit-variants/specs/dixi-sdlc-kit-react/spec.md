## ADDED Requirements

### Requirement: React editorconfig is installed
The system SHALL install `.editorconfig` for React/Next.js projects with: `[*.{ts,tsx,js,jsx}]` indent_size=2, charset=utf-8; `[*.{css,scss}]` indent_size=2; `[*.{json,yml,yaml,md}]` indent_size=2.

#### Scenario: React project receives editorconfig
- **WHEN** `pscode init --profile dixi` runs on a project where `family: react`
- **THEN** `.editorconfig` is created with React/TS-specific indent rules

#### Scenario: Existing editorconfig is preserved
- **WHEN** `.editorconfig` already exists in the project root and `family: react`
- **THEN** the file is left unchanged

### Requirement: Husky hooks are installed for React
The system SHALL install `.husky/commit-msg` (runs commitlint) and `.husky/pre-commit` (runs `npx --no-install lint-staged`) for React/Next.js projects.

#### Scenario: Both husky hooks are created
- **WHEN** `pscode init --profile dixi` runs on a project where `family: react`
- **THEN** `.husky/commit-msg` and `.husky/pre-commit` are created

#### Scenario: Existing husky hooks are preserved
- **WHEN** either `.husky/commit-msg` or `.husky/pre-commit` already exists
- **THEN** the existing file is left unchanged; the other is still created if absent

### Requirement: lint-staged config is installed for React
The system SHALL install `lint-staged.config.mjs` configuring: `*.{ts,tsx}` → `[eslint --fix, prettier --write]`; `*.{css,scss,md,json}` → `[prettier --write]`.

#### Scenario: lint-staged config is created
- **WHEN** `pscode init --profile dixi` runs on a project where `family: react`
- **THEN** `lint-staged.config.mjs` is created in the project root

#### Scenario: Existing lint-staged config is preserved
- **WHEN** `lint-staged.config.mjs` already exists
- **THEN** the file is left unchanged

### Requirement: GitHub Actions CI workflow for React is installed
The system SHALL install `.github/workflows/ci-react.yml` with jobs: `typecheck` (Node 20 + npm cache, `npx tsc --noEmit`), `lint` (`npm run lint`), `test` (`npm test` or `npx vitest run`), `build` (`npm run build`), `e2e` (conditional — only runs if `playwright.config.ts` exists). Trigger: push and pull_request on `main` and `develop`.

#### Scenario: CI workflow is created for React project
- **WHEN** `pscode init --profile dixi` runs on a project where `family: react`
- **THEN** `.github/workflows/ci-react.yml` is created with typecheck, lint, test, and build jobs

#### Scenario: e2e job is conditional
- **WHEN** the CI workflow runs in a project without `playwright.config.ts`
- **THEN** the e2e job is skipped without failing the pipeline

#### Scenario: Existing CI workflow is preserved
- **WHEN** `.github/workflows/ci-react.yml` already exists
- **THEN** the file is left unchanged

#### Scenario: Post-install message is shown
- **WHEN** the React kit is installed
- **THEN** the CLI prints a message instructing to run `npm install --save-dev @commitlint/cli @commitlint/config-conventional husky lint-staged prettier eslint`
