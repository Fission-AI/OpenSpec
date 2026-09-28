# Add Minimal Context Store UX Evidence

## Conversation Decisions

- The next roadmap step should not jump straight to repo-local change linking
  or workspace initiative opening.
- Teams first need a simple way to create or register the shared context store
  that holds initiatives.
- The workflow is agent-first: the user prompts an agent, and the agent uses CLI
  primitives to discover stores and initiatives.
- `context-store` should be the top-level command namespace for now. It is more
  explicit for agents than `store`, and `store` can remain shorthand in scoped
  flags such as `initiative list --store <id>`.
- A store can start as a local Git-backed folder. OpenSpec can help create the
  folder, write metadata, register it locally, and optionally initialize Git.
- When setup does not receive `--path`, it should create or use `./<id>`. This
  keeps the real shared store visible and avoids hiding it under global data.
- Using the current directory should require explicit `--path .`.
- If a user registers an existing folder or clone, the default store id can be
  the repo or folder name.
- Portable `.openspec-store/store.yaml` metadata should be checked in and should
  not include local paths.
- `.openspec-store/store.yaml` is the identity file itself, not a bundle beside
  another checked-in metadata file. It should contain only `version` and `id`
  for now.
- Future backend, sync, collection, permission, or policy config should not be
  added to `store.yaml` by default.
- The local registry maps store ids to local paths on one machine.
- Remote-url clone/setup sugar is useful but can wait.
- `initiative list` should list all registered stores by default; `--store`
  should filter.
- Interactive setup should prompt for Git initialization and default to yes
  when no explicit Git flag is provided.
- Non-interactive, JSON, `--init-git`, and `--no-init-git` setup should not
  prompt.
- `context-store register` should be idempotent for the same id/path and fail
  for the same id with a different path until a future explicit replacement
  option exists.
- `context-store list` should stay a simple registry index and should not show
  health warnings.
- `context-store doctor` owns health diagnostics. The first slice should check
  registry/path/metadata and cheap Git repository presence, not dirty state,
  branch, remote, sync, pull/push, or conflicts.
- `initiative list` should allow partial success in all-store mode: show
  initiatives from readable stores and print one small warning pointing to
  `context-store doctor` when other registered stores cannot be read.
- Filtered `initiative list --store` and explicit `--store-path` should fail
  directly when the selected store cannot be read.
- Partial success should exit 0 with warning diagnostics in JSON. Total failure
  should exit nonzero.
- Register id inference should use the repo/folder name as-is with normal
  context-store id validation. Do not add normalization in this slice.
- Setup should reject non-empty folders without context-store metadata for now.
- Registry conflicts should fail when the same id points at a different path or
  the same path is already registered under a different id.
- Empty states should stay simple: no stores registered for `context-store list`
  and `doctor`; no initiatives found because no stores are registered for
  `initiative list`.
- Static shell completion metadata is now part of the shipped command surface;
  dynamic store-id and initiative-id completions remain deferred.

## Risks To Check Before Implementation

- Existing command naming conventions may prefer verb-first flows, while
  context-store commands are naturally noun namespaced.
- Shell completions are manually registered; keep future command additions in
  `src/core/completions/command-registry.ts` with focused registry tests.
- Human output should match existing compact CLI output patterns.
- JSON output should be stable enough for agents without over-modeling future
  sync or remote behavior.

## Implementation Evidence

- `src/commands/context-store.ts` adds the `context-store` command namespace
  with setup, register, list, and doctor subcommands.
- `src/cli/index.ts` registers the context-store command.
- `src/commands/context-store.ts` keeps strict CLI setup/register policy in the
  command layer while reusing context-store foundation helpers.
- `src/commands/initiative.ts` now lets `initiative list` search all registered
  stores by default, keeps `--store` as a filter, preserves `--store-path`, and
  reports all-store partial success with warning diagnostics.
- `src/core/completions/command-registry.ts` registers static completion
  metadata for the context-store command surface.
- `test/commands/context-store.test.ts` covers setup, register, list, doctor,
  conflict handling, non-empty setup rejection, and interactive Git init.
- `test/commands/initiative.test.ts` covers all-store initiative listing,
  compact human output, empty registered-store state, partial success, and all
  unreadable stores.

## Verification

- `pnpm run build`
- `pnpm exec vitest run test/commands/context-store.test.ts test/commands/initiative.test.ts`
- `pnpm exec vitest run test/core/context-store/foundation.test.ts
  test/core/context-store/registry.test.ts
  test/core/collections/initiatives/operations.test.ts`
- `pnpm run lint`
