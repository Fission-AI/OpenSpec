# Change: Add /opsx:verify Skill

## Why

Users need a way to validate that their implementation actually matches what was requested before archiving a change. Currently, there's no systematic way to check:
- Whether all tasks are truly complete
- Whether the implementation covers all spec requirements and scenarios
- Whether the implementation follows the design decisions
- Whether the code is coherent and makes sense

A user requested: "Can we get a :verify that will ensure that the implementation matches what was requested?"

## What Changes

- Add `getVerifyChangeSkillTemplate()` function to `skill-templates.ts`
- Add `getOpsxVerifyCommandTemplate()` function to `skill-templates.ts`
- Integrate verify skill into `artifactExperimentalSetupCommand` in `artifact-workflow.ts`
- Add verify to the skills and commands arrays in the setup command
- Update help text to include `/opsx:verify` in the list of available commands
- Create `opsx-verify-skill` capability spec

## Verification Dimensions

The skill verifies across three dimensions:

1. **Completeness** - Are all tasks done? Are all specs addressed?
2. **Correctness** - Does the implementation match specs? Are scenarios covered?
3. **Coherence** - Does the implementation make sense? Does it follow design.md?

## Output Format

Produces a prioritized report with:
- Summary scorecard (tasks, specs, design adherence)
- Critical issues first (must fix before archive)
- Warnings second (should fix)
- Suggestions third (nice to have)
- Actionable fix recommendations for each issue

## Impact

- Affected specs: New `opsx-verify-skill` spec
- Affected code:
  - `src/core/templates/skill-templates.ts` - Added 2 new template functions
  - `src/commands/artifact-workflow.ts` - Integrated verify into experimental setup
- Generated artifacts: When users run `openspec artifact-experimental-setup`:
  - Creates `.claude/skills/openspec-verify-change/SKILL.md`
  - Creates `.claude/commands/opsx/verify.md`
- Related skills: Works alongside `/opsx:apply` and before `/opsx:archive`
