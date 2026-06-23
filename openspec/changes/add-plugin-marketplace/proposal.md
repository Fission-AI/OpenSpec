## Why

OpenSpec's strength is a small, sharp core: propose → apply → archive, plus the artifact-graph engine. But the community keeps asking for the same thing in different words — a way to extend OpenSpec with optional, shareable capabilities **without** bloating the core or forcing everything to be a custom schema. Today there is no supported extension point for *commands*: every command is statically imported and registered in `src/cli/index.ts`, and the skill/command templates that get installed into the 30+ supported AI tools are hardcoded arrays in `src/core/shared/skill-generation.ts`. The only dynamic extension mechanism that exists is schema resolution (`project → user → package`).

This gap is documented across many open issues, none of which have been started or assigned:

- **#453 — Enhancement: Plugins.** Keep the core pure; let the community add/remove optional capabilities so OpenSpec becomes a platform, not a monolith.
- **#1081 — Extension package for custom schemas, skills, commands, hooks, and profiles.** Reusable workflows need more than a schema; they need companion skills, commands, and config bundled and installable.
- **#436 — Ecosystem & Integration.** Model-agnostic plugins and execution adapters so OpenSpec fits an existing toolchain.
- **#650 — Official channel/registry for sharing artifact schemas.** A discoverable, curated place to find and pull community contributions.
- **#1074 — Schema extension/partial overrides.** Symptom of the same root cause: today the only way to extend is to fully shadow a built-in.
- **#1231 / #667 / #780 — Distribute OpenSpec's skills/agents as an installable plugin pack.** Users want one-step installation of a curated bundle.

Separately, the single most-requested *capability* OpenSpec does not provide is generating specs from an existing codebase:

- **#724 — Reverse-engineer specs from existing implementations (code-first workflow).**
- **Discussion #634 — spec-gen / OpenLore.** A standalone tool that solves exactly the "cold start" problem: it reverse-engineers OpenSpec-compatible specs from existing code via static analysis + LLM extraction, then hands evolution back to OpenSpec.

These two threads converge on one decision: **OpenSpec should not absorb heavy, specialized capabilities like code reverse-engineering into its core — it should be able to host them as plugins.** This change builds the smallest credible plugin marketplace that lets OpenSpec remain a lightweight orchestrator while specialized "engines" live in their own packages, are discovered when present, are surfaced under their own command namespace, and can contribute skills to every supported AI tool. **OpenLore is the inaugural marketplace listing and the reference plugin** that validates the contract end to end. (The OpenLore package already declares `@fission-ai/openspec` as an optional peer dependency and already writes an `openlore` block into `openspec/config.yaml`, so it is well positioned to be first.)

## What Changes

### 1. Define a declarative plugin manifest (the contract)

Introduce a versioned **plugin manifest**: a self-describing record a package publishes (an `"openspec"` key in its `package.json`, or a sibling `openspec.plugin.json`). The manifest declares the plugin id, a reserved command **namespace**, the executable to delegate to, the OpenSpec version range it supports, the subcommands it surfaces (for help and completion), and any skills/commands/workflows it contributes. Manifests are validated before a plugin is trusted; an invalid manifest disables the plugin with an actionable error rather than crashing OpenSpec.

### 2. Discover and resolve installed plugins (three-tier, mirroring schema resolution)

Add plugin **resolution** that mirrors the existing schema resolver precedence: explicit project config → user/global directory → auto-detected packages in `node_modules`. Resolution reads only manifests (cheap), never imports plugin code, and records each plugin's source tier and version-compatibility status. Plugins whose `openspecCompat` range excludes the running OpenSpec version are surfaced as incompatible and are not registered.

### 3. Surface plugin commands by delegation (subprocess, not in-process)

Register each enabled, compatible plugin as a single namespaced top-level command (e.g. `openspec lore …`). Invoking it **delegates** to the plugin's own executable as a child process with inherited stdio and propagated exit code. This keeps OpenSpec's dependency tree and Node version floor untouched, loads a plugin's heavy dependencies only when its command actually runs, and lets a plugin own its own CLI surface. Unknown/incompatible namespaces fail with guidance, never a stack trace.

### 4. Let plugins contribute skills, commands, and workflows to AI tools

Extend the skill/command generation pipeline so plugin-contributed templates are merged with core templates and installed into every selected AI tool directory by `openspec init` and refreshed by `openspec update`. All plugin-installed artifacts are tracked by explicit name (never pattern-matched) so they can be cleaned up safely on disable/uninstall, consistent with OpenSpec's existing managed-file conventions.

### 5. Add the `openspec plugin` command group (lifecycle)

Add a verb-first `openspec plugin` command group: `list`, `info`, `add`, `remove`, `enable`, `disable`, and `search`. These manage which plugins are enabled, persist that choice in config, install/clean contributed skills, and report compatibility and source. `init` detects installed plugins and offers to enable them; the interactive flow stays optional and skippable.

