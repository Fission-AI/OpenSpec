## Why

Every generated OpenSpec skill drives the `openspec` CLI (`openspec list`, `status`, `instructions`, …). Today the skill frontmatter never pre-approves those calls, so agents that gate Bash on permission prompt the user on every single `openspec` invocation. The workflow stalls on approvals for a first-party, read-mostly CLI the user already opted into by installing OpenSpec.

The Agent Skills standard already solves this: an `allowed-tools` frontmatter field pre-approves listed tools while a skill is active. We just aren't emitting it.

## What Changes

- Every generated `SKILL.md` gains `allowed-tools: Bash(openspec:*)` in its YAML frontmatter, so agents run `openspec` commands from the skill without prompting.
- Scope is deliberately narrow: only the `openspec` CLI is pre-approved. Per the standard, `allowed-tools` pre-approves rather than restricts — so any other tool a skill uses (Read, Write, or arbitrary Bash for builds/tests in `apply`/`onboard`) stays available under the user's normal permission settings, still prompting as before.
- Emitted centrally in `generateSkillContent`, so `init`, `update`, and every current and future skill get it uniformly.

## Capabilities

### Modified Capabilities

- `cli-init`: the Skill Generation requirement now specifies the `allowed-tools` pre-approval in generated skill frontmatter.

## Impact

- `src/core/shared/skill-generation.ts` — emit `allowed-tools: Bash(openspec:*)` in the frontmatter; add the `SKILL_ALLOWED_TOOLS` constant.
- `test/core/templates/skill-templates-parity.test.ts` — regenerated golden content hashes; new test asserting every deployed skill pre-approves the CLI.
- No behavior change for agents that ignore `allowed-tools`; pure upside for agents that honor it.
