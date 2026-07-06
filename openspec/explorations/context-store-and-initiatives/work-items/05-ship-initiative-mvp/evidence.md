# Ship Initiative MVP Evidence

## Research Summary

- Initiative code should live in `src/core/collections/initiatives/`, outside
  `src/core/context-store/`.
- Initiative APIs should consume a mounted `initiatives` collection from Item 4
  rather than raw context-store roots.
- The first coding slice should lock metadata and templates before mounted
  create/list operations.
- Visible `initiative.yaml` is preferred for the new shared initiative model.
- `links.yaml` should not exist in the initiative MVP. Repo-change wiring is a
  workspace/local coordination concern to revisit later.
- Read/show, update, and delete have extra policy risk, so create/list should
  come before broader lifecycle behavior.
- The first mounted operation slice should do create/list only. A full
  `readInitiative` API is deferred until the return shape is clearer.

## Decisions

- Use `src/core/collections/initiatives/` for initiative-domain code.
- Do not put initiative semantics into `src/core/context-store/`.
- Add `initiative.yaml` strict parse/serialize helpers.
- Generate Markdown files up front, but do not validate Markdown content beyond
  existence/templates in the first pass.
- Defer workspace opening, repo resolution, status dashboards, sync, linked
  change lifecycle, `links.yaml`, `contracts/`, and CLI behavior.
- Detect initiatives by valid `initiative.yaml`: missing means ignore, invalid
  means fail loudly, and the YAML `id` must match the folder name.

## Suggested First Coding Slice

Add:

- `src/core/collections/initiatives/schema.ts`
- `src/core/collections/initiatives/templates.ts`
- `src/core/collections/initiatives/operations.ts`
- `src/core/collections/initiatives/index.ts`
- focused tests under `test/core/collections/initiatives/`

Cover:

- constants for initiative file names
- `validateInitiativeId`
- strict `initiative.yaml` parse/serialize
- create/list operations through a mounted `initiatives` collection
- template builders for `requirements.md`, `design.md`, `decisions.md`,
  `questions.md`, and `tasks.md`
- tests for valid and invalid metadata, invalid IDs, unknown YAML fields,
  required `created`, and generated template names/content shape

## Implementation Evidence

- `src/core/collections/initiatives/schema.ts` defines initiative constants,
  strict persisted `initiative.yaml` parsing/serialization, required
  `created`, bounded JSON-like metadata, statuses, and portable kebab-case
  initiative IDs.
- `src/core/collections/initiatives/templates.ts` defines deterministic default
  Markdown file builders for requirements, design, decisions, questions, and
  tasks.
- `src/core/collections/initiatives/index.ts` exports the initiative
  schema/template surface inside the initiative module only.
- `src/core/collections/initiatives/operations.ts` creates MVP initiative
  folders and lists initiative states using the valid-`initiative.yaml`
  detection rule.
- `src/core/collections/index.ts` exports the initiative module now that it has
  a mounted operation API.
- `test/core/collections/initiatives/schema.test.ts` covers file constants,
  no `links.yaml`, ID validation, strict YAML behavior, required `created`,
  default owners/metadata, metadata validation, and serialization round trips.
- `test/core/collections/initiatives/templates.test.ts` covers generated
  Markdown file names, deterministic ordering, trailing newlines, and expected
  section headings.
- `test/core/collections/initiatives/operations.test.ts` covers create, list,
  duplicate protection, cleanup on partial write failure, missing
  `initiative.yaml` ignored, invalid `initiative.yaml` failure, and folder/id
  mismatch failure.
- `src/core/context-store/registry.ts` was added as the next integration
  enabler before CLI wiring.
- `src/commands/initiative.ts` adds `openspec initiative create/list` as a thin
  CLI adapter over the context-store facade and mounted initiatives collection.
- `src/cli/index.ts` registers the initiative command.
- `src/core/completions/command-registry.ts` registers static completion
  metadata for `initiative create/list/ls`.
- `test/commands/initiative.test.ts` covers JSON create, `--store-path` list,
  human output, selector errors, duplicate create errors, and completion
  registry entries.

## Verification

- `pnpm exec vitest run test/core/collections/initiatives/schema.test.ts test/core/collections/initiatives/templates.test.ts`
- `pnpm exec vitest run test/core/collections/initiatives/operations.test.ts`
- `pnpm exec vitest run test/core/collections/initiatives/schema.test.ts test/core/collections/initiatives/templates.test.ts test/core/collections/initiatives/operations.test.ts test/core/collections/runtime.test.ts test/core/context-store/foundation.test.ts test/core/planning-home.test.ts`
- `pnpm exec vitest run test/commands/initiative.test.ts`
- `pnpm exec vitest run test/core/context-store/registry.test.ts test/core/collections/initiatives/operations.test.ts test/core/collections/initiatives/schema.test.ts test/core/collections/initiatives/templates.test.ts test/core/collections/runtime.test.ts`
- `pnpm exec vitest run test/commands/workspace.test.ts`
- `pnpm run build`
- `pnpm run lint`
- `git diff --check`
