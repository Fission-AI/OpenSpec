## 1. New multiagent-apply skill template

- [ ] 1.1 Create `src/core/templates/workflows/multiagent-apply.ts` with `getOpsxMultiagentApplySkillTemplate()` and `getOpsxMultiagentApplyCommandTemplate()` functions
  <!-- Files: src/core/templates/workflows/multiagent-apply.ts -->
- [ ] 1.2 Write the skill instructions prompt covering: change selection, schema validation (must be dispec-driven), reading distribution.md, TeamCreate, TaskCreate population from tasks.md, Agent spawning per assignment card, progress monitoring via TaskList, and shutdown
  <!-- Files: src/core/templates/workflows/multiagent-apply.ts -->
- [ ] 1.3 Write the command template with the same content, category "Workflow", tags `['workflow', 'multiagent', 'apply']`
  <!-- Files: src/core/templates/workflows/multiagent-apply.ts -->

## 2. Register multiagent-apply in the template system

- [ ] 2.1 Export the new template functions from `src/core/templates/skill-templates.ts`
  <!-- Files: src/core/templates/skill-templates.ts -->
- [ ] 2.2 Add the new skill entry to `getSkillTemplates()` in `src/core/shared/skill-generation.ts` with `dirName: 'openspec-multiagent-apply'` and `workflowId: 'multiagent-apply'`
  <!-- Files: src/core/shared/skill-generation.ts -->
- [ ] 2.3 Add the new command entry to `getCommandTemplates()` in `src/core/shared/skill-generation.ts` with `id: 'multiagent-apply'`
  <!-- Files: src/core/shared/skill-generation.ts -->
- [ ] 2.4 Add `'multiagent-apply'` to `ALL_WORKFLOWS` in `src/core/profiles.ts`
  <!-- Files: src/core/profiles.ts -->

## 3. Fix existing multiagent skill template

- [ ] 3.1 Replace all `TodoWrite` references with `TaskCreate`/`TaskUpdate` in `getOpsxMultiagentSkillTemplate()` instructions
  <!-- Files: src/core/templates/workflows/multiagent.ts -->
- [ ] 3.2 Replace all `TodoWrite` references with `TaskCreate`/`TaskUpdate` in `getOpsxMultiagentCommandTemplate()` content
  <!-- Files: src/core/templates/workflows/multiagent.ts -->
- [ ] 3.3 Update the skill output section to reference `/opsx:multiagent-apply` as the next step instead of generic "set up a Claude Code team"
  <!-- Files: src/core/templates/workflows/multiagent.ts -->

## 4. Update distribution.md template

- [ ] 4.1 Replace the pseudo-bash "Claude Code Team Setup" section with actionable instructions describing `TeamCreate` (with `team_name` and `description` params), `Agent` spawning (with `name`, `team_name`, `subagent_type`, `isolation`, `prompt` params), and `TaskCreate` (with `subject`, `description`, `activeForm` params)
  <!-- Files: schemas/dispec-driven/templates/distribution.md -->

## 5. Update dispec-driven schema instructions

- [ ] 5.1 Update the `distribution` artifact's `instruction` field to reference real Claude Code team primitives instead of pseudo-bash and to mention `/opsx:multiagent-apply` as the execution step
  <!-- Files: schemas/dispec-driven/schema.yaml -->
- [ ] 5.2 Update the `apply.instruction` field to describe multi-agent execution: reading distribution.md, creating a team, spawning agents with worktree isolation, assigning tasks, and monitoring via TaskList
  <!-- Files: schemas/dispec-driven/schema.yaml -->

## 6. Update tool detection for multiagent-apply

- [ ] 6.1 Add `'multiagent-apply'` to the tool detection workflow list in `src/core/shared/tool-detection.ts` if workflows are enumerated there
  <!-- Files: src/core/shared/tool-detection.ts -->
- [ ] 6.2 Add `'multiagent-apply'` to the init workflow registration in `src/core/init.ts` if workflows are enumerated there
  <!-- Files: src/core/init.ts -->

## 7. Tests

- [ ] 7.1 Add unit test for `getOpsxMultiagentApplySkillTemplate()` verifying it returns valid `SkillTemplate` with correct name, description, and non-empty instructions
  <!-- Files: test/core/templates/multiagent-apply.test.ts -->
- [ ] 7.2 Add unit test for `getOpsxMultiagentApplyCommandTemplate()` verifying it returns valid `CommandTemplate` with correct name, category, tags, and non-empty content
  <!-- Files: test/core/templates/multiagent-apply.test.ts -->
- [ ] 7.3 Update `test/core/templates/skill-templates-parity.test.ts` to include multiagent-apply in parity checks
  <!-- Files: test/core/templates/skill-templates-parity.test.ts -->
- [ ] 7.4 Update `test/core/profiles.test.ts` to verify `ALL_WORKFLOWS` includes `'multiagent-apply'`
  <!-- Files: test/core/profiles.test.ts -->
- [ ] 7.5 Update `test/core/shared/skill-generation.test.ts` to include multiagent-apply in template count assertions
  <!-- Files: test/core/shared/skill-generation.test.ts -->
- [ ] 7.6 Verify existing `test/core/artifact-graph/dispec-driven.test.ts` still passes (no changes expected, regression check)
  <!-- Files: test/core/artifact-graph/dispec-driven.test.ts -->
- [ ] 7.7 Verify the `/opsx:multiagent` skill template no longer references `TodoWrite`
  <!-- Files: test/core/templates/multiagent-apply.test.ts -->