### 6. Add a curated marketplace registry + OpenLore as the first listing

Ship a curated **registry index** (a versioned JSON document, distributed with the package and refreshable) describing approved plugins: id, npm package, OpenSpec compat range, summary, homepage, and namespace. `openspec plugin search` and `openspec plugin info` read this index for discovery; `openspec plugin add <id>` uses it to resolve install instructions. **OpenLore is the inaugural entry.** This change adds the registry, the discovery commands, the OpenLore listing, an integration fixture proving an external engine registers and delegates correctly, and the documentation that frames OpenLore as "generate initial specs from existing code; OpenSpec evolves them."

### 7. Persist plugin choices in project and global config

Record which plugins a project uses in the project `openspec/config.yaml` (`plugins.enabled`), so enablement is committed and shared by the team and drives project-tier resolution. Keep user-level preferences (auto-detect default, registry settings, and any user/global-tier plugins) in global config. Reads tolerate older configs unchanged; crucially, **writes preserve unrelated and unknown keys** — including third-party blocks such as the `openlore` metadata OpenLore already writes into `config.yaml` — so enabling a plugin never clobbers existing configuration. (The project config schema is not passthrough today, so this preservation is an explicit contract, not a free side effect.)

This proposal deliberately scopes plugins as **out-of-process delegated engines plus static template contribution**. In-process command injection, runtime lifecycle hooks (#682-style archive hooks), and a hosted registry backend are explicitly out of scope and noted as future work, so the first version stays small and safe.

## Capabilities

### New Capabilities

- `plugin-manifest`: The declarative plugin contract — fields, location, versioning, and validation semantics.
- `plugin-resolution`: Discovery and three-tier resolution of installed plugins, including version-compatibility gating.
- `plugin-runtime`: Namespaced command surfacing and subprocess delegation to plugin executables.
- `plugin-contribution`: Plugin-contributed skills/commands/workflows merged into the install pipeline and tracked for safe cleanup.
- `cli-plugin`: The `openspec plugin` command group for plugin lifecycle and discovery.
- `plugin-marketplace`: The curated registry index, discovery semantics, and the inaugural OpenLore listing.
- `plugin-docs`: Documentation obligations — code-first OpenLore onboarding, plugin authoring/manifest reference, and registry submission guidance (kept separate from the registry mechanics).

### Modified Capabilities

- `config-loading`: Recognize a project `plugins` block in `openspec/config.yaml`, parse it resiliently, and round-trip it without dropping unrelated or unknown keys.
- `global-config`: Persist user-level plugin preferences (auto-detect default, registry settings, user/global-tier plugins) with schema-evolution-safe defaults.
- `cli-init`: Detect installed plugins, optionally enable them, and install contributed skills/commands during initialization.
- `cli-update`: Refresh plugin-contributed skills/commands alongside core artifacts, with drift detection and safe cleanup.
- `cli-completion`: Surface enabled plugin namespaces and their declared subcommands in shell completions.
- `telemetry`: Track delegated plugin command invocations by namespace only, without capturing plugin arguments.

## Impact

- `src/cli/index.ts` — register the `plugin` command group and call a plugin registrar after core command registration
- `src/commands/plugin.ts` (new) — `openspec plugin list|info|add|remove|enable|disable|search`
- `src/core/plugins/manifest.ts` (new) — manifest schema (zod) + validation
- `src/core/plugins/resolver.ts` (new) — three-tier discovery/resolution + compat gating (mirrors `src/core/artifact-graph/resolver.ts`)
- `src/core/plugins/runtime.ts` (new) — namespaced command registration + subprocess delegation
- `src/core/plugins/registry.ts` (new) + `schemas/plugins/registry.json` (new) — curated marketplace index + loader
- `src/core/plugins/contribution.ts` (new) — merge plugin templates into generation
- `src/core/shared/skill-generation.ts` — accept plugin-contributed skill/command templates
- `src/core/config-schema.ts`, `src/core/global-config.ts` — add user-level `plugins` config block + validation
- `src/core/project-config.ts` — recognize a project `plugins` block in `ProjectConfigSchema` and write it non-destructively (preserve unknown keys such as `openlore`)
- `src/core/init.ts`, `src/core/update.ts` — plugin detection, contributed-artifact install/sync/cleanup
- `src/telemetry/index.ts` — track delegated plugin command namespaces
- `src/core/completions/*` — surface plugin namespaces/subcommands in completions
- `docs/plugins.md` (new), `docs/existing-projects.md`, `docs/overview.md`, `README.md` — plugin + marketplace + OpenLore onboarding docs
- `test/core/plugins/*`, `test/commands/plugin.test.ts`, integration fixture under `test/fixtures/plugins/` — unit + e2e coverage
