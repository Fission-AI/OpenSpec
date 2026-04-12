## Why

`openspec/config.yaml` lets teams inject project context and per-artifact rules into artifact generation, but there is no equivalent mechanism for workflow skills (explore, propose, apply, etc.). Teams have no way to pass project-specific conventions into skill behaviour without editing the seeded skill files directly — which get overwritten on `openspec update`.

## What Changes

- **New CLI command** `openspec guidance <skill-name> [--json]`: reads `openspec/config.yaml` and returns the shared project `context` plus any skill-specific instruction string from a new `skills:` key.
- **New `skills:` key in `config.yaml`**: a free-form map of skill name → instruction string. All keys are accepted without validation.
- **Guidance step in all seeded workflow templates**: every workflow skill (explore, propose, apply, archive, verify, onboard, continue, ff-change) calls `openspec guidance <skill-name> --json` as Step 1. If the command exits non-zero, cannot be found, or its output cannot be parsed, the skill logs a warning with the command, skill name, and error details and continues without applying any guidance. If the command succeeds but one or both fields are null, the skill silently applies only the non-null field(s).
- **Updated seeded `config.yaml` template**: the scaffold from `openspec init` gains a commented-out `skills:` section so the feature is discoverable on first setup.
- **Updated user-facing docs**: `docs/customization.md` documents the `skills:` config key; `docs/cli.md` documents the `openspec guidance` command.
- **New and updated specs**: guidance fetch requirement added to all workflow skill specs — new specs for `explore-skill-workflow`, `propose-skill-workflow`, `apply-skill-workflow`, `continue-skill-workflow`, and `ff-change-skill-workflow` (none existed in OpenSpec); delta specs for `opsx-archive-skill`, `opsx-verify-skill`, and `opsx-onboard-skill` (guidance step added to existing specs); delta spec for `config-loading` (`skills:` field); new spec for `skill-guidance-command`.

## Capabilities

### New Capabilities

- `skill-guidance-command`: The `openspec guidance <skill-name>` CLI command — reads `openspec/config.yaml` and returns `{ skill, context, instructions }`. `skill` is an echo of the input argument. `context` is the shared project context field (e.g. "Always use TypeScript strict mode; follow the Google Style Guide"); `instructions` is the value of `skills.<skill-name>` if present, null otherwise.
- `explore-skill-workflow`: Guidance fetch as Step 1 in the numbered Steps sequence, before document creation or any other action. `context` = persistent project-level constraints applied throughout the session, never written to the exploration document (e.g. "All code must target Node.js ≥20"); `instructions` = session overrides specific to the explore workflow (e.g. "always create a decision log entry for each Q&A round").
- `propose-skill-workflow`: Guidance fetch as Step 1, before flag parsing, exploration doc scanning, or any other action. `context` = persistent project-level constraints; `instructions` = session overrides specific to the propose workflow (e.g. "include cost estimates in every proposal"; "tag proposals affecting the public API with `api-impact: true`").
- `apply-skill-workflow`: Guidance fetch as Step 1.
- `continue-skill-workflow`: Guidance fetch as Step 1.
- `ff-change-skill-workflow`: Guidance fetch as Step 1.

### Modified Capabilities

- `config-loading`: `ProjectConfigSchema` and `readProjectConfig` gain a `skills` field — a `Record<string, string>` map of skill name to instruction string. All keys are accepted without validation.
- `opsx-archive-skill`: Guidance fetch added as Step 1.
- `opsx-verify-skill`: Guidance fetch added as Step 1.
- `opsx-onboard-skill`: Guidance fetch added as Step 1.

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
- `openspec/specs/apply-skill-workflow/spec.md` — new spec
- `openspec/specs/continue-skill-workflow/spec.md` — new spec
- `openspec/specs/ff-change-skill-workflow/spec.md` — new spec
- `openspec/specs/config-loading/spec.md` — delta: `skills:` field requirement
- `openspec/specs/opsx-archive-skill/spec.md` — delta: guidance step requirement
- `openspec/specs/opsx-verify-skill/spec.md` — delta: guidance step requirement
- `openspec/specs/opsx-onboard-skill/spec.md` — delta: guidance step requirement
- No breaking changes to existing config files; `skills:` is optional and additive
