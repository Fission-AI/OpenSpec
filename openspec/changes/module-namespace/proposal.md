## Why

OpenSpec assumes one flat `openspec/` directory per repository. This breaks down for monorepos (specs span packages), multi-repo architectures (specs span services), and large projects (50+ flat capabilities become unmanageable). Today, users fake hierarchy through naming conventions (`auth-oauth`, `checkout-web`) and resort to workarounds like symlinks or custom AGENTS.md tweaks to operate across boundaries.

The deeper problem: monorepo and multi-repo are treated as different problems requiring different solutions. They aren't. Both are instances of the same problem — specs that belong to multiple bounded contexts need a namespace and a way to resolve where those contexts live. Whether a module is a sibling directory or a separate repository is a configuration detail, not an architectural distinction.

Related issues: #662, #594, #796, #581, #664, #697, #725, #435.
Prior exploration: `openspec/explorations/workspace-architecture.md` (Models A–D). This change proposes Model E, which supersedes Model D by unifying the monorepo and multi-repo patterns into a single abstraction.

## What Changes

### Phase 1: Nested Spec Paths (prerequisite)

- Spec discovery changes from shallow `readdir` to recursive `glob("**/spec.md")` across all spec-consuming code paths (list, show, validate, archive, status, delta matching)
- Capability names become relative paths: `auth/oauth`, `checkout/web`, `notifications/email` instead of flat `auth-oauth`, `checkout-web`
- Delta specs in changes mirror the nested path structure: `changes/foo/specs/auth/oauth/spec.md` targets `specs/auth/oauth/spec.md`
- Archive command's `findSpecUpdates` traverses recursively instead of shallow readdir
- The `Delta` type/schema (`change.schema.ts`) needs to store full capability paths instead of bare directory names, so delta matching works with nested structures
- Schema instruction text — the AI-facing instructions in `schemas/spec-driven/schema.yaml` — must be updated to describe nested paths so AI agents create correctly structured delta specs
- Workflow template strings embedded in TypeScript files (`archive-change.ts`, `sync-specs.ts`) that hardcode flat path examples need updating to reference nested paths
- Validation constants and user guidance messages (`src/core/validation/constants.ts`) need updating to show nested path examples
- Documentation (`docs/cli.md`, `docs/getting-started.md`, `docs/migration-guide.md`) and schema templates (`schemas/spec-driven/templates/proposal.md`) need updating with nested path references
- No depth limit enforced, but convention is 1–2 levels within a module
- A directory is either a grouping (contains subdirectories with specs) or a capability (contains `spec.md`), not both — this avoids implied inheritance
- No inheritance semantics between specs at any nesting level — nesting is purely organizational

### Phase 2: Module Namespace

