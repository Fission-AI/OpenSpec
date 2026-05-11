## 1. Validation Layer (D1)

- [x] 1.1 In `src/core/project-config.ts`, define and export `WORKFLOW_RULE_TARGETS = new Set<WorkflowId>(['apply', 'archive'])`, importing `WorkflowId` from `profiles.ts`
- [x] 1.2 In `src/core/artifact-graph/instruction-loader.ts`, strip keys present in `WORKFLOW_RULE_TARGETS` from `projectConfig.rules` before passing the map to `validateConfigRules()`
- [x] 1.3 Write unit tests for the call site confirming `apply` and `archive` keys in `rules` produce no validation warning, and that unknown keys still do

## 2. Apply Instruction Extension (D2)

- [x] 2.1 In `generateApplyInstructions()` (`src/commands/workflow/instructions.ts`), call `readProjectConfig()` and add optional `context` and `rules` fields (from `rules.apply`) to the return type
- [x] 2.2 In `printApplyInstructionsText()`, render `<project_context>` and `<rules>` blocks after built-in content, matching the pattern in `printInstructionsText()`
- [x] 2.3 Write unit tests for `generateApplyInstructions()`: context present, rules.apply present, both absent; confirm JSON output carries the new fields
- [x] 2.4 Write unit tests for `printApplyInstructionsText()`: verify rendered text includes blocks when fields are set and omits them when absent

## 3. Archive Instruction Generation (D3)

- [x] 3.1 Add `generateArchiveInstructions(projectRoot)` in `src/commands/workflow/instructions.ts`: read project config, call `getArchiveChangeSkillTemplate()`, return `{ template, context?, rules? }` using `path.join()` / `path.resolve()` for all path operations
- [x] 3.2 Add `archiveInstructionsCommand(options)`: call `generateArchiveInstructions()`, serialize to JSON with `--json`, or call `printArchiveInstructionsText()` for text
- [x] 3.3 Add `printArchiveInstructionsText()`: render template content followed by `<project_context>` and `<rules>` blocks
- [x] 3.4 In `src/cli/index.ts`, add an `archive` branch alongside the existing `apply` branch in the `instructions` command handler, routing to `archiveInstructionsCommand()`
- [x] 3.5 Write unit tests for `generateArchiveInstructions()`: no config, context only, `rules.archive` only, both; confirm `rules` is absent when only artifact keys exist in config
- [x] 3.6 Write integration test for `openspec instructions archive --json` end-to-end

## 4. Skill Template Updates (D5)

- [x] 4.1 In `src/core/templates/workflows/apply-change.ts`, add `context` and `rules` to the Step 3 JSON field list and add a constraint that the agent must apply them as behavioral guidance without copying them into any output file
- [x] 4.2 In `src/core/templates/workflows/archive-change.ts`, add a new step before the main workflow steps: call `openspec instructions archive --json` and consume returned `context` and `rules` as constraints; note that built-in readiness checks run regardless
- [x] 4.3 In `src/core/templates/workflows/bulk-archive-change.ts`, add a one-time call to `openspec instructions archive --json` at the start of the batch; apply returned `context` and `rules` as constraints for all changes (single call, not once per change)
- [x] 4.4 Run `openspec sync` to regenerate `.claude/commands/opsx/*.md` from the updated templates; verify generated files reflect template changes

## 5. Config Documentation (D6)

- [x] 5.1 In `src/core/config-prompts.ts`, add `rules.apply` and `rules.archive` as commented examples in the same `rules` block as existing artifact key examples (`proposal`, `tasks`)

## 6. Integration Tests

- [x] 6.1 Write integration test for `openspec instructions apply --json` confirming `context` and `rules` appear in output when configured
- [x] 6.2 Write integration test confirming `rules.apply` and `rules.archive` in `config.yaml` produce no validation warning during instruction generation
- [x] 6.3 Verify `openspec init` generates a `config.yaml` whose `rules` comment block includes `apply` and `archive` examples

## 7. Docs

- [x] 7.1 Update `docs/opsx.md` to document `openspec instructions archive` as a valid command and show `rules.apply` / `rules.archive` alongside existing artifact rule examples
