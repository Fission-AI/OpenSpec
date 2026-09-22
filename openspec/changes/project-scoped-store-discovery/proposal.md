## Why

OpenSpec stores (beta) use a machine-level registry that maps store IDs to absolute filesystem paths. After cloning a repository that references a store, every developer must manually run `openspec store register <path>` before the store is discoverable. Registering a second copy of the same store on the same machine under the same ID fails — only one checkout per store ID is supported. This makes stores impractical for teams that use meta-repositories, side-by-side clones, or any workflow where store bindings should travel with the repository rather than live on each machine.

## What Changes

- Add an optional **project-scoped store registry** file (`.openspec-store/registry.yaml`) that maps store IDs to paths relative to that file.
- Discover this file automatically by searching from the current working directory and walking up the directory tree. This is a well-established discovery pattern used by package managers (npm, yarn, pnpm discover config files like `package.json`, `.npmrc`, `.yarnrc` by walking up the directory tree). OpenSpec uses a similar mechanism to find the nearest `openspec/` root.
- When a store ID is resolved (`--store`, `references:`, `store:` in config.yaml), a project-scoped registry will take precedence over the global registry. The exact resolution mechanism is a design decision — see design.md. Existing setups without a project-scoped registry will not be affected.
- The project-scoped registry file can be created manually or generated with `openspec store register --scope project`. No new commands — a new `--scope` parameter will be added to the existing `store register` command.

## Capabilities

### New Capabilities

- `store-discovery`: Project-scoped store registry discovery and resolution — how OpenSpec finds a store by ID when a project-level registry file exists, how relative paths are resolved, and how project-scoped and global registries interact.

## Impact

- `src/core/store/foundation.ts` — path resolution for the registry file; support for a project-scoped registry location alongside the global one.
- `src/core/store/registry.ts` — store lookup, conflict detection, and listing operations must accept and propagate a project scope option.
- `src/core/store/operations.ts` — bare `readStoreRegistryState()` calls propagate scope options from callers.
- `src/core/root-selection.ts` — the resolution chain in `resolveOpenSpecRoot` gains a project-scoped registry step between the nearest-root walk and the global `defaultStore` fallback.
- `src/commands/store.ts` — new `--scope project` flag for `store register`, `store list`, and `store unregister`.
- `src/core/references.ts` — referenced-store index assembly resolves store IDs through the merged registry (project-scoped + global) when a project-scoped registry is available.
- Tests across `test/core/root-selection.test.ts`, `test/core/store/`, and `test/cli-e2e/` — new test coverage for project-scoped discovery, relative path resolution, and precedence over the global registry.
- `docs/stores-beta/user-guide.md` — documentation of the project-scoped registry feature.
