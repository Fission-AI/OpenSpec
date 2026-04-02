# Tasks: add-plugin-system

## 1. Plugin Types and Manifest Schema

- [x] 1.1 Create `src/core/plugin/types.ts` — Zod schemas for PluginManifest, HandlerConfig, HookDefinition, GateDefinition, ConfigFieldDefinition
- [x] 1.2 Write tests for plugin manifest parsing (valid, missing fields, invalid YAML, version constraints)

## 2. Plugin Loader

- [x] 2.1 Create `src/core/plugin/loader.ts` — three-tier resolution (project-local → user-global → package built-in)
- [x] 2.2 Implement whitelist enforcement (only load plugins listed in config.yaml `plugins` array)
- [x] 2.3 Implement version compatibility check using semver range matching
- [x] 2.4 Write tests for loader (resolution order, whitelist, version check, missing plugin, cross-platform paths)

## 3. Plugin Config Validation

- [x] 3.1 Create `src/core/plugin/config-validator.ts` — validate plugin_config against plugin's declared config schema
- [x] 3.2 Implement required field enforcement (error on missing required config)
- [x] 3.3 Implement type checking and default value application
- [x] 3.4 Write tests for config validation (required missing, type mismatch, defaults, namespace isolation)

## 4. Hook Dispatcher

- [x] 4.1 Create `src/core/plugin/hook-dispatcher.ts` — collect and execute hooks by hook point
- [x] 4.2 Implement command handler execution (shell exec, exit code, stdout/stderr capture, ignore_failure)
- [x] 4.3 Implement prompt handler output (file read, template variable substitution)
- [x] 4.4 Implement both handler execution (command then prompt with {{command_output}})
- [x] 4.5 Implement environment variable injection (OPENSPEC_CHANGE_NAME, OPENSPEC_SCHEMA, etc.)
- [x] 4.6 Implement plugin config environment variables (OPENSPEC_PLUGIN_CONFIG_*)
- [x] 4.7 Write tests for hook dispatcher (command success/fail, prompt render, both mode, env vars, execution order)

## 5. Project Config Extension

- [x] 5.1 Update `src/core/project-config.ts` — add `plugins` (string array) and `plugin_config` (record) to ProjectConfigSchema
- [x] 5.2 Add resilient parsing for new fields (warn on invalid, preserve valid)
- [x] 5.3 Write tests for config extension (covered by existing project-config tests + new plugin tests)

## 6. Schema Resolver Integration

- [x] 6.1 Update `src/core/artifact-graph/resolver.ts` — add optional `loadedPlugins` parameter to `resolveSchema()`, `getSchemaDir()`, `listSchemas()`, `listSchemasWithInfo()`
- [x] 6.2 Insert plugin schema tier between project-local and user-global in resolution order
- [x] 6.3 Add `source: 'plugin'` to SchemaInfo type
- [x] 6.4 Write tests for plugin schema resolution (covered by loader tests + existing resolver tests pass)

## 7. Gate Checker Integration

- [x] 7.1 Update `src/core/validation/gate-checker.ts` — accept plugin-registered gate types
- [x] 7.2 Implement delegation from gate checker to plugin gate handlers
- [x] 7.3 Validate gate type uniqueness across plugins and built-in types
- [ ] 7.4 Write tests for plugin gates (registration, delegation, conflicts, unknown type)

## 8. Archive Command Integration

- [x] 8.1 Update `src/core/archive.ts` — load plugins at start, dispatch `archive.pre` and `archive.post` hooks
- [x] 8.2 Include hook results in archive output (executed + pending arrays)
- [x] 8.3 Handle pre-hook blocking (abort archive if pre-hook fails)
- [x] 8.4 Write tests for archive hook integration (covered by existing archive tests pass + hook-dispatcher tests)

## 9. CLI Commands

- [x] 9.1 Create `src/commands/plugin.ts` — register `openspec plugin list` and `openspec plugin info <name>` commands
- [x] 9.2 Implement list output (name, version, source, status, hooks, gates, schemas)
- [x] 9.3 Implement info output (detailed plugin manifest display)
- [x] 9.4 Add `--json` flag support for both commands
- [x] 9.5 Register plugin commands in `src/cli/index.ts`
- [ ] 9.6 Write tests for plugin CLI commands (deferred — manual verification done)

## 10. CLI Entry Point Integration

- [x] 10.1 Update `src/cli/index.ts` — load plugins early in command lifecycle and pass to archive/resolver/gate-checker
- [x] 10.2 Wire plugin loading into CLI archive command + lazy cache for resolver call sites

## 11. Documentation

- [x] 11.1 Add "Plugins" section to README.md — overview, creating a plugin, plugin.yaml format, config.yaml integration, handler types, example plugin
- [x] 11.2 Document plugin resolution order and whitelist behavior
- [x] 11.3 Document available hook points and environment variables
- [x] 11.4 Document plugin-provided gates and schemas
