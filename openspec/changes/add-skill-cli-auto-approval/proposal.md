## Why

Every generated OpenSpec skill drives the `openspec` CLI (`openspec list`, `status`, `instructions`, …). Today the skill frontmatter never pre-approves those calls, so agents that gate Bash on permission prompt the user on every single `openspec` invocation. The workflow stalls on approvals for a first-party, read-mostly CLI the user already opted into by installing OpenSpec.

The Agent Skills standard already solves this: an `allowed-tools` frontmatter field pre-approves listed tools while a skill is active. We just aren't emitting it.

## What Changes

- Every generated `SKILL.md` gains `allowed-tools: Bash(openspec:*)` in its YAML frontmatter, so agents run `openspec` commands from the skill without prompting. Emitted centrally in `generateSkillContent`, so `init`, `update`, every tool's skills directory, and every current and future skill get it uniformly.
- Claude Code slash commands (`.claude/commands/opsx/*.md`) gain the same field — commands share the skill frontmatter contract, so the same pre-approval applies when a user runs `/opsx:*`.
- Scope is deliberately narrow: only the `openspec` CLI is pre-approved. Per the standard, `allowed-tools` pre-approves rather than restricts — so any other tool a skill or command uses (Read, Write, or arbitrary Bash for builds/tests in `apply`/`onboard`) stays available under the user's normal permission settings, still prompting as before.
- Cross-tool: skills go to every supported tool's skills directory, and `allowed-tools` is an Agent Skills standard field — tools that implement the standard honor it; tools that don't ignore the unknown key. Only the Claude command adapter changes, because no other tool's slash-command format defines a per-command pre-approval field.

## Capabilities

### Modified Capabilities

- `cli-init`: the Skill Generation requirement now specifies the `allowed-tools` pre-approval in generated skill frontmatter.
- `command-generation`: the Claude adapter frontmatter now includes the `allowed-tools` field.

## Impact

- `src/core/shared/allowed-tools.ts` — the shared `OPENSPEC_CLI_ALLOWED_TOOLS` constant (single source for both surfaces).
- `src/core/shared/skill-generation.ts` — emit `allowed-tools` in the SKILL.md frontmatter.
- `src/core/command-generation/adapters/claude.ts` — emit `allowed-tools` in the slash-command frontmatter.
- Tests: regenerated golden skill-content hashes; new assertions that every deployed skill and the Claude command format pre-approve the CLI.
- No behavior change for agents that ignore `allowed-tools`; pure upside for agents that honor it.
