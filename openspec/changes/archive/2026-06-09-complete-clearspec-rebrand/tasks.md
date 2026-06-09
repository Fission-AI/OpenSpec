## 1. Centralize the home-folder name constant

- [x] 1.1 In `src/core/config.ts`, rename `OPENSPEC_DIR_NAME = 'openspec'` to `CLEARSPEC_DIR_NAME = 'clearspec'` and export it
- [x] 1.2 Update all importers of `OPENSPEC_DIR_NAME` (`init.ts`, `cli/index.ts`, `commands/config.ts`, `core/update.ts`) to use `CLEARSPEC_DIR_NAME`
- [x] 1.3 Refactor hardcoded `path.join(..., 'openspec', ...)` literals to use `CLEARSPEC_DIR_NAME` in: `src/commands/change.ts`, `src/commands/schema.ts`, `src/commands/validate.ts`, `src/commands/workflow/shared.ts`, `src/commands/workspace/operations.ts`
- [x] 1.4 Same refactor in: `src/core/archive.ts`, `src/core/list.ts`, `src/core/view.ts`, `src/core/specs-apply.ts`, `src/core/planning-home.ts`, `src/core/project-config.ts`
- [x] 1.5 Same refactor in: `src/core/artifact-graph/instruction-loader.ts`, `src/core/artifact-graph/resolver.ts`, `src/utils/change-utils.ts`, `src/utils/change-metadata.ts`
- [x] 1.6 Update `src/core/command-generation/adapters/costrict.ts` and `src/core/completions/installers/bash-installer.ts` path segments to `clearspec`
- [x] 1.7 Update user-facing console messages/comments referencing `openspec/config.yaml` in `init.ts`, `legacy-cleanup.ts`, `project-config.ts`, `change-metadata.ts` to `clearspec/config.yaml`

## 2. Rename ancillary identifiers

- [x] 2.1 In `src/core/config.ts`, rename `OPENSPEC_MARKERS` to `CLEARSPEC_MARKERS` with values `<!-- CLEARSPEC:START -->` / `<!-- CLEARSPEC:END -->`; update all importers
- [x] 2.2 In `src/core/global-config.ts`, set `GLOBAL_CONFIG_DIR_NAME` and `GLOBAL_DATA_DIR_NAME` to `'clearspec'`; verify `telemetry/config.ts` and `core/index.ts` consumers
- [x] 2.3 Rename the completion opt-out env var `OPENSPEC_NO_COMPLETIONS` → `CLEARSPEC_NO_COMPLETIONS` in `src/core/completions/installers/bash-installer.ts` and `scripts/test-postinstall.sh`
- [x] 2.4 Rename `METADATA_FILENAME` `.openspec.yaml` → `.clearspec.yaml` in `src/utils/change-metadata.ts`; update its readers/writers
- [x] 2.5 Rename `WORKSPACE_METADATA_DIR_NAME` `.openspec-workspace` → `.clearspec-workspace` (`src/core/workspace/foundation.ts`) and `CONTEXT_STORE_METADATA_DIR_NAME` `.openspec-store` → `.clearspec-store` (`src/core/context-store/foundation.ts`)

## 3. Rebrand generated artifacts (CLSX titles + clearpoint author)

- [x] 3.1 In all 12 `src/core/templates/workflows/*.ts`, change command titles from `OPSX: …` to `CLSX: …` (explore, new-change, continue-change, apply-change, ff-change, sync-specs, archive-change, bulk-archive-change, verify-change, onboard, propose, feedback)
- [x] 3.2 In the same files, change `metadata: { author: 'openspec', ... }` to `author: 'clearpoint'`
- [x] 3.3 Update the description string in `new-change.ts` that references "(OPSX)" to "(CLSX)"
- [x] 3.4 Rename `getOpsx*` template functions to `getClsx*` in `src/core/templates/workflows/*.ts` and export them from `src/core/templates/skill-templates.ts`
- [x] 3.5 Update all imports and call sites of the renamed functions in `src/core/shared/skill-generation.ts` (imports, `CommandTemplateEntry`, `getCommandTemplates()`, `getCommandContents()`)

## 4. Make legacy-cleanup coexistence-safe

- [x] 4.1 In `src/core/legacy-cleanup.ts`, remove detection of `openspec/AGENTS.md` and `openspec/project.md` (no reads inside any `openspec` directory)
- [x] 4.2 Remove deletion of `openspec/AGENTS.md` and remove the `openspec/project.md` migration-hint output
- [x] 4.3 Remove deletion of legacy `openspec`-named slash-command directories (e.g. `.claude/commands/openspec/`)
- [x] 4.4 Ensure config-file marker cleanup matches only `CLEARSPEC` marker blocks and never `OPENSPEC` blocks
- [x] 4.5 Add regression tests proving a pre-existing `openspec/` directory and any `<!-- OPENSPEC:START -->` marker block are left completely untouched by `clearspec init`

## 5. Sweep schemas, docs, and tests (product surfaces only)

- [x] 5.1 Update `schemas/spec-driven/schema.yaml` and `schemas/spec-driven/templates/proposal.md` instruction text from `openspec/specs/` to `clearspec/specs/`
- [x] 5.2 Update all `docs/**` and `README.md` references from `openspec/` paths to `clearspec/`
- [x] 5.3 Update test fixtures that build `path.join(..., 'openspec', ...)` to use `clearspec` (`test/core/archive.test.ts`, `test/commands/artifact-workflow.test.ts`, `test/commands/change-initiative-link.test.ts`, `test/utils/change-metadata.test.ts`, `test/utils/change-utils.test.ts`, `test/specs/source-specs-normalization.test.ts`)
- [x] 5.4 Update any test assertions on author/marker/env-var/dir-name values to the new `clearpoint` / `CLEARSPEC` / `clearspec` values
- [x] 5.5 Do NOT modify the repo's own `openspec/` planning folder or the `.claude/` skills — these are the OpenSpec dev instance and are out of scope (Decision 7)

## 6. Verification

- [x] 6.1 Add a **scoped** guard check that fails if the literal `openspec` appears in ClearSpec's product surfaces — enumerate the scanned dirs (`src/`, `schemas/`, `docs/`, `README.md`) and explicitly exclude the repo's `openspec/` planning folder, `.claude/`, `LICENSE`, `node_modules`, and `dist`
- [x] 6.2 Run `pnpm build` and the full `pnpm test` suite; fix any breakages
- [x] 6.3 Run an end-to-end `clearspec init` in a scratch project and confirm: a `clearspec/` folder is created, generated command titles are `CLSX: …`, and generated skills declare `author: clearpoint`
- [x] 6.4 Verify cross-platform path handling on Windows CI (all path joins use `path.join` with the `clearspec` segment; no hardcoded separators)
- [x] 6.5 Verify coexistence end-to-end: run `clearspec init` in a scratch project that already contains an `openspec/` folder and an `<!-- OPENSPEC:START -->` block, and confirm both are untouched
