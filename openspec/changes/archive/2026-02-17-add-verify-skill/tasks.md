# Tasks: Add /opsx:verify Skill

## 1. Skill Template Functions
- [x] 1.1 Add `getVerifyChangeSkillTemplate()` to skill-templates.ts
- [x] 1.2 Add `getOpsxVerifyCommandTemplate()` to skill-templates.ts

## 2. Integration with artifact-experimental-setup
- [x] 2.1 Import verify template functions in artifact-workflow.ts
- [x] 2.2 Add verify to skills array in artifactExperimentalSetupCommand
- [x] 2.3 Add verify to commands array in artifactExperimentalSetupCommand
- [x] 2.4 Add verify to help text output

## 3. Verification (Build & Test)
- [x] 3.1 Verify TypeScript compilation succeeds
- [x] 3.2 Verify all 8 skills are now included (was 7, now 8)
