## Context

OpenSpec currently assumes a flat, single-root structure: one `openspec/` directory per repo with capabilities as direct children of `specs/`. This works for small-to-medium projects but breaks down for:

- **Large projects** (50+ capabilities become unmanageable flat lists)
- **Monorepos** (specs should be scoped to packages/services)
- **Multi-repo architectures** (changes span repositories)

The exploration doc (`openspec/explorations/workspace-architecture.md`) evaluated four models (A–D). This design proposes **Model E**: a module namespace with pluggable resolution that makes monorepo and multi-repo indistinguishable at the modeling layer.

### Current Architecture

Spec discovery: shallow `readdir("openspec/specs/")` returning direct child directory names.
Delta matching: direct name equality between `changes/{name}/specs/{cap}/` and `specs/{cap}/`.
Config schema: `{ schema?: string, context?: string, rules?: Record<string, string[]> }`.

Key files:
- `src/core/config.ts` — config loading, `OPENSPEC_DIR_NAME` constant
- `src/core/specs-apply.ts` — delta merging logic
- `src/commands/spec.ts` — spec list/show/validate CLI
- `src/commands/archive.ts` — archive with spec update process
- `src/core/instruction-loader.ts` — instruction generation
- `src/core/context-injection.ts` — context/rules injection
- `src/utils/item-discovery.ts` — `getSpecIds()` is the central spec discovery function; every command that lists specs calls it. Uses shallow `readdir`.
- `src/core/parsers/change-parser.ts` — `parseDeltaSpecs()` parses change delta specs via shallow `readdir`. The `Delta` type stores `spec: dir.name` (bare name only).
- `src/core/validation/validator.ts` — `validateChangeDeltaSpecs()` validates deltas against known specs. Also shallow `readdir`.
- `src/core/list.ts`, `src/core/view.ts` — listing and display logic, both shallow `readdir`. `view.ts` has hardcoded 30-char name padding that will truncate or misalign long nested paths.
- `src/core/templates/workflows/archive-change.ts`, `sync-specs.ts` — embedded AI instruction strings with flat path references (e.g., `specs/<capability>/spec.md`).
- `schemas/spec-driven/schema.yaml` — AI-facing instructions that guide proposal/spec creation; these assume flat paths throughout.

### Related Issues

#662 (hierarchical specs), #594 (nested specs), #796 (nested archive), #581/#664/#697 (configurable paths), #725 (multi-repo), #435 (collaboration)

## Goals / Non-Goals

**Goals:**
- Support nested spec directory hierarchies at any depth
- Introduce named modules as a namespace abstraction for spec boundaries
- Unify monorepo and multi-repo under a single pattern (module registry)
- Maintain full backward compatibility with existing single-module flat projects
- Support read-only remote modules for multi-repo coordination
- Cross-platform path handling (Windows, macOS, Linux)

