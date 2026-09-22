## Context

Store resolution today (`src/core/root-selection.ts`, `resolveOpenSpecRoot`) follows a strict precedence chain: `--store <id>` → nearest `openspec/` root (with optional `store:` pointer in config.yaml) → global `defaultStore` → registered-stores hint → implicit root. All store ID lookups go through one global registry file at `~/.local/share/openspec/stores/registry.yaml` (`src/core/store/foundation.ts`, `getStoreRegistryPath`). Every registry function accepts an optional `globalDataDir` (`StorePathOptions`) but always resolves to that single global location.

The existing `findQualifyingRootSync` in `root-selection.ts` walks up the directory tree to find the nearest `openspec/` root, using `findRepoPlanningRootSync` from `planning-home.ts` as the underlying walk. This same pattern can be reused to discover a project-scoped registry file.

## Goals / Non-Goals

**Goals:**
- Let a project declare store bindings in a committed file, discovered automatically by walking up from cwd.
- Resolve store paths relative to the registry file's directory, using `path.join` / `path.resolve` for cross-platform safety.
- Preserve full backward compatibility — no behavior change when the project-scoped registry file does not exist.

**Non-Goals:**
- Automatic creation of the project-scoped registry file. Users create it manually or via an optional `--scope project` flag on `store register`.
- Merging or layering multiple project-scoped registries. Only the nearest one (closest to cwd) is used.
- Changing the global registry format or location.
- Adding clone/pull/push/sync for stores. The project-scoped registry only maps IDs to local paths.

## Decisions

### D1: Registry file location and name

**Decision:** `.openspec-store/registry.yaml` in the project root.

**Rationale:** The `.openspec-store/` directory is already established by store identity metadata (`store.yaml`). Placing the project-scoped registry there keeps store infrastructure in one place. The name `registry.yaml` mirrors the global registry file name.

**Alternative considered:** `.openspec/registry.yaml` — rejected because `.openspec/` is the planning directory (specs, changes, config), not store infrastructure.

### D2: Registry file format

**Decision:** A YAML file with a `version` field and a `stores` map. Each store entry maps a store ID to a relative path:

```yaml
version: 1
stores:
  platform-specs:
    path: platform-specs
  design-system-specs:
    path: design-system-specs
```

**Rationale:** This is the format described in issue #1950 and in the spec. It is simpler than the global registry's `backend: { type: git, local_path: ... }` shape because project-scoped entries only need a path — backend type, remote, and branch are irrelevant when the store is already on disk. The `version` field allows future schema evolution.

**Alternative considered:** Reusing the global `StoreRegistryState` schema with `backend.type` / `backend.local_path` — rejected because it carries fields (`remote`, `branch`) that have no meaning in a project-scoped context, and the path field name (`local_path`) is confusing when the value is relative. A dedicated parser for the simpler format is straightforward.

### D3: Path resolution

**Decision:** `path.resolve(registryDir, entry.path)` where `registryDir` is the directory containing `registry.yaml` and `entry.path` is the relative path from the store entry. Always use `path.resolve` / `path.join` — never string concatenation.

**Rationale:** Cross-platform requirement (config rule). `path.resolve` handles platform separators and normalizes `..` segments correctly.

### D4: Discovery walk

**Decision:** Walk up from `process.cwd()`, checking for `.openspec-store/registry.yaml` at each level. Stop at the first match (nearest wins). Reuse the existing `findRepoPlanningRootSync` pattern from `planning-home.ts`.

**Rationale:** Same pattern npm/yarn/pnpm use for config file discovery, and that OpenSpec already uses for `openspec/` root discovery. Nearest-wins avoids ambiguity. The walk reuses the pattern from `findRepoPlanningRootSync` (checking for a specific file at each level) but is a separate function because the target file (`.openspec-store/registry.yaml`) differs from the planning-root marker.

**Alternative considered:** Walking up to the filesystem root and collecting all registries — rejected as unnecessary complexity. The nearest registry is sufficient for all identified use cases.

### D5: Precedence in resolveOpenSpecRoot

**Decision:** Insert the project-scoped registry lookup between the nearest-root walk (step 2) and the global `defaultStore` fallback (step 3). When a store ID is looked up, the project-scoped and global registries are merged (project-scoped wins on conflict — see D8 for the full merge semantics and alternatives):

1. `--store <id>` → merged registry (project-scoped + global, project-scoped wins on conflict — see D8)
2. Nearest `openspec/` root (with `store:` pointer → merged registry)
3. Project-scoped registry discovery (any store, not just a named one)
4. Global `defaultStore`
5. Registered-stores hint / implicit root

