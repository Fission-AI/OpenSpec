## 1. Foundation: project-scoped registry path resolution

- [ ] 1.1 Add `projectRoot` field to `StorePathOptions` in `src/core/store/foundation.ts` and update `getStoreRegistryPath` to resolve to `path.join(projectRoot, STORE_METADATA_DIR_NAME, STORE_REGISTRY_FILE_NAME)` when set, reusing existing constants — verify with a unit test that the path is correct on both POSIX and Windows
- [ ] 1.2 Add `findProjectRegistryDir(startPath)` function that walks up from `startPath` looking for `.openspec-store/registry.yaml`, returning the directory containing it or null — verify with a unit test that it finds the nearest match and stops at the first one
- [ ] 1.3 Add `readProjectStoreRegistryState(registryDir)` that reads and parses the project-scoped registry, resolving `path` fields relative to `registryDir` using `path.resolve` — verify with a unit test that relative paths and `..` segments resolve correctly

## 2. Root selection: project-scoped registry in resolution chain

- [ ] 2.1 Add `'project_store'` to `OpenSpecRootSource` union and new diagnostic codes (`project_registry_malformed`) in `src/core/root-selection.ts` — verify TypeScript compiles (`pnpm exec tsc --noEmit`)
- [ ] 2.2 Add `resolveMergedStoreRoot(id, projectRoot)` that reads both the project-scoped registry (if discovered) and the global registry, merges them (project-scoped wins on conflict), resolves the store ID to a path, and runs `inspectRegisteredStore` — verify with a unit test that a store in a project-scoped registry resolves correctly and a store only in the global registry also resolves
- [ ] 2.3 Update `resolveStoreRoot` to delegate to `resolveMergedStoreRoot` when a project-scoped registry is discovered, falling back to the current global-only path when no project registry is found — verify with a unit test that project-scoped takes precedence over global on ID conflict, and global IDs resolve when absent from project-scoped
- [ ] 2.4 Insert project-scoped registry discovery step in `resolveOpenSpecRoot` between the nearest-root walk and the global `defaultStore` fallback — verify with a unit test that the full resolution chain works end-to-end

## 3. Registry operations: scope-aware register, list, and unregister

- [ ] 3.1 Update `registerStore` in `src/core/store/registry.ts` to accept and propagate `projectRoot` through `StorePathOptions`, writing the simpler `{ path: ... }` entry format when project-scoped — verify with a unit test that registration writes to the project-scoped file in the correct format when `projectRoot` is set
- [ ] 3.2 Update `listRegisteredStores` to accept and propagate `projectRoot` — verify with a unit test that listing reads from the project-scoped file when set
- [ ] 3.3 Update `unregisterStoreRegistration` to accept and propagate `projectRoot` — verify with a unit test that unregister removes the entry from the project-scoped file
- [ ] 3.4 Update `assertNoRegisteredStoreConflict` so that a project-scoped entry with the same ID as a global entry is not a conflict (project-scoped wins by design) — verify with a unit test that registering a store ID that exists globally but with a different path succeeds when `projectRoot` is set
- [ ] 3.5 Update bare `readStoreRegistryState()` calls in `src/core/store/operations.ts` to propagate scope options from callers — verify with a unit test that `store list --scope project` lists project-scoped stores

## 4. CLI: --scope flag

- [ ] 4.1 Add `--scope <type>` flag to `store register`, `store list`, and `store unregister` subcommands in `src/commands/store.ts`, mapping `project` to `projectRoot: process.cwd()` — verify with a unit test that the flag is parsed and passed through
- [ ] 4.2 Update `store register` output to indicate whether registration went to the project-scoped or global registry — verify with a unit test that the JSON output includes the scope
- [ ] 4.3 Update `store doctor` to inspect project-scoped stores when a project-scoped registry is present — verify with a unit test that doctor reports health for project-scoped stores

## 5. References: project-scoped store resolution

- [ ] 5.1 Update `assembleReferenceIndex` in `src/core/references.ts` to resolve referenced store IDs through the merged registry (project-scoped + global) when a project-scoped registry is available — verify with a unit test that references resolve from the merged registry

## 6. Tests: integration and edge cases

- [ ] 6.1 Add integration test in `test/core/root-selection.test.ts` for the full precedence chain: `--store` with merged registry (project-scoped + global) → defaultStore → hint — verify all precedence scenarios pass
- [ ] 6.2 Add test for malformed project-scoped registry (invalid YAML, missing `version`, missing `stores`) — verify the system reports `project_registry_malformed` and resolves store IDs from the global registry
- [ ] 6.3 Add test for multiple clones of the same repository on the same machine — verify each clone resolves store IDs independently without conflict
- [ ] 6.4 Add e2e test in `test/cli-e2e/` for the full lifecycle: create project-scoped registry, run `openspec status --store <id>`, verify resolution — verify the e2e test passes
- [ ] 6.5 Add Windows path handling tests using `path.join` for all expected paths — verify tests pass on Windows CI

## 7. Documentation

- [ ] 7.1 Update `docs/stores-beta/user-guide.md` with a section on project-scoped registry: file format, discovery, precedence, and use cases — verify the file is updated and renders correctly
- [ ] 7.2 Add `pnpm changeset` describing the new feature for users — verify the changeset file is created with a clear description
