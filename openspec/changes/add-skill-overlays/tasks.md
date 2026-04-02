## 1. Plugin Manifest Schema

- [x] 1.1 Add `SkillOverlaySchema` and `SkillOverlaysSchema` to `src/core/plugin/types.ts` — define Zod schemas for the overlay operation object (`{ append: string }`) and the per-workflow map (`z.record(string, SkillOverlaySchema)`)
- [x] 1.2 Add optional `skill_overlays` field to `PluginManifestSchema` in `src/core/plugin/types.ts`
- [x] 1.3 Add tests for overlay schema validation in `test/core/plugin/types.test.ts` — valid append, missing file path, unknown operation key, empty overlays, multiple workflows

## 2. Overlay Resolution in Plugin Loader

- [x] 2.1 Add `resolveOverlayPaths(plugin: LoadedPlugin)` function in `src/core/plugin/loader.ts` — resolves overlay file paths relative to plugin dir using `path.join()`
- [x] 2.2 Add `getPluginOverlays(plugins: LoadedPlugin[], workflowId: string)` function in `src/core/plugin/loader.ts` — returns ordered list of overlay file contents for a given workflow, warns on missing files
- [x] 2.3 Export new functions from `src/core/plugin/index.ts`
- [x] 2.4 Add tests in `test/core/plugin/loader.test.ts` — overlay path resolution (cross-platform), missing file warning, multiple plugins ordering, no overlays case

## 3. Transformer Composition

- [x] 3.1 Add `composeTransformers(...fns)` utility in `src/core/shared/skill-generation.ts` — composes multiple `(string) => string` functions left-to-right, skipping undefined entries
- [x] 3.2 Add tests for `composeTransformers` — single transformer, multiple transformers, undefined entries, empty input

## 4. Injection in Update Command

- [x] 4.1 Import `getLoadedPlugins` and `getPluginOverlays` in `src/core/update.ts`
- [x] 4.2 Load plugins at start of `execute()` method (after config read, before skill generation loop) — wrap in try/catch, warn on failure, continue without overlays
- [x] 4.3 In the skill generation loop, build overlay transformer per workflow using `getPluginOverlays(plugins, workflowId)` and compose with existing tool transformer via `composeTransformers`
- [x] 4.4 In the command generation section, apply overlays to `CommandContent.body` before passing to `generateCommands()`
- [x] 4.5 Add integration test in `test/core/update.test.ts` — update with plugin overlay produces augmented skill content, update without plugins produces unchanged content
- [x] 4.6 Verify `openspec init` does NOT apply overlays — add a test or assertion confirming init output is unaffected by plugin overlays

## 5. Plugin CLI Enhancement

- [x] 5.1 Update `openspec plugin info` in `src/commands/plugin.ts` to display `skill_overlays` section when present
- [x] 5.2 Include `skillOverlays` in JSON output of `plugin info --json`
- [x] 5.3 Add test for plugin info with/without overlays
- [x] 5.4 Add overlay file existence check to `openspec plugin validate` (if validate subcommand exists) or `plugin info` — warn when declared overlay file is missing on disk

## 6. Cross-Platform Verification

- [x] 6.1 Ensure all overlay path resolution tests use `path.join()` for expected values (not hardcoded slashes)
- [x] 6.2 Run full test suite on CI (existing Windows CI config covers this)
