## Why

The project context defined in `openspec/config.yaml` (tech stack, conventions, cross-platform rules) doesn't reach most skills. Only skills that call `openspec instructions <artifact>` (Continue, FF, New, Onboard) receive it. Skills that call `openspec instructions apply` (Apply, Verify) or don't call instructions at all (Explore, Archive, Bulk-archive, Sync) operate without knowing basic project constraints. Additionally, even skills that do receive `context`, `rules`, and `instruction` describe them with weak language ("guidance", "apply as constraints") rather than treating them as mandatory directives.

Ref: [GitHub Issue #696](https://github.com/Fission-AI/OpenSpec/issues/696)

## What Changes

- Add `context` field to `ApplyInstructions` interface and `generateApplyInstructions()` function, reading it from `readProjectConfig()` — same pattern as `generateInstructions()` already does for artifact instructions
- Add `openspec instructions --context` standalone flag that returns the project context from `config.yaml` without requiring a change name or artifact ID. Supports `--json` for structured output. Incompatible with `--change`, `--schema`, and artifact arguments; error if combined
- Update **all** skill prompts to consume project context and to use mandatory language ("you MUST follow", not "apply as constraints") for `context`, `rules`, and `instruction` fields
- Document the new `--context` flag in CLI documentation

## Capabilities

### New Capabilities
- `cli-instructions-context`: Standalone `--context` flag on the `instructions` command that returns project context without requiring a change or artifact
- `skill-context-enforcement`: Consistent, mandatory language across all skill prompts for how `context`, `rules`, and `instruction` fields must be followed

### Modified Capabilities
- `instruction-loader`: Add `context` field to `ApplyInstructions` so `instructions apply` returns project context alongside tasks and progress

## Impact

- `src/commands/workflow/instructions.ts` — `generateApplyInstructions()` must call `readProjectConfig()` and include `context` in output; `instructionsCommand()` must handle `--context` flag
- `src/commands/workflow/shared.ts` — `ApplyInstructions` interface gets `context` field
- `src/core/templates/skill-templates.ts` — All skill template prompts updated for context consumption and enforcement language
- `.claude/commands/opsx/*.md` — All generated slash command files updated accordingly
- CLI documentation for the `--context` flag
- Tests for instructions command and apply instructions
