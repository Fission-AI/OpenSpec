## Context

OpenSpec is a lightweight orchestrator: a small CLI plus a schema-driven artifact-graph engine. As adoption grows, the community wants to extend it (#453, #436, #1081, #650, #1074, #1231, #667, #780) and wants capabilities that are too heavy or too specialized to belong in core — most prominently generating specs from existing code (#724, discussion #634 / OpenLore).

Today OpenSpec has exactly one dynamic extension mechanism: schema resolution in `src/core/artifact-graph/resolver.ts`, which resolves a named schema through `project (openspec/schemas) → user (XDG data dir) → package (built-in)`. Everything else is static:

- Commands are imported and registered explicitly in `src/cli/index.ts`.
- Skill/command templates are hardcoded arrays in `src/core/shared/skill-generation.ts` (`getSkillTemplates`, `getCommandTemplates`) keyed by a fixed `ALL_WORKFLOWS` list in `src/core/profiles.ts`.
- Global config is a zod schema (`src/core/config-schema.ts`) that already uses `.passthrough()` for forward compatibility and already carries `profile`, `delivery`, `workflows`, and `featureFlags`.

Two config layers matter here and behave differently:

- **Global config** (`GlobalConfigSchema`, `src/core/config-schema.ts`) is `.passthrough()` and holds user-level settings (`profile`, `delivery`, `workflows`, `featureFlags`).
- **Project config** (`ProjectConfigSchema`, `src/core/project-config.ts`) is a plain `z.object({ schema, context, rules })` — **not** passthrough — loaded with resilient field-by-field parsing that ignores unknown keys.

The reference plugin, OpenLore, is a separate npm package (`openlore`) with its own Commander CLI (~40 subcommands) and heavy optional dependencies (tree-sitter grammars, lancedb). It already declares `@fission-ai/openspec` as an **optional** peer dependency and already writes an `openlore` metadata block into the project `openspec/config.yaml`. That block survives today not because the project schema preserves it (it does not), but because OpenSpec's resilient loader ignores unknown keys and OpenSpec does not rewrite `config.yaml` destructively. This is a constraint on the plugin design: when OpenSpec writes a `plugins` block, it must preserve the `openlore` block and any other unknown keys. OpenLore requires Node ≥22.5; OpenSpec requires Node ≥20.19.

## Goals / Non-Goals

**Goals**

- Let OpenSpec discover, surface, and invoke optional external "engines" without absorbing their code or dependencies.
- Keep the core pure: the plugin layer adds no required runtime dependency and does not raise OpenSpec's Node floor.
- Reuse existing patterns (schema-style tiered resolution, passthrough config, managed-file tracking by explicit name) rather than inventing new ones.
- Make discovery and lifecycle observable and reversible: list, enable, disable, clean up.
- Ship OpenLore as the first registry listing and prove the contract with an integration fixture.

**Non-Goals**

- In-process command injection (loading plugin modules into OpenSpec's process). Deferred; see Decision 1.
- Runtime lifecycle hooks (e.g. archive hooks, #682). Out of scope; future capability.
- A hosted registry service or auth. The first registry is a curated, versioned JSON document shipped with the package.
- Schema inheritance / partial schema overrides (#1074). Related but separate; this change does not modify schema resolution.
- Sandboxing plugin execution. Plugins are npm packages the user installs; trust model is documented, not enforced (see Decision 8).
- Injecting plugin command references into the generated `AGENTS.md` / OpenSpec instruction block. Deferred: in v1 plugins reach AI agents through contributed skills (Decision 2), not the managed instruction block. Surfacing namespaces there is a candidate follow-up.

## Decisions

### 1. Delegation (subprocess) over in-process module loading

A plugin command (`openspec lore generate …`) is executed by spawning the plugin's own executable as a child process, with `stdio: 'inherit'` and the child's exit code propagated. OpenSpec never `import()`s plugin code for command execution.

**Why:**
- **Dependency isolation.** OpenLore pulls tree-sitter grammars and lancedb; in-process loading would drag these into OpenSpec's resolution graph and startup cost.
- **Node version skew.** OpenLore requires Node ≥22.5, OpenSpec ≥20.19. A subprocess runs under whatever Node resolves the plugin bin; in-process loading would force OpenSpec's floor up.
- **Blast radius.** A crashing or hanging plugin cannot take down the OpenSpec process; it is an exit code, not an unhandled exception.
- **Matches the stated vision.** Discussion #634 explicitly frames OpenSpec as a "lightweight orchestrator" calling specialized engines "only when needed."

**Trade-off:** delegation cannot share in-memory state or rich return values with the plugin. That is acceptable: integration is via the filesystem (the plugin writes `openspec/specs/…` and `openspec/config.yaml`), which is already how OpenLore integrates. A future in-process capability can be added behind the same manifest without breaking this one.

### 2. Static template contribution is the one in-process path

The single exception to Decision 1: a plugin may contribute **skill/command templates** (static files + small metadata) that `openspec init`/`update` install into AI tool directories. This is data, not executable plugin logic — OpenSpec reads declared template files from the resolved plugin package and writes them, exactly as it does for its own templates. No plugin code runs. This is what makes "install a curated skill pack" (#1231) work uniformly across all 30+ tools in `AI_TOOLS` instead of each plugin shipping its own installer.

### 3. Manifest: declarative, co-located, versioned

A plugin declares itself via an `"openspec"` key in its `package.json`, or a sibling `openspec.plugin.json` (checked in that order). Fields: `manifestVersion`, `id`, `namespace`, `bin` (or `binArgs` for `npx`-style invocation), `openspecCompat` (semver range), `displayName`, `summary`, `commands[]` (name + summary, for help/completion only), `skills[]`, `commands` templates, `workflows[]`, and `ownsConfigKeys[]`. The manifest is validated with zod; unknown fields are preserved (passthrough) for forward compatibility, mirroring the global config approach.

**Why an `"openspec"` package.json key as the primary form:** zero extra files for the common npm case, trivially discoverable by scanning `node_modules/*/package.json`. The standalone `openspec.plugin.json` form supports non-npm or monorepo distribution.

### 4. Resolution: mirror the schema resolver precedence

`src/core/plugins/resolver.ts` resolves enabled plugins in this order, returning the first manifest found per id and recording its source tier:

1. **Project** — ids listed in `openspec/config.yaml` `plugins.enabled`, resolved from the project's `node_modules`.
2. **User/global** — `${XDG_DATA_HOME}/openspec/plugins/` (manifests or symlinks for globally installed engines).
3. **Auto-detect** — scan project `node_modules` for packages carrying an `openspec` manifest key (gated by `plugins.autoDetect`, default on).

This is intentionally the same precedence story as `getSchemaDir` so contributors reason about both the same way. Resolution reads manifests only and is cheap enough to run on every CLI invocation; results are memoized per process.

**Config placement.** Enablement that should travel with the repo lives in the **project** `openspec/config.yaml` `plugins.enabled` (committed, team-shared) — this is what drives project-tier resolution and is where `plugin add` writes by default. **Global config** holds only user-level preferences: the `autoDetect` default, registry settings, and any user/global-tier plugins. Because `ProjectConfigSchema` is not passthrough, the writer that adds `plugins.enabled` must round-trip the file non-destructively, preserving `schema`/`context`/`rules` and any unknown third-party keys (e.g. `openlore`).

### 5. Namespacing over flat command injection

Each plugin gets exactly one reserved top-level namespace (`namespace` in the manifest, e.g. `lore`). All plugin subcommands live under it (`openspec lore <subcommand>`). OpenSpec never lets a plugin register a bare top-level verb.

**Why:** collision safety as the marketplace grows, obvious provenance in `--help`, and clean telemetry (`getCommandPath` in `src/cli/index.ts` already produces `lore:generate`-style paths). Namespace collisions between two enabled plugins, or with a reserved core verb, are a hard error reported by `plugin add`/resolution.

### 6. Compatibility gating

Each manifest declares `openspecCompat` (a semver range). At resolution time OpenSpec compares it against its own version. Incompatible plugins are **not** registered as commands; they appear in `openspec plugin list` flagged `incompatible` with the required range, so the failure is legible instead of a confusing runtime error. `plugin add` refuses to enable an incompatible plugin unless `--force` is passed.

### 7. Managed-file tracking by explicit name

Plugin-contributed skills/commands are tracked by explicit, plugin-namespaced names (never glob/pattern matching), consistent with the project rule "if we generate it, we track it by name in a constant." Disabling or removing a plugin removes only those named, plugin-owned artifacts and leaves user files untouched. This composes with the in-flight `simplify-skill-installation` and `unify-template-generation-pipeline` changes; the contribution layer plugs into the unified pipeline rather than duplicating write logic.

### 8. Trust model: documented, not sandboxed

Plugins are ordinary npm packages the user chose to install; delegation runs their bin with the user's privileges. This is the same trust surface as any devDependency or `npx` invocation, and OpenSpec does not sandbox it. The registry is **curated** (PR-reviewed entries), and `plugin add` of a non-registry/unknown plugin prints a one-time trust notice. This is stated plainly in docs rather than implied to be safe.

### 9. Cross-platform behavior

- Bin resolution and spawning use `node:child_process` with `shell: false` and an explicit executable path resolved from the package, so Windows `.cmd` shims and spaces-in-paths are handled without shell injection.
- All plugin/registry/skill paths are built with `path.join`/`path.resolve`; tests assert path behavior with `path.join`, not hardcoded separators.
- The user-tier plugins directory uses the same XDG/`getGlobalDataDir()` resolution as user schemas, so Windows uses the platform data dir.

### 10. Registry: curated JSON now, service later

`schemas/plugins/registry.json` (versioned, shipped with the package) holds the curated listings. `plugin search`/`info` read it; a future change can add a remote refresh URL and signing without changing the command surface. OpenLore is the inaugural entry. The registry document has its own `registryVersion` so the loader can reject formats it does not understand.

## Risks / Trade-offs

- **Subprocess can't share state.** Mitigated: integration is filesystem-based, which is already how OpenLore works.
- **Two enabled plugins could both want a namespace.** Mitigated by hard collision detection at resolution and `plugin add` time.
- **Auto-detect could surface unexpected packages.** Mitigated: auto-detect only registers packages with a valid `openspec` manifest and compatible range; it is toggleable and reported in `plugin list`.
- **Registry staleness.** The shipped JSON can lag npm. Acceptable for v1; `plugin add <npm-name>` works for unlisted packages with a trust notice.
- **Scope creep into hooks/in-process.** Explicitly deferred; the manifest is versioned so these can be added compatibly.

## Migration

- Purely additive. Existing projects and configs are unaffected: no `plugins` block means no plugins, identical behavior to today.
- Configs without `plugins` load unchanged (passthrough). `autoDetect` defaults to on, but with no installed plugin manifests present, nothing changes.
- OpenLore users who already ran it keep their `openlore` config block and generated specs; enabling the plugin simply surfaces `openspec lore …` and (optionally) installs the OpenLore skill across their tools.

## Open Questions

- Should `autoDetect` default on or off? (Proposed: on, because it makes "install the package, it just works" true; off is more conservative.)
- Should `plugin add <id>` run the package manager install itself, or only print the install command? (Proposed: print by default, install behind `--install` to avoid surprising network/package-manager actions.)
- Does the user-tier (`global`) plugins directory need its own `plugin add --global`, or is project-tier + auto-detect enough for v1? (Proposed: project-tier + auto-detect for v1; global tier defined in the spec but its CLI affordance deferred.)
