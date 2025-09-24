# Repository Guidelines

## Project Structure & Module Organization
OpenSpec ships as a TypeScript-first CLI. Source code lives in `src`, with feature logic in `core`, interactive flows in `cli`, reusable helpers in `utils`, and command wiring in `commands`. After `pnpm run build`, deliverables land in `dist` and feed the published entry point `bin/openspec.js`. Specs and change proposals reside in `openspec/specs` and `openspec/changes`; update them whenever behavior shifts so automation stays aligned. Shared assets live in `assets`, and Vitest suites in `test` mirror the source layout for easy cross-reference.

## Build, Test, and Development Commands
Run `pnpm install` to sync dependencies. `pnpm run build` compiles TypeScript to `dist` and must stay green before release. Use `pnpm run dev` for a `tsc --watch` loop and `pnpm run dev:cli` to rebuild then execute the local CLI. `pnpm test` runs the Vitest suite once, `pnpm run test:watch` keeps it hot while iterating, and `pnpm run test:coverage` verifies instrumentation thresholds. Use `pnpm run changeset` when preparing a release entry.

## Coding Style & Naming Conventions
We follow idiomatic TypeScript with ES modules, 2-space indentation, and semicolons. Prefer named exports from index barrels and keep filenames kebab-cased (e.g., `list-command.ts`). Classes use `PascalCase`, functions and variables use `camelCase`, and constants representing flags may use `SCREAMING_SNAKE_CASE`. Keep modules small, colocate helpers under `src/utils`, and avoid new dependencies without spec-backed justification.

## Testing Guidelines
Every behavior change needs Vitest coverage under `test`, co-located by feature (e.g., `test/core/update.test.ts`). Name suites after the module under test and lean on `vitest.setup.ts` for shared configuration. Run `pnpm test` before pushing and add regression cases for each bug fix or spec requirement.

## Commit & Pull Request Guidelines
Commits follow Conventional Commits (`type(scope): subject`) and stay single-line. Reference the touched module in the scope when practical. Each PR should summarize the spec or issue it fulfills, list manual verification steps, and note updates to any `openspec/` assets. Include CLI output snippets or screenshots when the UX changes, and ensure CI and coverage checks pass before requesting review.

## OpenSpec Workflow Tips
Treat specs as the contract: update `openspec/project.md` or the relevant `openspec/specs/*.md` before coding, then run `pnpm run dev:cli` to validate the CLI against the revised artifacts. `openspec list --specs` confirms the catalog, and `openspec change` drafts proposals—commit these alongside code so reviewers can trace rationale to implementation.
