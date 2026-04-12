## Why

`openspec/config.yaml` lets teams inject project context and per-artifact rules into artifact generation, but there is no equivalent mechanism for workflow skills (explore, propose, apply, etc.). Teams have no way to pass project-specific conventions into skill behaviour without editing the seeded skill files directly — which get overwritten on `openspec update`.

## What Changes

- **New CLI command** `openspec guidance <skill-name> [--json]`: reads `openspec/config.yaml` and returns the shared project `context` plus any skill-specific instruction string from a new `skills:` key.
- **New `skills:` key in `config.yaml`**: a free-form map of skill name → instruction string. All keys are accepted without validation.
- **Guidance step in all seeded workflow templates**: every workflow skill (explore, propose, apply, archive, verify, onboard, continue, ff-change) calls `openspec guidance <skill-name> --json` as Step 1. The returned `context` is applied as binding project constraints throughout the session; the returned `instructions` override or extend the skill's default behaviour for the session. If the command fails or returns null fields, the skill continues normally.
- **Updated seeded `config.yaml` template**: the scaffold from `openspec init` gains a commented-out `skills:` section so the feature is discoverable on first setup.
- **Updated user-facing docs**: `docs/customization.md` documents the `skills:` config key; `docs/cli.md` documents the `openspec guidance` command.
- **Updated specs**: `skill-guidance-command`, `config-loading`, `explore-skill-workflow`, and `propose-skill-workflow` specs updated to reflect OpenSpec CLI identity and precise field roles.

## Capabilities

### New Capabilities

- `skill-guidance-command`: The `openspec guidance <skill-name>` CLI command — reads `openspec/config.yaml` and returns `{ skill, context, instructions }`. `context` is the shared project context field; `instructions` is the value of `skills.<skill-name>` if present, null otherwise.
- `explore-skill-workflow`: Guidance fetch as Step 1 in the numbered Steps sequence, before document creation or any other action. `context` = binding project constraints applied throughout the session (not written to the exploration document); `instructions` = workflow-specific overrides for the session.
- `propose-skill-workflow`: Guidance fetch as Step 1, before flag parsing, exploration doc scanning, or any other action. `context` = binding project constraints; `instructions` = workflow-specific overrides. Includes requirements for OpenSpec branding in generated templates (CLI binary, display names, skill metadata).

### Modified Capabilities

- `config-loading`: `ProjectConfigSchema` and `readProjectConfig` gain a `skills` field — a `Record<string, string>` map of skill name to instruction string. Unknown keys accepted without validation.

## Impact

- `src/commands/guidance.ts` — new command, wired into CLI
- `src/core/project-config.ts` — schema and parser updated for `skills:` field
- `src/core/templates/workflows/explore.ts` — guidance as Step 1 (skill + command templates)
- `src/core/templates/workflows/propose.ts` — guidance as Step 1 (skill + command templates)
- `src/core/templates/workflows/apply-change.ts` — guidance as Step 1
- `src/core/templates/workflows/archive-change.ts` — guidance as Step 1
- `src/core/templates/workflows/verify-change.ts` — guidance as Step 1
- `src/core/templates/workflows/onboard.ts` — guidance as Step 1
- `src/core/templates/workflows/continue-change.ts` — guidance as Step 1
- `src/core/templates/workflows/ff-change.ts` — guidance as Step 1
- `src/core/init.ts` — seeded `config.yaml` template updated with commented `skills:` section
- `docs/customization.md` — new "Skill-Specific Instructions" section documenting `skills:` key
- `docs/cli.md` — new entry for `openspec guidance` command
- `openspec/specs/skill-guidance-command/spec.md` — new spec
- `openspec/specs/explore-skill-workflow/spec.md` — new spec
- `openspec/specs/propose-skill-workflow/spec.md` — new spec
- `openspec/specs/config-loading/spec.md` — delta: `skills:` field requirement
- No breaking changes to existing config files; `skills:` is optional and additive
