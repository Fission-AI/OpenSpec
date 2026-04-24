## 1. Phase 1: Nested Spec Paths

### Core discovery

- [ ] 1.1 Create `src/core/spec-discovery.ts` module with a `discoverSpecs(specRoot: string)` function that recursively globs for `**/spec.md` under a spec root and returns an array of `{ capabilityName: string, filePath: string }` where capabilityName is the forward-slash-separated relative path from the spec root to the parent directory of `spec.md`
- [ ] 1.2 Add cross-platform path normalization: filesystem operations use `path.join()`/`path.resolve()`, but capability names always use forward slashes regardless of platform
- [ ] 1.3 Add structural validation: detect directories that have both `spec.md` AND subdirectories containing `spec.md` files, and return them as warnings
- [ ] 1.3a Create `getCapabilityName(specRoot: string, specFilePath: string): string` utility in `src/core/spec-discovery.ts` that computes the relative path from spec root to spec file's parent directory, using forward slashes regardless of platform
- [ ] 1.3b Replace all 5 uses of `path.basename(path.dirname())` in `src/core/specs-apply.ts` (lines 110, 196, 352, 426, 443) with `getCapabilityName()`
- [ ] 1.3c Replace all 2 uses of `path.basename(path.dirname())` in `src/core/archive.ts` (lines 207, 240) with `getCapabilityName()`

### Integrate recursive discovery into existing commands

- [ ] 1.4 Update `spec list` command to use `discoverSpecs()` instead of shallow `readdir`, displaying nested capability paths (e.g., `auth/oauth`)
- [ ] 1.4a Update `getSpecIds()` in `src/utils/item-discovery.ts` (lines 25-44) to use recursive glob instead of shallow readdir, returning full nested capability paths
- [ ] 1.4b Update `src/core/list.ts` spec listing (line 163) to use recursive discovery
- [ ] 1.4c Update `src/core/view.ts` spec display (line 140) to use recursive discovery AND replace hardcoded 30-char padding (line 72) with dynamic padding
- [ ] 1.4d Update `src/commands/show.ts` interactive spec selection to show nested paths
- [ ] 1.4e Update `src/commands/validate.ts` path construction at lines 142, 209 to handle nested capability paths
- [ ] 1.4f Update `src/commands/completion.ts` (lines 268-287) to output nested capability paths for shell tab completion
- [ ] 1.5 Update `spec show` command to accept nested capability paths as arguments (e.g., `openspec spec show auth/oauth`) and resolve them to the correct `spec.md` file
- [ ] 1.6 Update `spec validate` command to accept nested capability paths and validate specs at any depth
- [ ] 1.7 Update interactive spec selection (show and validate) to display nested paths in the selection list

### Archive support for nested paths

- [ ] 1.8 Update `findSpecUpdates` in archive command to recursively discover delta specs under `changes/{name}/specs/` instead of shallow readdir
- [ ] 1.8a Update `validateChangeDeltaSpecs()` in `src/core/validation/validator.ts` (line 122) to recursively discover delta specs instead of shallow readdir
- [ ] 1.8b Update `parseDeltaSpecs()` in `src/core/parsers/change-parser.ts` (lines 55-82) to recursively discover delta specs and store full capability paths in the Delta.spec field
- [ ] 1.8c Update the Delta type/schema in `src/core/schemas/change.schema.ts` if it constrains the spec field format
- [ ] 1.9 Update delta spec path matching to use full relative paths: `changes/{name}/specs/auth/oauth/spec.md` targets `specs/auth/oauth/spec.md`
- [ ] 1.10 Update archive confirmation display to show full nested paths
- [ ] 1.11 Ensure archive creates intermediate directories when applying deltas that create new nested capabilities

### Status and instructions

- [ ] 1.12 Update `openspec status` to detect delta specs at any depth within a change's `specs/` directory
- [ ] 1.13 Update instruction loader's spec discovery to use recursive glob when loading dependency context
- [ ] 1.13a Update `schemas/spec-driven/schema.yaml` proposal instruction (lines 16-17) to show nested capability path examples alongside flat ones
- [ ] 1.13b Update `schemas/spec-driven/schema.yaml` specs instruction (lines 38-39) to reference nested paths
- [ ] 1.13c Update `schemas/spec-driven/templates/proposal.md` comments (lines 12, 16-18) to show nested path examples
- [ ] 1.13d Update `src/core/templates/workflows/archive-change.ts` AI instructions (lines 59, 174) to use `openspec/specs/{capability-path}/spec.md` pattern
- [ ] 1.13e Update `src/core/templates/workflows/sync-specs.ts` AI instructions (lines 47, 70, 186, 209) to use nested path patterns
- [ ] 1.13f Update `src/core/validation/constants.ts` GUIDE_NO_DELTAS message (line 41) to show nested path examples
- [ ] 1.13g Update `src/commands/change.ts` next-steps message (line 286) and `src/commands/validate.ts` guidance (line 172) to mention nested paths

### Display formatting

- [ ] 1.14 Fix `src/core/view.ts` hardcoded 30-char padding (line 72) — replace with dynamic padding based on longest capability name
- [ ] 1.15 Update all hardcoded output messages in `src/core/specs-apply.ts` (lines 353, 452, 459) that interpolate `specName` from `path.basename(path.dirname())` — these must use `getCapabilityName()`

### Documentation

- [ ] 1.16 Update `docs/cli.md` references to flat spec merging
- [ ] 1.17 Update `docs/getting-started.md` example output to show both flat and nested specs
- [ ] 1.18 Update `docs/migration-guide.md` spec structure references

### Tests