- `config.yaml` gains a `module` field (this project's own module name) and a `modules` field (a registry mapping module names to locations)
- Each module resolves to a spec root: `{location}/openspec/specs/`
- Capability references use `module:capability` syntax for cross-module references, or just `capability` within the current module (backward compatible)
- Delta specs in changes use `specs/{module}/{capability}/spec.md` when targeting other modules, `specs/{capability}/spec.md` for the current module
- Proposals list capabilities with module qualification: `payments:checkout`, `auth:session`
- Tasks group by module for scoped apply
- Module locations can be local paths (relative or absolute) — both monorepo and locally-cloned multi-repo
- **BREAKING**: None. A project with no `modules` config behaves exactly as today (single implicit module, flat or nested paths).

### Phase 3: Remote Module Resolution

- Module locations can be git references: `{ git: "github.com/org/repo", ref: "main" }`
- Remote modules are read-only — delta specs targeting them represent proposals, not direct writes
- Apply phase detects writable vs read-only modules and adjusts behavior
- Shared config manifests: `registry` field in config.yaml pointing to an external module registry file
- This is the same `modules` field from Phase 2 with different values — not a new feature, just new resolution backends

## Capabilities

### New Capabilities

- `nested-spec-paths`: Recursive spec discovery, nested capability naming, and nested delta spec matching across all code paths
- `module-resolution`: Module registry in config.yaml, name-to-location resolution, qualified capability references (`module:capability`), and module-aware spec/change operations
- `remote-module-resolution`: Git-based remote module locations, read-only module detection, and shared registry manifests

### Modified Capabilities

- `openspec-conventions`: Allow nested spec paths and module-qualified capability references in the conventions spec
- `config-loading`: Add `module` and `modules` fields to project config schema and loading
- `cli-spec`: Spec list/show/validate commands support nested paths and module-qualified names
- `cli-archive`: Archive process handles nested delta spec paths and module-qualified targets
- `context-injection`: Context injection supports module-scoped context from module configs
- `instruction-loader`: Instructions reference module-qualified capabilities and load cross-module dependency context

## Impact

- **Core**: Spec discovery, delta matching, and archive merging all change from flat to recursive
- **Config schema**: New fields (`module`, `modules`) added to `ProjectConfigSchema`
- **CLI commands**: All spec-consuming commands (list, show, validate, status, archive) need to handle nested and module-qualified paths
- **Schema templates**: Instruction templates that reference `openspec/specs/` paths need to account for nesting and modules
- **Skill instructions**: Propose, apply, verify, archive skills reference spec paths — need updates for qualified references
- **Cross-platform**: All new path handling must use `path.join()`/`path.resolve()`, never hardcoded separators
- **Backward compatibility**: Fully preserved. No `modules` config = single implicit module with flat-or-nested paths. Existing projects work without changes.

### Detailed Affected Files

**Spec discovery and listing**
- `src/utils/item-discovery.ts` — the PRIMARY spec discovery utility (`getSpecIds()`) used by every command. Uses shallow `readdir`, returns bare directory names. Must switch to recursive glob.
- `src/core/list.ts` and `src/core/view.ts` — both do shallow `readdir` for spec listing. `view.ts` has hardcoded 30-char padding for display that will need adjustment for longer nested path IDs.

**Change parsing and delta types**
- `src/core/parsers/change-parser.ts` — `parseDeltaSpecs()` uses shallow `readdir` and the `Delta` type stores only `dir.name`, losing nested path info. The Delta schema needs full capability paths.
- `src/core/validation/validator.ts` — `validateChangeDeltaSpecs()` uses shallow `readdir` at the spec level.

**CLI commands consuming flat spec IDs**
- `src/commands/show.ts` — uses flat spec IDs from item-discovery.
- `src/commands/validate.ts` — uses flat spec IDs from item-discovery.
- `src/commands/completion.ts` — outputs flat IDs for shell tab completion; must emit nested path IDs.

**Workflow utilities and path construction**
- `src/commands/workflow/shared.ts` — workflow utilities with path construction that assume flat structure.
- `src/core/templates/workflows/archive-change.ts` and `sync-specs.ts` — contain embedded AI instruction strings with hardcoded flat paths (e.g., `"openspec/specs/<capability>/spec.md"`). These guide AI behavior during archive and sync workflows; if not updated, AI agents will use flat paths regardless of tooling support.

**Schemas and AI-facing instructions**
- `schemas/spec-driven/schema.yaml` — the schema instructions that tell AI agents how to create proposals and specs reference flat paths only. If not updated, AI agents will create flat-only delta specs regardless of tooling support.
- `schemas/spec-driven/templates/proposal.md` — template comments reference flat structure.

**Validation constants and user guidance**
- `src/core/validation/constants.ts` — user-facing guidance messages show flat-only examples.

**Path extraction pattern**
- The `path.basename(path.dirname())` pattern is used ~8 times across `specs-apply.ts` and `archive.ts` to extract capability names — breaks with nested paths because it returns only the leaf directory.

**Documentation**
- `docs/cli.md`, `docs/getting-started.md`, `docs/migration-guide.md` — all reference flat structure and need updates for nested path examples.

**Tests**
- Every test file creates flat spec structures via fixtures and needs parallel nested-path test cases to verify recursive discovery, delta matching, and archive merging work at depth.