**Rationale:** Project-scoped bindings are more specific than machine-global defaults but less specific than an explicit `--store` flag or a root found by walking up. This preserves backward compatibility: without a project-scoped registry, the chain is unchanged.

**Alternative considered:** Project-scoped registry before nearest root — rejected because a local `openspec/` root with a planning shape is the most specific signal and should win.

### D6: Threading scope through existing functions

**Decision:** Extend `StorePathOptions` with an optional `projectRoot` field. When set, `getStoreRegistryPath` resolves to `path.join(projectRoot, STORE_METADATA_DIR_NAME, STORE_REGISTRY_FILE_NAME)` using existing constants, instead of the global path. Registry read functions (`readStoreRegistryState`, `listRegisteredStores`) accept the extended options. Registration and conflict-detection functions (`commitStoreRegistration`, `assertNoRegisteredStoreConflict`) also accept `projectRoot` but write the simpler `{ path: ... }` entry format (D2) rather than the global `backend` shape.

**Rationale:** Minimal API surface change. The `StorePathOptions` threading pattern is already established. Functions that call `readStoreRegistryState()` with no options (in `operations.ts`) will need explicit propagation, but the signature stays the same.

### D7: New OpenSpecRootSource and diagnostic codes

**Decision:** Add `'project_store'` to the `OpenSpecRootSource` union. Add diagnostic codes: `project_registry_malformed`, `project_registry_not_found` (informational, not an error).

**Rationale:** The `source` field is how JSON output tells consumers where a root came from. New diagnostic codes follow the existing taxonomy pattern in `RootSelectionDiagnostic`.

### D8: Resolution when project-scoped registry exists but store ID is absent

**Decision:** Merge project-scoped and global registries. When a store ID is present in both, the project-scoped entry wins. When a store ID is present only in the global registry, it resolves from the global registry with a warning in human mode and the existing `source: 'store'` marker in JSON mode. When a store ID is present only in the project-scoped registry, it resolves from the project-scoped registry with the new `source: 'project_store'` marker.

**Three approaches considered:**

**Variant A — Merge (npm-style).** Project-scoped and global registries are merged. Project-scoped overrides on ID conflict. Store IDs absent from the project-scoped registry but present in the global registry resolve from the global registry silently.
- *Pros:* Backward-compatible — global stores always accessible. Familiar pattern (npm/yarn/pnpm merge config files).
- *Cons:* Isolation is leaky — a store ID resolves from the machine's global registry, which may point to a different store on another machine. Developer may not realize where the store came from.

**Variant B — Nearest wins (isolation).** When a project-scoped registry is found, it fully replaces the global registry for resolution. A store ID absent from the project-scoped registry is an error, even if it exists globally.
- *Pros:* Full isolation. Explicit — developer knows all stores are declared in the project.
- *Cons:* Breaks backward compatibility — `--store <global-id>` stops working when a project-scoped registry exists. Not consistent with the npm-style merge pattern referenced in the proposal.

**Variant C — Merge with source indication (chosen).** Same merge as Variant A, but the resolution source is reported: `source: 'project_store'` or `source: 'store'` (global) in JSON output, and a warning in human mode when a store ID falls back to the global registry while a project-scoped registry is present.
- *Pros:* Backward-compatible. Predictable — developer sees where the store came from. Isolation is preserved for IDs declared in the project-scoped registry (project-scoped wins on conflict). Closest to the npm-style merge pattern.
- *Cons:* Slightly more complex implementation — resolution must track and report the source of each store lookup.

**Why C over A:** Silent fallback (A) creates a surprise — a store resolves from an unknown location. The source indication in C makes the behavior visible without blocking it.

**Why C over B:** B breaks backward compatibility — a developer who uses `--store <global-id>` alongside a project-scoped registry would get an error. C preserves their workflow while making the resolution path visible.

## Risks / Trade-offs

- **[Stale project-scoped registry pointing at a moved directory]** → The `inspectRegisteredStore` health check already validates that a resolved store root exists and has a healthy `openspec/` shape. A stale entry produces the same `unhealthy_store_root` diagnostic as a stale global registration.
- **[Registry file committed with machine-specific paths]** → The spec recommends relative paths. If a user commits absolute paths, `path.resolve` still works — absolute paths are returned as-is. No validation rejects them, but documentation should recommend relative paths.
- **[Two project-scoped registries in the same ancestor chain]** → Nearest wins, by design. This is documented in the spec and matches the behavior of package manager config discovery.
- **[Performance of the discovery walk]** → The walk is bounded by filesystem depth and stops at the first match. The same cost as the existing `openspec/` root walk. No measurable impact.
