# Add Agent-First Initiative Discovery Evidence

## Conversation Decisions

- `initiative show <id>` should be a locator/discovery command for agents.
- The command should answer which initiative the user meant, where the
  canonical context lives, and where the initiative metadata is.
- The command should not concatenate markdown, summarize initiative contents,
  compute work progress, resolve local repos, list linked changes, or open a
  workspace.
- Default lookup should search all registered context stores.
- `--store <id>` should disambiguate or filter to one registered store.
- `--store-path <path>` should remain the explicit local-path escape hatch.
- Duplicate initiative ids across stores should fail with an ambiguity error.
- Default all-store lookup should fail when any registered store is unreadable,
  because uniqueness is unknowable.
- Explicit `--store` and `--store-path` lookup should only care about the
  selected store.
- `initiative.status` should be omitted from the v1 output projection.
- `owners` should be omitted from the v1 output projection.
- Arbitrary `metadata` should be omitted from the v1 output projection.
- `version` and `created` should stay in the v1 initiative projection.
- `files` should be omitted from v1.
- `initiative.metadata_path` should point to the validated `initiative.yaml`.
- `initiative.root` is enough for an agent to inspect the folder with normal
  filesystem tools.
- Top-level `matches` should be omitted. Ambiguity and incomplete-lookup
  candidates should live under the diagnostic that needs them, for example
  `status[0].details.matches`.
- `context_store.source` should be omitted from `initiative show` v1 because it
  is selector provenance, not context-store identity.
- A top-level `resolution` field is not needed in v1.
- Existing `initiative create/list` output can keep `context_store.source` for
  now; this item should not refactor old output shapes.
- `readInitiative` should return `null` when the exact initiative is absent and
  throw when `initiative.yaml` exists but is invalid or has the wrong id.
- In default all-store lookup, any unreadable registered store should make the
  primary error `initiative_lookup_incomplete`, even when readable stores have
  partial matches.
- If `initiatives/<id>/initiative.yaml` exists but is invalid or has the wrong
  id, `initiative show` should fail as broken initiative state instead of
  treating that store as not found.
- Human output should be a compact locator view on success: title, id, summary,
  context store, location, and canonical filenames.
- Human ambiguity and incomplete-lookup errors should show matching or partial
  matching stores inline, then point to the next command.
- Static shell completion metadata should ship for `initiative show`.
- Dynamic completions for store ids and initiative ids should remain deferred.

## Research Notes

- Current initiative create/list output spreads the full parsed
  `initiative.yaml` state, which is useful for MVP but too broad for the first
  `show` contract.
- A focused per-initiative read operation is preferred over implementing `show`
  through `listInitiatives`, because exact lookup should not fail due to an
  unrelated malformed initiative folder.
- Other initiative files are schema/config dependent and should not be
  hardcoded into `show`.
- Keeping candidates inside diagnostic details follows the same general shape as
  GraphQL-style responses: successful data stays clean, while error-specific
  context travels with the error.
- If selector provenance is needed later, add a separate explicit field such as
  `resolution` rather than putting provenance inside `context_store`.
- Human output should stay compact: title, id, summary, context store,
  location, and metadata path.

## Implementation Evidence

- `src/core/collections/initiatives/operations.ts` adds `readInitiative` for
  exact initiative lookup.
- `src/commands/initiative.ts` adds `initiative show <id>` with all-store
  default lookup, `--store`, `--store-path`, JSON output, compact human output,
  ambiguity diagnostics, and incomplete-lookup diagnostics.
- `src/core/completions/command-registry.ts` adds static completion metadata for
  `initiative show`.
- `test/core/collections/initiatives/operations.test.ts` covers exact read,
  absent initiatives, invalid exact initiatives, id mismatches, and unrelated
  invalid folders.
- `test/commands/initiative.test.ts` covers `initiative show` success,
  `--store-path`, human output, ambiguity, incomplete lookup, not found,
  invalid exact initiative state, no `context_store.source`, no `files`, no
  top-level `matches`, and static completions.

## Verification

- `pnpm run build`
- `pnpm exec vitest run test/core/collections/initiatives/operations.test.ts`
- `pnpm exec vitest run test/commands/initiative.test.ts`
- `pnpm exec vitest run test/commands/context-store.test.ts
  test/commands/initiative.test.ts test/core/context-store/foundation.test.ts
  test/core/context-store/registry.test.ts
  test/core/collections/initiatives/operations.test.ts`
- `pnpm run lint`
- `git diff --check`
- Markdown line-length check for the initiative roadmap, task tracker, and Item
  7 work-item notes.
