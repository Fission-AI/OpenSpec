## 1. Project config parsing

- [x] 1.1 Add `specStructure` to `ProjectConfigSchema` in `src/core/project-config.ts` (optional field, Zod schema matching `SpecStructureConfig` shape)
- [x] 1.2 Add resilient sub-field-by-field parsing block in `readProjectConfig()` after the rules block (~line 153): parse `structure`, `maxDepth`, `allowMixed`, `validatePaths` each independently with `safeParse()`, warn and skip invalid ones
- [x] 1.3 Import `SpecStructureConfig` type from `src/utils/spec-discovery.ts` for type compatibility

## 2. Config merge logic

- [x] 2.1 Change `getSpecStructureConfig()` signature in `src/core/global-config.ts` to accept optional `projectOverrides?: Partial<SpecStructureConfig>` parameter
- [x] 2.2 Implement three-level merge: `projectOverrides?.field` > `global.field` > default, using `||` for `structure` and `??` for `maxDepth`, `allowMixed`, `validatePaths`

## 3. Call site update

- [x] 3.1 In `src/commands/validate.ts`, import `readProjectConfig` from `project-config.ts`
- [x] 3.2 At line ~208, read project config and pass `specStructure` overrides: `const projectConfig = readProjectConfig(process.cwd()); const config = getSpecStructureConfig(projectConfig?.specStructure);`

## 4. Tests

- [x] 4.1 Add tests in `test/core/project-config.test.ts` for specStructure parsing: valid complete, partial fields, invalid sub-field values (resilient warn+skip), no specStructure field, non-object specStructure, unknown sub-fields ignored
- [x] 4.2 Add tests in `test/core/global-config.test.ts` for `getSpecStructureConfig()` with project overrides: specific field overrides, all fields overridden, no overrides (backward compat), false boolean preservation, undefined passthrough

## 5. Documentation

- [x] 5.1 Update `docs/organizing-specs.md` Configuration section (~line 102) to document project-level `specStructure` in `openspec/config.yaml` with a YAML example and the precedence chain (project > global > default)

## 6. Verification

- [x] 6.1 Run `pnpm build` — no type errors
- [x] 6.2 Run `pnpm test` — all tests pass (18 pre-existing failures in zsh-installer.test.ts, unrelated)
- [x] 6.3 Manual test: add `specStructure` to a project's `openspec/config.yaml` and run `openspec validate --specs` to confirm it is picked up
