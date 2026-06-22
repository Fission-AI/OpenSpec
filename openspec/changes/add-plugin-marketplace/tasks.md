## 1. Plugin Manifest

- [ ] 1.1 Define the manifest zod schema in `src/core/plugins/manifest.ts` (`manifestVersion`, `id`, `namespace`, `bin`/`binArgs`, `openspecCompat`, `displayName`, `summary`, `commands[]`, `skills[]`, command templates, `workflows[]`, `ownsConfigKeys[]`) with `.passthrough()` for forward compatibility
- [ ] 1.2 Implement manifest loading from a package's `package.json` `"openspec"` key, falling back to a sibling `openspec.plugin.json`
- [ ] 1.3 Implement validation with actionable, field-level error messages; invalid manifests disable the plugin instead of throwing
- [ ] 1.4 Reserve and reject namespaces that collide with core top-level commands; derive the reserved set from the registered command list rather than a duplicated literal. Current names: archive, change, completion, config, context-store, experimental (hidden), feedback, help, init, initiative, instructions, list, new, schema, schemas, set, show, spec, status, templates, update, validate, view, workspace, plugin, and the hidden `__complete`
- [ ] 1.5 Unit tests: valid manifest (both forms), invalid/missing fields, reserved-namespace rejection, unknown-field passthrough

## 2. Plugin Resolution

- [ ] 2.1 Implement `src/core/plugins/resolver.ts` with three-tier precedence (project config → user/global dir → auto-detected `node_modules`), mirroring `getSchemaDir`
- [ ] 2.2 Resolve the user-tier plugins directory via `getGlobalDataDir()` (XDG-aware), consistent with user schema resolution
- [ ] 2.3 Implement auto-detect: scan project `node_modules/*/package.json` for the `openspec` manifest key, gated by `plugins.autoDetect`
- [ ] 2.4 Implement semver compatibility gating against the running OpenSpec version; mark incompatible plugins without registering them
- [ ] 2.5 Detect and report duplicate-id and duplicate-namespace collisions across resolved plugins
- [ ] 2.6 Memoize resolution per process; ensure resolution performs no plugin code import
- [ ] 2.7 Unit tests: precedence/override order, auto-detect on/off, compat in/out of range, collision detection, missing `node_modules`

## 3. Plugin Runtime (Delegation)

- [ ] 3.1 Implement `src/core/plugins/runtime.ts`: register one namespaced top-level command per enabled, compatible plugin
- [ ] 3.2 Delegate execution by spawning the plugin bin via `node:child_process` with `shell: false`, inherited stdio, and propagated exit code
- [ ] 3.3 Resolve the plugin executable path from the package (handle Windows shims and spaces in paths without a shell)
- [ ] 3.4 Pass through all arguments after the namespace verbatim; forward `--help` to the plugin
- [ ] 3.5 Handle spawn failures (missing bin, ENOENT, non-zero exit) with clear messages and correct exit codes
- [ ] 3.6 Wire `registerPlugins(program)` into `src/cli/index.ts` after core command registration
- [ ] 3.7 Unit/integration tests: successful delegation, argument pass-through, exit-code propagation, missing-bin error, incompatible namespace not registered

## 4. Config (Project + Global)

- [ ] 4.1 Add an optional `plugins` block to the project `ProjectConfigSchema` in `src/core/project-config.ts` (`enabled: string[]`, optional `autoDetect`); this is the team-shared, committed source of project-tier enablement
- [ ] 4.2 Implement non-destructive writes to `openspec/config.yaml`: enabling/disabling a plugin SHALL preserve `schema`/`context`/`rules` and unknown third-party keys (e.g. `openlore`)
- [ ] 4.3 Add an optional user-level `plugins` block to `GlobalConfigSchema` (`autoDetect: boolean` default true, `registry` settings, optional user/global-tier plugins) in `src/core/config-schema.ts`
- [ ] 4.4 Add `plugins` to `KNOWN_TOP_LEVEL_KEYS` and config key-path validation for global config
- [ ] 4.5 Ensure schema evolution: project and global configs without `plugins` load unchanged; no plugins means today's behavior
- [ ] 4.6 Unit tests: project plugins parse/absent/malformed, non-destructive round-trip preserving an `openlore` block, global default `autoDetect`, passthrough of unknown global plugin keys, legacy configs without `plugins`

## 5. Plugin Contribution to AI Tools

- [ ] 5.1 Implement `src/core/plugins/contribution.ts`: collect skill/command/workflow templates declared by enabled plugins from their resolved package
- [ ] 5.2 Extend `getSkillTemplates`/`getCommandTemplates` in `src/core/shared/skill-generation.ts` to merge plugin-contributed templates with core templates (composing with `unify-template-generation-pipeline`)
- [ ] 5.3 Track contributed artifacts by explicit, plugin-namespaced names for safe cleanup (no pattern matching)
- [ ] 5.4 Validate contributed templates (well-formed skill/command files) and skip with a warning on failure rather than aborting init/update
- [ ] 5.5 Unit tests: merge correctness, name tracking, malformed-template skip, delivery-mode interaction (`both`/`skills`/`commands`)

