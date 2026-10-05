## Context

Store resolution today (`src/core/root-selection.ts`, `resolveOpenSpecRoot`) follows a strict precedence chain: `--store <id>` → nearest `openspec/` root (with optional `store:` pointer in config.yaml) → global `defaultStore` → registered-stores hint → implicit root.

All store ID lookups go through one global registry file at `~/.local/share/openspec/stores/registry.yaml` (`src/core/store/foundation.ts`, `getStoreRegistryPath`). Every registry function accepts an optional `globalDataDir` (`StorePathOptions`) but always resolves to that single global location.

The existing `findQualifyingRootSync` in `root-selection.ts` walks up the directory tree to find the nearest `openspec/` root, using `findRepoPlanningRootSync` from `planning-home.ts` as the underlying walk. This same pattern can be reused to discover a project-scoped registry file.

## Goals / Non-Goals

**Goals:**
- Let a project declare store bindings in a file, discovered automatically by walking up from cwd.
- Resolve store paths relative to the registry file's directory, using `path.join` / `path.resolve` for cross-platform safety.
- Preserve full backward compatibility — no behavior change when the project-scoped registry file does not exist.

**Non-Goals:**
- Do not create the project-scoped registry file automatically on clone or init. The user creates it manually or via `openspec store register --scope project`.
- Do not merge all `.openspec-store/registry.yaml` files into one. Walk up checking each file for the store ID — the first where the ID is found wins. If the ID is not found in any project-scoped registry, resolution falls through to the global registry.
- Do not change the format, location, or behavior of the global registry.
- Do not clone, pull, push, or synchronize stores. The project-scoped registry only maps store IDs to local paths.

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

**Rationale:** It is simpler than the global registry's `backend: { type: git, local_path: ... }` shape because project-scoped entries only need a path — backend type, remote, and branch can be read from the git repository at the store path directly, so there is no need to store them in the registry. The `version` field allows future schema evolution.

**Alternative considered:** Reusing the global `StoreRegistryState` schema with `backend.type` / `backend.local_path` — rejected because it carries fields (`remote`, `branch`) that have no meaning in a project-scoped context, and the path field name (`local_path`) is confusing when the value is relative. A dedicated parser for the simpler format is straightforward.

### D3: Path resolution

**Decision:** `path.resolve(registryDir, entry.path)` where `registryDir` is the directory containing `registry.yaml` and `entry.path` is the relative path from the store entry. Always use `path.resolve` / `path.join` — never string concatenation.

