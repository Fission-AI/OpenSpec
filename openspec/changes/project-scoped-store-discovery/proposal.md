## Why

OpenSpec stores use a machine-level registry that maps store IDs to absolute filesystem paths. After cloning a repo, every developer must manually register stores, and only one checkout per store ID is supported — making stores impractical for repositories with multiple projects and stores, side-by-side clones, or any workflow where store bindings should travel with the repository rather than live on each machine.

## What Changes

- An optional **project-scoped store registry** file (`.openspec-store/registry.yaml`) will be added, mapping store IDs to paths relative to that file.
- This file will be discovered automatically by searching from the current working directory and walking up the directory tree.
- When a store ID is resolved (`--store`, `references:`, `store:` in config.yaml), a project-scoped registry will take precedence over the global registry. Existing setups without a project-scoped registry will not be affected.
- The project-scoped registry file will be creatable manually or via `openspec store register --scope project`. No new commands will be added — a new `--scope` parameter will be added to the existing `store register`, `store list`, `store unregister`, `store remove`, and `store doctor` commands.

## Capabilities

### New Capabilities

- `store-discovery`: Project-scoped store registry discovery and resolution — how OpenSpec finds a store by ID when a project-level registry file exists, how relative paths are resolved, and how project-scoped and global registries interact.

## Impact

- `src/core/store/foundation.ts` — path resolution for the registry file; support for a project-scoped registry location alongside the global one.
- `src/core/store/registry.ts` — store lookup, conflict detection, and listing operations must accept and propagate a project scope option.
- `src/core/store/operations.ts` — bare `readStoreRegistryState()` calls propagate scope options from callers.
- `src/core/root-selection.ts` — the resolution chain in `resolveOpenSpecRoot` gains a project-scoped registry step between the nearest-root walk and the global `defaultStore` fallback.
- `src/commands/store.ts` — new `--scope project` flag for `store register`, `store list`, `store unregister`, `store remove`, and `store doctor`.
- `src/core/references.ts` — referenced-store index assembly resolves store IDs through project-scoped discovery with global fallback when a project-scoped registry is available.
- `src/commands/shared-gather.ts` — shared gathering logic propagates the project-scoped registry directory to reference index assembly.
- `src/commands/workflow/instructions.ts` — workflow instruction generation passes the project-scoped registry directory to reference index assembly.
- `src/core/completions/command-registry.ts` — shell completions for the new `--scope` flag on `store register`, `store list`, `store unregister`, `store remove`, and `store doctor`.
- Tests across `test/core/root-selection-project-scoped.test.ts`, `test/core/store/`, `test/core/project-scoped-coverage.test.ts`, `test/commands/store.test.ts`, `test/core/completions/command-registry.test.ts`, and `test/cli-e2e/` — new test coverage for project-scoped discovery, relative path resolution, and precedence over the global registry.
- `docs/stores-beta/user-guide.md` — documentation of the project-scoped registry feature.
- `docs/cli.md` — walk-up behavior for `store list`, `store unregister`, `store remove`, and `store doctor`.
- `.changeset/project-scoped-store-discovery.md` — changeset describing the new feature for users.
