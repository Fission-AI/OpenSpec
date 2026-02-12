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
- [x] 3.2 Implement `resolveHooks(projectRoot, changeName | null, lifecyclePoint)` function in `src/core/artifact-graph/instruction-loader.ts`
- [x] 3.3 Handle edge cases: no schema hooks, no config hooks, no hooks at all, invalid lifecycle point, null changeName

## 4. Additional Lifecycle Points

- [x] 4.1 Add `pre-verify` and `post-verify` to `VALID_LIFECYCLE_POINTS` in `src/core/artifact-graph/types.ts`
- [x] 4.2 Add `pre-continue`, `post-continue`, `pre-ff`, `post-ff` to `VALID_LIFECYCLE_POINTS` in `src/core/artifact-graph/types.ts`
- [x] 4.3 Add `pre-explore`, `post-explore`, `pre-bulk-archive`, `post-bulk-archive`, `pre-onboard`, `post-onboard` to `VALID_LIFECYCLE_POINTS` (20 total)

## 5. CLI: Merge hooks into instructions command

- [x] 5.1 Add `--hook <lifecycle-point>` option to `instructions` command in `src/cli/index.ts`
- [x] 5.2 Add mutual exclusivity validation: if both `[artifact]` and `--hook` are provided, exit with error `"--hook cannot be used with an artifact argument"`
- [x] 5.3 When `--hook` is present (and no positional artifact), delegate to `hooksCommand()` from `src/commands/workflow/hooks.ts`
- [x] 5.4 Remove standalone `hooks` command registration from `src/cli/index.ts`
- [x] 5.5 Keep `hooksCommand` import in `src/cli/index.ts` (used by instructions routing via delegation)

## 6. Skill Template Updates

- [x] 6.1 Update archive skill templates (`getArchiveChangeSkillTemplate()`, `getOpsxArchiveCommandTemplate()`) to call hooks at pre/post-archive points
- [x] 6.2 Update apply skill templates to call hooks at pre/post-apply points
- [x] 6.3 Update new change skill templates to call hooks at pre/post-new points
- [x] 6.4 Update sync skill templates to call hooks at pre/post-sync points
- [x] 6.5 Change all hook invocations in skill templates from `openspec hooks <point>` to `openspec instructions --hook <point>` (~18 occurrences in `src/core/templates/skill-templates.ts`)
- [x] 6.6 Add pre/post-verify hook steps to `getVerifyChangeSkillTemplate()` and `getOpsxVerifyCommandTemplate()` in `src/core/templates/skill-templates.ts`
- [x] 6.8 Add pre/post-continue hook steps to `getContinueChangeSkillTemplate()` and `getOpsxContinueCommandTemplate()`
- [x] 6.9 Add pre-ff/post-ff hook steps and pre/post-continue per-artifact hooks to `getFfChangeSkillTemplate()` and `getOpsxFfCommandTemplate()`
- [x] 6.10 Regenerate agent skills with `openspec update --force`
- [x] 6.11 Add pre/post-explore hook steps to `getExploreSkillTemplate()` and `getOpsxExploreCommandTemplate()`
- [x] 6.12 Add pre/post-bulk-archive hook steps to `getBulkArchiveChangeSkillTemplate()` and `getOpsxBulkArchiveCommandTemplate()`, including per-change pre/post-archive hooks
- [x] 6.13 Add pre/post-onboard hook steps to `getOnboardInstructions()`

## 7. Documentation

- [x] 7.1 Document the `instructions` command covering all three modes (artifact, apply, `--hook`) with examples and mutual exclusivity note

## 8. Tests

- [x] 8.1 Unit: Extend `test/core/artifact-graph/schema.test.ts` — schema parsing with hooks (valid, missing, empty, invalid instruction)
- [x] 8.2 Unit: Extend `test/core/project-config.test.ts` — config hooks parsing (valid, invalid, unknown lifecycle points, resilient field-by-field)
- [x] 8.3 Unit: Extend `test/core/artifact-graph/instruction-loader.test.ts` — `resolveHooks()` (schema only, config only, both with ordering, neither, null changeName = config-only)
- [x] 8.4 CLI integration: Update existing hook tests in `test/commands/artifact-workflow.test.ts` to use `instructions --hook` instead of `hooks` command
- [x] 8.5 CLI integration: Add mutual exclusivity test — `instructions <artifact> --hook <point>` returns error
- [x] 8.6 CLI integration: Add `pre-verify`/`post-verify` as valid lifecycle points in tests
- [x] 8.8 CLI integration: Add `pre-continue`/`post-continue`/`pre-ff`/`post-ff` as valid lifecycle points in tests
- [x] 8.9 Verify existing tests still pass (no regressions)
- [x] 8.10 CLI integration: Add `pre-explore`/`post-explore`/`pre-bulk-archive`/`post-bulk-archive`/`pre-onboard`/`post-onboard` as valid lifecycle points in tests