## 6. CLI: `openspec plugin` Command Group

- [ ] 6.1 Implement `src/commands/plugin.ts` with `registerPluginCommand(program)`
- [ ] 6.2 `openspec plugin list` — resolved plugins with id, namespace, version, source tier, enabled/compat status (`--json`)
- [ ] 6.3 `openspec plugin info <id>` — manifest + registry details for one plugin (`--json`)
- [ ] 6.4 `openspec plugin add <id|npm-name>` — enable in config, install contributed skills/commands; print install command (or run behind `--install`); refuse incompatible unless `--force`; trust notice for non-registry packages
- [ ] 6.5 `openspec plugin remove <id>` — disable and clean up only that plugin's managed artifacts
- [ ] 6.6 `openspec plugin enable|disable <id>` — toggle without uninstalling the package
- [ ] 6.7 `openspec plugin search [query]` — read the curated registry index
- [ ] 6.8 Register the command group in `src/cli/index.ts`
- [ ] 6.9 Tests for each subcommand including non-interactive/`--json` paths and error cases

## 7. Marketplace Registry

- [ ] 7.1 Add `schemas/plugins/registry.json` with `registryVersion` and a listings array (id, npm, namespace, `openspecCompat`, summary, homepage)
- [ ] 7.2 Implement `src/core/plugins/registry.ts` loader with version checking and graceful handling of unknown formats
- [ ] 7.3 Add the **OpenLore** inaugural listing (npm `openlore`, namespace `lore`, compat range, summary, homepage)
- [ ] 7.4 Include `registry.json` in the package `files` allowlist in `package.json`
- [ ] 7.5 Unit tests: load/parse, unknown-version rejection, search filtering, OpenLore entry present and well-formed

## 8. Init Integration

- [ ] 8.1 Detect installed/compatible plugins during `openspec init`
- [ ] 8.2 Offer to enable detected plugins in the interactive flow (skippable; non-interactive defaults to no change)
- [ ] 8.3 Install enabled plugins' contributed skills/commands into selected AI tool directories
- [ ] 8.4 Report enabled plugins and installed artifacts in the init summary
- [ ] 8.5 Tests: init with/without plugins present, interactive enable, `--tools none`, idempotent re-run

## 9. Update Integration

- [ ] 9.1 Refresh enabled plugins' contributed skills/commands during `openspec update`
- [ ] 9.2 Detect drift (plugin enabled but artifacts missing/changed) and re-sync; clean up artifacts for disabled/removed plugins
- [ ] 9.3 Report plugin artifact changes in the update summary
- [ ] 9.4 Tests: update adds new contributed artifacts, removes artifacts for disabled plugins, idempotent re-run

## 10. Telemetry

- [ ] 10.1 Track delegated plugin command invocations by namespace path only (e.g. `lore`/`lore:generate`), never plugin arguments
- [ ] 10.2 Tests assert no plugin argument values are captured

## 11. Completions

- [ ] 11.1 Surface enabled plugin namespaces and their declared subcommands in shell completion output
- [ ] 11.2 Tests for completion data including a plugin namespace

## 12. Documentation

- [ ] 12.1 Add `docs/plugins.md`: plugin model, manifest, lifecycle commands, trust model, authoring a plugin
- [ ] 12.2 Add a marketplace section documenting the registry and how to submit a listing
- [ ] 12.3 Update `docs/existing-projects.md` and `docs/overview.md` to present OpenLore as the code-first onboarding path (generate → validate → evolve)
- [ ] 12.4 Update `README.md` with a short plugins/marketplace pointer
- [ ] 12.5 Cross-link issues #453, #436, #1081, #650, #1074, #1231, #667, #780, #724 and discussion #634 in the plugins doc rationale

## 13. Reference Plugin Fixture & E2E

- [ ] 13.1 Add a minimal fake plugin fixture under `test/fixtures/plugins/` (manifest + stub bin) exercising manifest, resolution, and delegation
- [ ] 13.2 E2E: install fixture into a temp project, assert `openspec plugin list` shows it and `openspec <namespace> …` delegates and propagates exit code
- [ ] 13.3 Document the manual smoke test for OpenLore (`npm i -D openlore` → `openspec plugin add openlore` → `openspec lore generate`) in the change for reviewers

## 14. Verification

- [ ] 14.1 `pnpm build` and `pnpm lint` clean
- [ ] 14.2 Targeted tests for plugins, plugin command, init, update, config
- [ ] 14.3 Full suite `pnpm test` green; resolve regressions
- [ ] 14.4 Cross-platform path behavior verified (Windows CI or mocked-path unit tests) for plugin/registry/skill paths and bin spawning
- [ ] 14.5 `openspec validate add-plugin-marketplace --strict` passes
- [ ] 14.6 Confirm no new required runtime dependency added and Node engine floor unchanged (≥20.19.0)