**Rationale:** Cross-platform requirement (config rule). `path.resolve` handles platform separators and normalizes `..` segments correctly. In the YAML file, `/` is recommended (e.g. `path: stores/platform-specs`) — `path.resolve` accepts `/` on all platforms including Windows. Backslash `\` works only on Windows and breaks on macOS/Linux.

**Alternative considered:** String concatenation with `/` separator in code (TypeScript) — rejected because it breaks on Windows and violates the cross-platform config rule.

### D4: Discovery walk

**Decision:** Walk up from `process.cwd()`, checking for `.openspec-store/registry.yaml` at each level. When a file is found, read it and search for the requested store ID. If the ID is found — use it, stop. If the ID is not found — continue walking up to the next level. If no registry file contains the ID after reaching the filesystem root — fall back to the global registry.

**Three approaches considered:**

**Variant A — Nearest file, stop.** Walk up, find the first `.openspec-store/registry.yaml`, stop. If the store ID is not in that file — fall back to the global registry. Does not check ancestor registries.
- *Pros:* Simplest. One file read. No ambiguity.
- *Cons:* A store ID declared in a parent project's registry is inaccessible from a subdirectory — unnatural for nested projects.

**Variant B — Merge all (npm `.npmrc`-style).** Read all `.openspec-store/registry.yaml` files up the chain, merge them, nearest overrides on conflict.
- *Pros:* All IDs from all levels available simultaneously.
- *Cons:* Merge creates the question "which entry wins on ID conflict" — extra complexity. Reading and parsing multiple files on every resolution.

**Variant C — Walk up, search ID at each level (chosen).** Walk up, at each level check `.openspec-store/registry.yaml`. If the file exists and contains the ID — use it, stop. If not — continue up. Fall back to global only after reaching the filesystem root.
- *Pros:* Simple (no merge, no conflict). Natural — a store ID from a parent project is accessible from a subdirectory. Predictable — nearest match for the ID wins.
- *Cons:* May read multiple files (bounded by filesystem depth — typically 3-5 levels, each a single `statSync` + `readFile`, microseconds).

**Why C over A:** A makes parent project store IDs inaccessible from nested projects — unnatural. A store declared in `meta/.openspec-store/registry.yaml` should be resolvable from `meta/plugin-a/`.

**Why C over B:** B merges all registries, creating ambiguity on ID conflicts. C avoids merge entirely — first registry where the ID is found wins, no conflict.

### D5: Precedence in resolveOpenSpecRoot

**Decision:** When a user runs a command, OpenSpec resolves the store in this order:

1. `--store <id>` — search for the ID in `.openspec-store/registry.yaml` (walk up per D4), then fall back to the global registry
2. Nearest `openspec/` root with a `store:` pointer in config.yaml — same: walk up per D4, then global registry
3. No `--store`, no local `openspec/` — take the first usable store from the chain of `.openspec-store/registry.yaml` files (nearest first, document order within each file)
4. No project-level stores — use the global `defaultStore`
5. Nothing at all — current directory (classic behavior)

**Rationale:** Project-scoped bindings are more specific than global ones but less specific than an explicit `--store` flag or a local `openspec/` root. Without a project-scoped registry, the chain is unchanged — backward compatibility preserved. Step 3 takes the first entry in document order (as listed in the YAML file, without sorting) — document order is deterministic and stable across YAML parsers that preserve insertion order.

**Alternative considered:** Project-scoped registry before nearest root — rejected because a local `openspec/` root with a planning shape is the most specific signal and should win.

### D6: Threading scope through existing functions

**Decision:** Extend `StorePathOptions` with an optional `projectRoot` field. All registry functions accept it. When set, they operate on the project-scoped registry instead of the global one: `register` writes the file at `projectRoot`; `list`, `unregister`, `remove`, and `doctor` treat it as the walk start and resolve the registry chain per D9. Registration writes the simpler `{ path: ... }` entry format (D2) rather than the global `backend` shape. Project-scoped conflict detection is inline in `registerExistingStore`, not in `assertNoRegisteredStoreConflict`, because the project-scoped format (`{ path: ... }`) differs from the global format (`{ backend: ... }`).

**Rationale:** Minimal API surface change. The `StorePathOptions` threading pattern is already established. Functions that call `readStoreRegistryState()` with no options (in `operations.ts`) will need explicit propagation, but the signature stays the same.

**Alternative considered:** A separate `ProjectScopeOptions` object passed alongside `StorePathOptions` — rejected because it doubles the parameter threading surface and the existing `StorePathOptions` pattern already supports extension.

### D7: `project_store` source value and the malformed-registry warning

**Decision:** Add `'project_store'` to the `OpenSpecRootSource` union. Emit a warning identifying the file when the registry file exists but cannot be parsed; the walk skips it and continues to ancestor registries, then falls back to the global registry. When no registry file is discovered, no warning is emitted — this is the normal backward-compatible path.

The `source` field in JSON output tells scripts and automation where the store came from: `'project_store'` (from a project-scoped registry) or `'store'` (from the global registry). When triggered by a `store:` pointer in config.yaml and the store is found in the global registry, the source is `'declared'` — this reports the **trigger type** (the user declared a pointer). When the same pointer resolves through a project-scoped registry, the source is `'project_store'` — the registry source takes precedence over the trigger type.

An informational `project_registry_not_found` diagnostic was considered but rejected — absence of a registry file is the normal backward-compatible path, not a diagnostic event.

**Rationale:** The `source` field is how JSON output tells consumers where a root came from. The malformed-registry message is a human-facing warning on stderr, not a structured diagnostic: it is a non-fatal fallback path, and commands complete normally in every mode.

**Alternative considered:** Reusing the existing `'store'` source for both project-scoped and global resolution — rejected because consumers cannot distinguish where a store was resolved from.

### D8: Store path validation for project-scoped registration

**Decision:** When `openspec store register --scope project` is called, the system validates that the resolved store path is within the project root. If the relative path from the project root to the store starts with `..` or is an absolute path (e.g. a cross-drive path on Windows), the system reports a `store_path_outside_project` error and does not create a registry entry.

**Rationale:** Project-scoped registry entries use relative paths (D2). A path outside the project root would produce a `..`-prefixed relative path that is not portable — it depends on the directory layout outside the project. Rejecting it at registration time prevents committing non-portable entries.

**Alternative considered:** Allowing `..`-prefixed paths silently — rejected because it defeats the portability goal of the project-scoped registry.

### D9: Walk-up scope of project-scoped registry operations

**Decision:** The discovery walk (D4) also governs the project-scoped registry operations, with `register` as the exception. All of them take `projectRoot` from `--scope project` as the *start* of the walk:
- `openspec store list --scope project` collects entries from every `.openspec-store/registry.yaml` in the chain, each annotated with the registry directory that owns it.
- `openspec store unregister <id> --scope project` removes the id from the nearest registry in the chain that contains it — the same registry that would win store resolution — and reports the registry file it edited.
- `openspec store remove <id> --scope project` behaves like unregister: it finds the nearest registry containing the id, but instead of only forgetting the binding it requires explicit confirmation (an interactive prompt showing the folder, or `--yes`), deletes the store's folder from disk, and removes the binding from the found registry, reporting the edited file.
- `openspec store doctor [id] --scope project` inspects stores from the whole chain.
- `openspec store register --scope project` is the exception: it writes the registry at the level where the command is run (`process.cwd()`). The user consciously chooses where the binding is created; this is what makes nested local bindings (for example a plugin under a monorepo) possible, and it anchors the `store_path_outside_project` validation (D8) to the chosen level.

`openspec store setup` is outside the walk scope: it has no `--scope` flag, so it always registers the created store in the global registry and never writes a project-scoped registry. To bind the store to a project instead, run `openspec store register <path> --scope project`.

**Rationale:** If reads and removal looked only at `projectRoot`, a nested directory would see an empty list even though resolution finds ancestor stores, and unregister/remove could not act on a store registered in a parent project. Symmetric walk semantics for reads and removal matches resolution; creation stays exactly where the user stands — the same split as `git init` (creates where you stand) versus the rest of git (finds the nearest repository by walking up). `remove` is the only destructive operation, so it keeps the existing mandatory confirmation; the project-scoped variant is guarded by the same confirmation scheme as the global one.

**Alternative considered:** Reads and removal at `projectRoot` only — rejected because tool output and actions diverge from resolution: list would report an empty project scope from a nested directory, and unregister/remove could not act on ancestor bindings.

## Risks / Trade-offs

- **[Stale project-scoped registry pointing at a moved directory]** → The `inspectRegisteredStore` health check already validates that a resolved store root exists and has a healthy `openspec/` shape. A stale entry produces the same `unhealthy_store_root` diagnostic as a stale global registration.
- **[Registry file committed with machine-specific paths]** → The spec recommends relative paths. If a user commits absolute paths, `path.resolve` still works — absolute paths are returned as-is. Validation only runs on `register --scope project`; hand-edited files are not validated — the user is responsible for using relative paths.
- **[Malformed registry file]** → A corrupt `.openspec-store/registry.yaml` (invalid YAML, missing `version`, unsupported version, missing `stores`) produces a warning identifying the file, and the walk continues to ancestor registries or the global registry.
- **[Two project-scoped registries in the same ancestor chain]** → Walk up searches each one for the store ID — the first where the ID is found wins. If the ID is not in any of them, resolution falls through to the global registry. This matches the behavior of Node.js `require()` searching `node_modules` up the tree.
- **[Unregister or remove from a nested directory]** → Both walk up and act on the nearest registry containing the id — the binding that would resolve from that location — and report the edited file. Acting on a parent project's registry from a subdirectory is intentional; to act on a different binding, run the command from the directory that owns it. `remove` additionally requires the same mandatory confirmation as the global variant.
- **[Performance of the discovery walk]** → The walk is bounded by filesystem depth and stops at the first registry containing the requested ID. Each level is a single `statSync` + `readFile` — microseconds. Same cost as Node.js `require()` looking up `node_modules`. No measurable impact.
