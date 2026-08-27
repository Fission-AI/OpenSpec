## 1. Add Skill Template

- [x] 1.1 Add `getOnboardSkillTemplate()` function to `src/core/templates/skill-templates.ts` with full onboarding instruction text covering all phases (preflight, welcome, task selection, explore demo, change creation, proposal, specs, design, tasks, apply, archive, recap)
- [x] 1.2 Include codebase analysis instructions for suggesting starter tasks (TODO/FIXME, missing error handling, missing tests, type:any, console.log, missing validation)
- [x] 1.3 Include narration pattern instructions (EXPLAIN → DO → SHOW → PAUSE at key transitions)
- [x] 1.4 Include scope guardrail instructions for redirecting users away from overly large tasks
- [x] 1.5 Include graceful exit handling instructions (user stops mid-way, user just wants command reference)

## 2. Add Command Template

- [x] 2.1 Add `getOpsxOnboardCommandTemplate()` function to `src/core/templates/skill-templates.ts` returning CommandTemplate with same instruction content as skill

## 3. Register Templates

- [x] 3.1 Add onboard skill to `getSkillTemplates()` array in `src/core/shared/skill-generation.ts` with dirName `openspec-onboard`
- [x] 3.2 Add onboard command to `getCommandTemplates()` array in `src/core/shared/skill-generation.ts` with id `onboard`

## 4. Verify

- [x] 4.1 Run `pnpm run build` to ensure TypeScript compiles
- [x] 4.2 Test skill generation by running `openspec init` in a test directory and verifying onboard skill/command files are created