**Non-Goals:**
- Spec inheritance or extension semantics between nested specs
- Distributed change coordination (atomic cross-repo commits)
- Module-level access control or permissions
- Auto-discovery of modules from filesystem structure (must be explicit in config)
- Schema-per-module (all modules in a project share the project's schema)
- Workspace UI or dashboard for cross-module visualization

## Decisions

### Decision 1: Recursive glob for spec discovery (replaces shallow readdir)

All code paths that discover specs (`spec list`, `spec show`, `spec validate`, `archive`, `status`, `instructions`) switch from `readdir` to `glob("**/spec.md")` relative to the spec root.

**Capability name derivation:** Given a spec root and a discovered `spec.md` path, the capability name is the relative path from root to the directory containing `spec.md`, using forward slashes regardless of platform.

```
specRoot: openspec/specs/
discovered: openspec/specs/auth/oauth/spec.md
capability: auth/oauth
```

**Why glob over manual recursion:** Node.js `glob` (via the `glob` package already in dependencies or `fs.glob` in Node 22+) handles cross-platform path normalization, symlink handling, and is well-tested. Manual `readdir` + recursion would duplicate this.

**Alternative considered:** Keep flat discovery, use naming conventions (`auth-oauth`). Rejected because users are already working around this (#594, #662) and it doesn't scale.

### Decision 2: Module is a named spec namespace, resolved via config

A module is a name that maps to a spec root. The mapping lives in `config.yaml`:

```yaml
module: gateway          # This project's module name
modules:
  payments: ./packages/payments       # Relative path
  users: ../users-service             # Sibling repo
  contracts:                          # Remote
    git: github.com/org/api-contracts
    ref: v2.1.0
```

Resolution: `{module_location}/openspec/specs/` is the spec root for that module.

**Why config over auto-discovery:** Explicit is better than implicit. Auto-discovering modules from `packages/*/openspec/` would be fragile (what if a package has openspec but isn't a module you want?). The config is the source of truth.

**Alternative considered:** Workspace manifest (Model D from exploration doc). Rejected because it creates a separate coordination layer. The module registry in config.yaml serves the same purpose without a new file format.

### Decision 3: Module:capability reference syntax

Cross-module references use `module:capability` where colon is the separator. Split on the first colon only.

```
payments:checkout         → module=payments, capability=checkout
payments:checkout/web     → module=payments, capability=checkout/web
checkout                  → module=<self>, capability=checkout
auth/oauth                → module=<self>, capability=auth/oauth
```

**Why colon:** It's a common namespace separator (Docker images, Kubernetes resources, package managers). Forward slash is already used for nested paths within a capability, so using it for modules too would create ambiguity. The colon cleanly separates the two dimensions.

**Alternative considered:** Forward slash (`payments/checkout`) — rejected because it's ambiguous with nested paths. Dot (`payments.checkout`) — rejected because dots have other meanings in config files.

### Decision 4: Delta spec path convention for multi-module changes

In a change's `specs/` directory, the first path segment is checked against the module registry. If it matches a module name, it's a module prefix. Otherwise, it's a nested capability path.

```
changes/foo/specs/
├── payments/              # "payments" is a registered module
│   └── checkout/spec.md   # Target: payments:checkout
├── auth/                  # "auth" is a registered module
│   └── session/spec.md    # Target: auth:session
└── routing/spec.md        # "routing" is NOT a module → self:routing
```

Resolution algorithm:
1. Get the first path segment under `specs/`
2. Check if it's a registered module name
3. If yes: module = first segment, capability = remaining path
4. If no: module = self, capability = full path (including first segment)

**Why name-based disambiguation:** It's simple, deterministic, and doesn't require any special syntax or marker files. The one edge case — a module name that collides with a local capability name — is detectable at config load time and should be flagged as a warning.

**Alternative considered:** Explicit marker (e.g., `@payments/checkout/` with prefix). Rejected because it's more syntax to learn and the filesystem doesn't support `@` in directory names on all platforms.

### Decision 5: Remote modules are read-only, cached locally

Remote (git-based) modules are fetched and cached in `.openspec/cache/{module}/`. They are read-only — the apply/archive phases skip delta application for remote modules and log a message.

Cache strategy: fetch once per CLI invocation, with `--refresh-modules` to force re-fetch. If network is unavailable and cache exists, use stale cache with warning.

**Why read-only:** Writing to a remote repo requires authentication, conflict resolution, and coordination that's out of scope. The delta spec in the change serves as the "proposal" — the module owner applies it in their repo.

**Alternative considered:** Auto-create PRs for remote module changes. Deferred as a future enhancement — requires GitHub/GitLab integration that's beyond the core module abstraction.

### Decision 6: No enforced depth limit, warn on both-grouping-and-capability

Nesting depth is unlimited but conventional guidance is 1-2 levels within a module. The tool does not reject deep structures.

If a directory has both a `spec.md` AND subdirectories containing specs, `openspec validate` flags a structural warning. The specs still work — it's a lint, not a hard error.

**Why warn instead of error:** Some users may intentionally use this pattern (a "contract" spec with "implementation" specs nested under it). Erroring would block them. Warning lets them make an informed choice.

### Decision 7: Backward compatibility via absence of config

If `config.yaml` has no `module` or `modules` fields, the system operates exactly as today:
- Spec discovery is from `openspec/specs/` (now recursive instead of flat, which is additive)
- No module prefixes in output
- No module resolution logic invoked
- Delta specs match by full path (no module disambiguation)

The ONLY behavioral change for existing users is that recursive spec discovery finds specs they might have in nested directories that were previously invisible. This is strictly additive.

### Decision 8: Config schema additions (Zod)

Extend `ProjectConfigSchema` with three new optional fields:

```typescript
const ModuleLocationSchema = z.union([
  z.string(),                    // Simple path
  z.object({                     // Git reference
    git: z.string(),
    ref: z.string().optional(),
    path: z.string().optional(),
  }),
]);

// Added to ProjectConfigSchema:
module: z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/).optional(),
modules: z.record(
  z.string().regex(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/),
  ModuleLocationSchema,
).optional(),
registry: z.union([z.string(), z.object({
  git: z.string(),
  ref: z.string().optional(),
  path: z.string().optional(),
})]).optional(),
```

Parsed with the same field-by-field resilience as existing config fields.

### Decision 9: Capability name extraction refactor

The codebase uses `path.basename(path.dirname(filePath))` 8 times to extract capability names from full paths. This pattern returns only the leaf directory name, which breaks for nested paths. For `specs/auth/oauth/spec.md`, it returns `oauth` instead of `auth/oauth`.

**Fix:** Create a utility function `getCapabilityName(specRoot: string, specFilePath: string): string` that computes the relative path from the spec root to the spec file's parent directory, always using forward slashes regardless of platform.

```typescript
function getCapabilityName(specRoot: string, specFilePath: string): string {
  const dir = path.dirname(specFilePath);
  return path.relative(specRoot, dir).split(path.sep).join("/");
}
```

All 8 call sites must switch to this utility:
- `src/core/specs-apply.ts` — lines 110, 196, 352, 426, 443
- `src/commands/archive.ts` — lines 207, 240

**Why a shared utility:** Centralizing this logic prevents future drift if the derivation rule changes (e.g., module prefixing in Phase 2). It also makes the broken-today pattern easy to find via a single import.

### Decision 10: Delta type schema update

The `Delta` type in `change-parser.ts` stores `spec: string` where the value is `dir.name` (bare directory name). For nested paths, this must store the full relative capability path (e.g., `auth/oauth` not just `oauth`).

Affected locations:
- `src/core/schemas/change.schema.ts` — the Zod schema for `Delta`. The `spec` field's type stays `z.string()` but its semantic meaning changes from "leaf directory name" to "relative capability path."
- `src/core/parsers/change-parser.ts` — `parseDeltaSpecs()` must switch from `dir.name` to a recursive glob and derive capability paths relative to the change's `specs/` root.
- All consumers of `Delta` objects — validation (`validator.ts`), display (`list.ts`, `view.ts`), and archive (`archive.ts`) — must be audited for assumptions about `spec` being a single path segment.

**Why full path in Delta:** Delta matching compares `delta.spec` against discovered capability names. If capability names become multi-segment paths (`auth/oauth`), deltas must store the same representation or matching breaks silently.

### Decision 11: AI instruction text updates

The `schema.yaml` file and workflow templates contain instruction text that guides AI agents during the proposal, specs, and archive phases. These instructions hardcode flat path examples like `specs/<capability>/spec.md`. If not updated, AI agents will continue creating flat-only structures regardless of tooling support.

Affected instruction text:
- `schemas/spec-driven/schema.yaml` — proposal instruction (lines 16-17), specs instruction (lines 38-39)
- `schemas/spec-driven/templates/proposal.md` — template comments referencing flat paths
- `src/core/templates/workflows/archive-change.ts` — archive workflow instructions (lines 59, 174)
- `src/core/templates/workflows/sync-specs.ts` — sync workflow instructions (lines 47, 70, 186, 209)
- `src/core/validation/constants.ts` — guidance messages shown to users and agents

**Required changes:** All path examples must be updated to show that nesting is supported (e.g., `specs/<capability>/spec.md` becomes `specs/<capability-path>/spec.md` with an explicit note that `<capability-path>` can contain `/` for nesting). Instructions should neither mandate nor discourage nesting — they should present it as a natural option.

**Why this is Phase 1 blocking:** If tooling supports nesting but instruction text doesn't mention it, AI agents (which are the primary authors of specs and proposals) will never produce nested structures. The instruction text is the AI's "API docs" — it must stay in sync with the tool's capabilities.

## Risks / Trade-offs

**[Module name collision with capability name]** → If a user has a module named `auth` and also a local capability directory named `auth/`, the delta spec disambiguation is ambiguous. Mitigation: detect at config load time and emit a warning suggesting the user rename one.

**[Recursive glob performance on large repos]** → Switching from `readdir` to recursive glob could be slower on repos with thousands of directories. Mitigation: glob is inherently lazy/streamed; we can add a `maxDepth` option to glob if performance is an issue, but this is unlikely to matter in practice (spec directories are small).

**[Remote module staleness]** → Cached remote specs may drift from the actual repo state. Mitigation: per-invocation fetch by default, stale cache only on network failure, `--refresh-modules` flag for explicit refresh.

**[Cross-platform path normalization]** → Module paths in config use forward slashes (YAML), but filesystem operations need platform separators. Mitigation: all path operations go through `path.resolve()`/`path.join()`, and capability names always use forward slashes regardless of platform.

**[Complexity budget]** → This is a large change. Mitigation: phased implementation (nested paths → modules → remote) allows each phase to ship and stabilize independently. Phase 1 alone resolves #662, #594, #796 which are the most-requested features.

**[AI instruction drift]** → If schema instructions aren't updated alongside tooling, AI agents will generate flat-only specs creating a confusing mismatch where the tool supports nesting but the AI never uses it. Mitigation: Phase 1 tasks must include instruction text updates (Decision 11) as a blocking item, not a follow-up.

**[Display formatting]** → `view.ts` has hardcoded 30-char padding for capability names. Nested paths like `platform/infrastructure/networking` will exceed this, causing misaligned or truncated output. Mitigation: switch to dynamic padding that measures the longest capability name in the current result set.

## Migration Plan

**Phase 1 (nested spec paths):** No migration needed. Existing flat specs continue to work. Users who want nesting create subdirectories manually. The only change in behavior is that recursive discovery finds previously-invisible nested specs.

**Phase 2 (modules):** Users add `module` and `modules` to their `config.yaml` when ready. No existing file moves required. The module registry is purely additive config.

**Phase 3 (remote modules):** Users add git-based module locations when ready. Requires network access for first fetch. Cache directory (`.openspec/cache/`) should be gitignored.

Each phase is independently shippable and independently useful.

## Open Questions

1. **Should `openspec init` offer a module-aware setup flow?** E.g., `openspec init --module payments` to initialize a module-scoped project. Or is this a follow-up?

2. **How should skills (propose, apply, verify, archive) reference modules?** The skill instructions currently hardcode `openspec/specs/` paths. They need to either use the CLI commands (which handle resolution) or receive module info from the instruction loader.

3. **Should `openspec status` show cross-module change scope?** E.g., "This change affects modules: payments, auth, gateway." Useful but not strictly necessary for Phase 1-2.

4. **Module-level validation:** Should `openspec validate` check that all modules in config are resolvable? Probably yes, as a warning.