- [ ] 1.19 Unit tests for `discoverSpecs()`: flat structure, nested structure, mixed, empty, cross-platform path output
- [ ] 1.20 Unit tests for `getCapabilityName()`: nested paths, flat paths, Windows paths, path-not-under-root error
- [ ] 1.21 Unit tests for structural validation warnings (both grouping and capability)
- [ ] 1.22 Unit tests for updated `parseDeltaSpecs()` with nested delta specs
- [ ] 1.23 Integration tests for `spec list` with nested specs
- [ ] 1.24 Integration tests for `spec show` and `spec validate` with nested capability paths
- [ ] 1.25 Integration tests for archive with nested delta spec paths including new capability creation
- [ ] 1.26 Windows-specific path tests: ensure capability names use forward slashes, filesystem ops use `path.join()`
- [ ] 1.27 Update `test/specs/source-specs-normalization.test.ts` (line 20) to handle nested spec discovery
- [ ] 1.28 Add nested spec fixtures to existing test files: `test/commands/spec.test.ts`, `test/commands/show.test.ts`, `test/commands/validate.test.ts`
- [ ] 1.29 Add nested delta spec fixtures to `test/core/archive.test.ts`

## 2. Phase 2: Module Namespace

### Config schema

- [ ] 2.1 Add `module`, `modules`, and `registry` fields to the Zod `ProjectConfigSchema` with the types defined in the design doc (string for module, record of string-or-object for modules, string-or-object for registry)
- [ ] 2.2 Add field-by-field resilient parsing for the new fields in `loadProjectConfig()`, matching the existing pattern (log warnings for invalid entries, include valid ones)
- [ ] 2.3 Add module name validation: kebab-case regex `/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`

### Module resolution

- [ ] 2.4 Create `src/core/module-resolver.ts` with a `resolveModules(projectRoot: string, config: ProjectConfig)` function that takes the config and returns a `Map<string, ResolvedModule>` where each entry has `{ name, specRoot, writable: boolean }`
- [ ] 2.5 Implement local path resolution: resolve relative/absolute paths to `{location}/openspec/specs/`, validate the directory exists, mark as writable
- [ ] 2.6 Add collision detection: warn if a module name matches a top-level directory under the current module's `specs/` root
- [ ] 2.7 Integrate module resolution into the config loading pipeline so it's available to all downstream consumers

### Qualified capability references

- [ ] 2.8 Create a `parseCapabilityRef(ref: string, moduleRegistry: Map)` function that splits on the first colon, checks the prefix against the registry, and returns `{ module: string | null, capability: string }`
- [ ] 2.9 Integrate `parseCapabilityRef` into `spec show`, `spec validate`, and any other commands that accept a capability identifier as argument

### Module-aware spec listing

- [ ] 2.10 Update `spec list` to aggregate specs from all resolved modules when in multi-module mode
- [ ] 2.11 Add `--module <name>` filter flag to `spec list`
- [ ] 2.12 Display module-qualified names (e.g., `payments:checkout`) in multi-module mode, plain names in single-module mode

### Module-aware delta spec resolution

- [ ] 2.13 Update delta spec discovery in archive to check if the first path segment under `specs/` matches a registered module name, and route to the correct spec root
- [ ] 2.14 Update archive confirmation display to show module-qualified paths for cross-module deltas
- [ ] 2.15 Skip delta application for read-only modules during archive, log message with skipped specs

### Module-aware instructions and context

- [ ] 2.16 Update instruction loader to include module registry information in instruction metadata
- [ ] 2.17 Update context injection to read and inject module-level context from module configs, wrapped in `<module-context module="name">` tags
- [ ] 2.18 Update proposal/specs skill instructions to reference module-qualified capabilities

### Tests

- [ ] 2.19 Unit tests for module resolution: relative paths, absolute paths, missing locations, invalid module names
- [ ] 2.20 Unit tests for `parseCapabilityRef`: with module prefix, without, nested capability, unknown module
- [ ] 2.21 Unit tests for collision detection between module names and local capability directories
- [ ] 2.22 Integration tests for `spec list` in multi-module mode with `--module` filter
- [ ] 2.23 Integration tests for `spec show payments:checkout` cross-module resolution
- [ ] 2.24 Integration tests for archive with module-qualified delta specs (writable and read-only modules)
- [ ] 2.25 Integration tests for context injection with module-scoped context

## 3. Phase 3: Remote Module Resolution

### Git-based resolution

- [ ] 3.1 Extend `module-resolver.ts` to handle git-based module locations (`{ git, ref, path }`)
- [ ] 3.2 Implement git sparse checkout or archive fetch to retrieve only the `openspec/specs/` subtree from remote repos
- [ ] 3.3 Cache fetched remote specs in `.openspec/cache/{module-name}/` directory
- [ ] 3.4 Add `.openspec/cache/` to the default `.gitignore` template generated by `openspec init`

### Cache management

- [ ] 3.5 Implement per-invocation fetch: check if cache exists for current invocation, fetch if not
- [ ] 3.6 Add `--refresh-modules` global flag to force re-fetch of all remote module caches
- [ ] 3.7 Handle network failures gracefully: use stale cache if available with warning including cache age, error if no cache

### Shared registry manifest

- [ ] 3.8 Implement registry loading: read module definitions from a local or remote YAML file
- [ ] 3.9 Implement registry merging: inline `modules` definitions override registry entries with the same name
- [ ] 3.10 Add config schema validation for the `registry` field (string or git-reference object)

### Tests

- [ ] 3.11 Unit tests for git module resolution with mocked git operations
- [ ] 3.12 Unit tests for cache hit/miss/stale scenarios
- [ ] 3.13 Unit tests for registry loading and merging with inline overrides
- [ ] 3.14 Integration tests for end-to-end remote module resolution (requires test fixtures or mocked git repos)
