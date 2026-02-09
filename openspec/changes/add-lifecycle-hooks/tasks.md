## 1. Schema Type Extension

- [x] 1.1 Add `HookSchema` and `HooksSchema` Zod types to `src/core/artifact-graph/types.ts`
- [x] 1.2 Add optional `hooks` field to `SchemaYamlSchema`
- [x] 1.3 Export `Hook` and `Hooks` TypeScript types

## 2. Project Config Extension

- [x] 2.1 Add optional `hooks` field to `ProjectConfigSchema` in `src/core/project-config.ts`
- [x] 2.2 Add resilient parsing for hooks field (field-by-field, consistent with existing `rules` parsing)
- [x] 2.3 Add validation: warn on unrecognized lifecycle point keys

## 3. Hook Resolution Function

- [x] 3.1 Define `ResolvedHook` interface and `VALID_LIFECYCLE_POINTS` constant in `src/core/artifact-graph/types.ts` (exported via index)
- [x] 3.2 Implement `resolveHooks(projectRoot, changeName | null, lifecyclePoint)` function (null changeName = config-only hooks)
- [x] 3.3 Handle edge cases: no schema hooks, no config hooks, no hooks at all, invalid lifecycle point, null changeName

## 4. CLI Command

- [x] 4.1 Create `openspec hooks` command in `src/commands/workflow/hooks.ts`
- [x] 4.2 Implement text output format (human-readable)
- [x] 4.3 Implement JSON output format
- [x] 4.4 Add argument validation (lifecycle point must be valid, --change is optional)
- [x] 4.5 Implement config-only mode: when --change is omitted, return only config hooks (no schema resolution)
- [x] 4.6 Register command in CLI entry point (`src/cli/index.ts`)

## 5. Skill Template Updates

- [x] 5.1 Update `getArchiveChangeSkillTemplate()` and `getOpsxArchiveCommandTemplate()` in `src/core/templates/skill-templates.ts` to call `openspec hooks pre-archive` and `openspec hooks post-archive`
- [x] 5.2 Update apply skill templates in `src/core/templates/skill-templates.ts` to call hooks at pre/post-apply points
- [x] 5.3 Update new change skill templates in `src/core/templates/skill-templates.ts` to call hooks at pre/post-new points
- [x] 5.4 Update sync skill templates in `src/core/templates/skill-templates.ts` to call hooks at pre/post-sync points
- [x] 5.5 Regenerate agent skills with `openspec update` to update generated files

## 6. Tests

- [x] 6.1 Unit: Extend `test/core/artifact-graph/schema.test.ts` — schema parsing with hooks (valid, missing, empty, invalid instruction)
- [x] 6.2 Unit: Extend `test/core/project-config.test.ts` — config hooks parsing (valid, invalid, unknown lifecycle points, resilient field-by-field)
- [x] 6.3 Unit: Extend `test/core/artifact-graph/instruction-loader.test.ts` — `resolveHooks()` (schema only, config only, both with ordering, neither, null changeName = config-only)
- [x] 6.4 CLI integration: Extend `test/commands/artifact-workflow.test.ts` — `openspec hooks` command (with --change, without --change, no hooks, invalid lifecycle point, JSON output)
- [x] 6.5 Verify existing tests still pass (no regressions from schema/config type changes)
