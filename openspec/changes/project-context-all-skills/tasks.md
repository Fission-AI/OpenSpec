## 1. CLI: Add `context` to apply instructions

- [x] 1.1 Add `context?: string` field to `ApplyInstructions` interface in `src/commands/workflow/shared.ts`
- [x] 1.2 Update `generateApplyInstructions()` in `src/commands/workflow/instructions.ts` to call `readProjectConfig()` and populate `context`
- [x] 1.3 Update `printApplyInstructionsText()` to print `<project_context>` block when context is present (matching artifact instructions format)
- [x] 1.4 Add tests for apply instructions with context (config present, config absent, context field missing)

## 2. CLI: Add `--context` flag to instructions command

- [x] 2.1 Add `--context` option to the instructions command in `src/cli/index.ts`
- [x] 2.2 Implement context-only handler in `src/commands/workflow/instructions.ts`: read `readProjectConfig()`, output context as text or JSON
- [x] 2.3 Add validation: error if `--context` is combined with `--change`, `--schema`, or an artifact argument
- [x] 2.4 Handle graceful cases: no config file, config without context field
- [x] 2.5 Add tests for `--context` flag (text output, JSON output, exclusivity errors, graceful fallbacks)

## 3. CLI: Update shell completions

- [x] 3.1 Add `--context` to the instructions command completions in `src/core/completions/command-registry.ts` (N/A - instructions command not in completions registry)

## 4. Skill prompts: Strengthen enforcement in artifact-creating skills

- [x] 4.1 Update Continue skill template (`getContinueChangeSkillTemplate`) — replace weak language with "you MUST follow" for `context`, `rules`, `instruction`
- [x] 4.2 Update FF skill template (`getFfChangeSkillTemplate`) — same enforcement pattern
- [x] 4.3 Update New skill template (`getNewChangeSkillTemplate`) — N/A, does not create artifacts (only shows template)
- [x] 4.4 Update Onboard skill template (`getOnboardSkillTemplate`) — N/A, uses own inline flow without standard instructions pathway

## 5. Skill prompts: Add context consumption to code-operating skills

- [x] 5.1 Update Apply skill template (`getApplyChangeSkillTemplate`) — add `context` field consumption from `instructions apply --json` with mandatory enforcement
- [x] 5.2 Update Verify skill template (`getVerifyChangeSkillTemplate`) — add `context` field consumption from `instructions apply --json` with mandatory enforcement

## 6. Skill prompts: Add context loading to change-independent skills

- [x] 6.1 Update Explore skill template (`getExploreSkillTemplate`) — add `openspec instructions --context --json` call at session start with mandatory enforcement
- [x] 6.2 Update Archive skill template (`getArchiveChangeSkillTemplate`) — add `openspec instructions --context --json` call at session start with mandatory enforcement
- [x] 6.3 Update Bulk-archive skill template (`getBulkArchiveChangeSkillTemplate`) — add `openspec instructions --context --json` call at session start with mandatory enforcement
- [x] 6.4 Update Sync skill template (`getSyncSpecsSkillTemplate`) — add `openspec instructions --context --json` call at session start with mandatory enforcement

## 7. Slash commands (opsx): Update generated command files

- [x] 7.1 Update opsx Continue command template (`getOpsxContinueCommandTemplate`) — same enforcement as skill template
- [x] 7.2 Update opsx FF command template (`getOpsxFfCommandTemplate`) — same enforcement as skill template
- [x] 7.3 Update opsx New command template (`getOpsxNewCommandTemplate`) — N/A, does not create artifacts
- [x] 7.4 Update opsx Onboard command template (`getOpsxOnboardCommandTemplate`) — N/A, delegates to shared function
- [x] 7.5 Update opsx Apply command template (`getOpsxApplyCommandTemplate`) — add context consumption + enforcement
- [x] 7.6 Update opsx Verify command template (`getOpsxVerifyCommandTemplate`) — add context consumption + enforcement
- [x] 7.7 Update opsx Explore command template (`getOpsxExploreCommandTemplate`) — add context loading + enforcement
- [x] 7.8 Update opsx Archive command template (`getOpsxArchiveCommandTemplate`) — add context loading + enforcement
- [x] 7.9 Update opsx Bulk-archive command template (`getOpsxBulkArchiveCommandTemplate`) — add context loading + enforcement
- [x] 7.10 Update opsx Sync command template (`getOpsxSyncCommandTemplate`) — add context loading + enforcement

## 8. Regenerate skill files

- [x] 8.1 Run `openspec skills generate` to regenerate all `.claude/commands/opsx/*.md` files with updated templates

## 9. Documentation

- [x] 9.1 Update `docs/cli.md` — add `--context` flag to the `openspec instructions` section with usage examples and behavior

## 10. Verification

- [x] 10.1 Run full test suite and verify no regressions
- [x] 10.2 Verify on Windows CI that path handling in new code uses `path.join()`
