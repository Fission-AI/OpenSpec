## 1. Plugin Manifest

- [x] 1.1 Define the manifest zod schema in `src/core/plugins/manifest.ts` (`manifestVersion`, `id`, `namespace`, `bin`/`binArgs`, `openspecCompat`, `displayName`, `summary`, `commands[]`, `skills[]`, command templates, `workflows[]`, `ownsConfigKeys[]`) with `.passthrough()` for forward compatibility
- [x] 1.2 Implement manifest loading from a package's `package.json` `"openspec"` key, falling back to a sibling `openspec.plugin.json`
- [x] 1.3 Implement validation with actionable, field-level error messages; invalid manifests disable the plugin instead of throwing
- [x] 1.4 Reserve and reject namespaces that collide with core top-level commands. The reserved set is derived at runtime from every registered top-level command (Commander's `program.commands`), so it always reflects the actual CLI — including `plugin` itself once registered and hidden commands (`experimental`, `__complete`). The enumerated names are illustrative, not a hand-maintained source of truth. As of this change the registered top-level commands are: archive, change, completion, config, context-store, experimental, feedback, help, init, initiative, instructions, list, new, plugin, schema, schemas, set, show, spec, status, templates, update, validate, view, workspace, `__complete`
- [x] 1.5 Unit tests: valid manifest (both forms), invalid/missing fields, reserved-namespace rejection, unknown-field passthrough

## 2. Plugin Resolution

- [x] 2.1 Implement `src/core/plugins/resolver.ts` with three-tier precedence (project config → user/global dir → auto-detected `node_modules`), mirroring `getSchemaDir`
- [x] 2.2 Resolve the user-tier plugins directory via `getGlobalDataDir()` (XDG-aware), consistent with user schema resolution
- [x] 2.3 Implement auto-detect: scan project `node_modules/*/package.json` for the `openspec` manifest key, gated by `plugins.autoDetect`
- [x] 2.4 Implement semver compatibility gating against the running OpenSpec version; mark incompatible plugins without registering them
- [x] 2.5 Detect and report duplicate-id and duplicate-namespace collisions across resolved plugins
- [x] 2.6 Memoize resolution per process; ensure resolution performs no plugin code import
- [x] 2.7 Unit tests: precedence/override order, auto-detect on/off, compat in/out of range, collision detection, missing `node_modules`

## 3. Plugin Runtime (Delegation)

- [x] 3.1 Implement `src/core/plugins/runtime.ts`: register one namespaced top-level command per enabled, compatible plugin
- [x] 3.2 Delegate execution by spawning the plugin bin via `node:child_process` with `shell: false`, inherited stdio, and propagated exit code
- [x] 3.3 Resolve the plugin executable path from the package (handle Windows shims and spaces in paths without a shell)
- [x] 3.4 Pass through all arguments after the namespace verbatim; forward `--help` to the plugin
- [x] 3.5 Handle spawn failures (missing bin, ENOENT, non-zero exit) with clear messages and correct exit codes
- [x] 3.6 Wire `registerPlugins(program)` into `src/cli/index.ts` after core command registration
- [x] 3.7 Unit/integration tests: successful delegation, argument pass-through, exit-code propagation, missing-bin error, incompatible namespace not registered

## 4. Config (Project + Global)

- [x] 4.1 Add an optional `plugins` block to the project `ProjectConfigSchema` in `src/core/project-config.ts` (`enabled: string[]`, optional `autoDetect`); this is the team-shared, committed source of project-tier enablement
- [x] 4.2 Implement non-destructive writes to `openspec/config.yaml`: enabling/disabling a plugin SHALL preserve `schema`/`context`/`rules` and unknown third-party keys (e.g. `openlore`)
- [x] 4.3 Add an optional user-level `plugins` block to `GlobalConfigSchema` (`autoDetect: boolean` default true, `registry` settings, optional user/global-tier plugins) in `src/core/config-schema.ts`
- [x] 4.4 Add `plugins` to `KNOWN_TOP_LEVEL_KEYS` and config key-path validation for global config
- [x] 4.5 Ensure schema evolution: project and global configs without `plugins` load unchanged; no plugins means today's behavior
- [x] 4.6 Unit tests: project plugins parse/absent/malformed, non-destructive round-trip preserving an `openlore` block, global default `autoDetect`, passthrough of unknown global plugin keys, legacy configs without `plugins`

## 5. Plugin Contribution to AI Tools

- [x] 5.1 Implement `src/core/plugins/contribution.ts`: collect skill/command/workflow templates declared by enabled plugins from their resolved package
- [x] 5.2 Merge plugin-contributed skills with core skills in the install path. Interim approach (implemented): a standalone `collectContributedSkills`/`installContributedSkills` module that `init`/`update` call alongside the existing `getSkillTemplates` flow — it does not depend on any new exports. Note: `unify-template-generation-pipeline` is a separate **in-flight** change, not an existing function in `src/core/shared/skill-generation.ts`; when it lands, fold this contribution step into the unified pipeline rather than calling it separately
- [x] 5.3 Track contributed artifacts by explicit, plugin-namespaced names for safe cleanup (no pattern matching)
- [x] 5.4 Validate contributed templates (well-formed skill/command files) and skip with a warning on failure rather than aborting init/update
- [x] 5.5 Unit tests: merge correctness, name tracking, malformed-template skip, delivery-mode interaction (`both`/`skills`/`commands`)
- [x] 5.6 Path-safety: validate `skills[].dir` as a single safe segment and `skills[].source` as a relative in-package path at manifest validation; re-enforce containment (resolved target inside the tool skills dir / plugin package) before every copy and delete. Regression tests for `../`, absolute, nested, and Windows-separator paths

## 6. CLI: `openspec plugin` Command Group

- [x] 6.1 Implement `src/commands/plugin.ts` with `registerPluginCommand(program)`
- [x] 6.2 `openspec plugin list` — resolved plugins with id, namespace, version, source tier, enabled/compat status (`--json`)
- [x] 6.3 `openspec plugin info <id>` — manifest + registry details for one plugin (`--json`)
- [x] 6.4 `openspec plugin add <id|npm-name>` — enable in config, install contributed skills/commands; when the package is not yet installed, print the npm install instruction (e.g. `npm install --save-dev openlore`) by default and run it only with `--install`; refuse incompatible unless `--force`; trust notice for non-registry packages
- [x] 6.5 `openspec plugin remove <id>` — disable and clean up only that plugin's managed artifacts
- [x] 6.6 `openspec plugin enable|disable <id>` — toggle without uninstalling the package
- [x] 6.7 `openspec plugin search [query]` — read the curated registry index
- [x] 6.8 Register the command group in `src/cli/index.ts`
- [x] 6.9 Tests for each subcommand including non-interactive/`--json` paths and error cases

## 7. Marketplace Registry

- [x] 7.1 Add `schemas/plugins/registry.json` with `registryVersion` and a listings array (id, npm, namespace, `openspecCompat`, summary, homepage)
- [x] 7.2 Implement `src/core/plugins/registry.ts` loader with version checking. Unknown-format behavior is fail-closed: if `registryVersion` is greater than the supported version (or missing/malformed), reject the entire load with an actionable `RegistryError` naming the unsupported version — never partially parse or silently ignore entries
- [x] 7.3 Add the **OpenLore** inaugural listing (npm `openlore`, namespace `lore`, compat range, summary, homepage)
- [x] 7.4 Include `registry.json` in the package `files` allowlist in `package.json`
- [x] 7.5 Unit tests: load/parse, unknown-version rejection, search filtering, OpenLore entry present and well-formed

## 8. Init Integration

- [x] 8.1 Detect installed/compatible plugins during `openspec init`
- [ ] 8.2 Offer to enable detected plugins in the interactive `init` flow (deferred: auto-detect makes installed plugins active by default; explicit interactive offer is follow-up UX. Non-interactive already defaults to no change.)
- [x] 8.3 Install enabled plugins' contributed skills/commands into selected AI tool directories
- [x] 8.4 Report enabled plugins and installed artifacts in the init summary
- [x] 8.5 Tests: init with/without plugins present, interactive enable, `--tools none`, idempotent re-run

## 9. Update Integration

- [x] 9.1 Refresh enabled plugins' contributed skills/commands during `openspec update`
- [x] 9.2 Detect drift (plugin enabled but artifacts missing/changed) and re-sync; clean up artifacts for disabled/removed plugins
- [x] 9.3 Report plugin artifact changes in the update summary
- [x] 9.4 Tests: update adds new contributed artifacts, removes artifacts for disabled plugins, idempotent re-run

## 10. Telemetry

- [x] 10.1 Track delegated plugin command invocations by namespace path only (e.g. `lore`/`lore:generate`), never plugin arguments
- [x] 10.2 Tests assert no plugin argument values are captured

## 11. Completions

- [x] 11.1 Surface enabled plugin namespaces and their declared subcommands in shell completion output
- [x] 11.2 Tests for completion data including a plugin namespace

## 12. Documentation

- [x] 12.1 Add `docs/plugins.md`: plugin model, manifest, lifecycle commands, trust model, authoring a plugin
- [x] 12.2 Add a marketplace section documenting the registry and how to submit a listing
- [x] 12.3 Update `docs/existing-projects.md` and `docs/overview.md` to present OpenLore as the code-first onboarding path (generate → validate → evolve)
- [x] 12.4 Update `README.md` with a short plugins/marketplace pointer
- [x] 12.5 Cross-link issues #453, #436, #1081, #650, #1074, #1231, #667, #780, #724 and discussion #634 in the plugins doc rationale

## 13. Reference Plugin Fixture & E2E

- [x] 13.1 Add a minimal fake plugin fixture under `test/fixtures/plugins/` (manifest + stub bin) exercising manifest, resolution, and delegation
- [x] 13.2 E2E: install fixture into a temp project, assert `openspec plugin list` shows it and `openspec <namespace> …` delegates and propagates exit code
- [x] 13.3 Document the manual smoke test for OpenLore (`npm i -D openlore` → `openspec plugin add openlore` → `openspec lore generate`) in the change for reviewers

## 14. Verification

- [x] 14.1 `pnpm build` and `pnpm lint` clean
- [x] 14.2 Targeted tests for plugins, plugin command, init, update, config
- [x] 14.3 Full suite `pnpm test` green; resolve regressions
- [~] 14.4 Cross-platform path behavior: code uses `path.join`/`path.resolve` throughout, the user dir uses the XDG-aware `getGlobalDataDir`, and delegation runs `process.execPath <bin>` / cross-spawn to avoid `.cmd` shim issues. Verified by unit tests with mocked XDG paths; not yet exercised on a Windows CI runner.
- [x] 14.5 `openspec validate add-plugin-marketplace --strict` passes
- [x] 14.6 Confirm no new required runtime dependency added and Node engine floor unchanged (≥20.19.0)
