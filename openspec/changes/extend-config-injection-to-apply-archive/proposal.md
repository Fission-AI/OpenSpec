## Why

Project config currently applies `context` and `rules` only when generating artifact instructions. Teams lose those same project constraints once they move into `/opsx:apply` and `/opsx:archive`, which makes the workflow inconsistent and forces users to restate guidance that is already present in `openspec/config.yaml`.

We should reuse the existing config model so project-level guidance stays available across the most common post-artifact actions, without requiring a new config format or changing existing artifact behavior.

## What Changes

- Extend `context` injection so the existing project context is available in apply instructions and archive workflow instructions, not only artifact instructions.
- Extend `rules` injection so the existing `rules` object can also provide workflow-specific guidance for `apply` and `archive` while preserving current artifact-targeted behavior.
- Keep existing artifact instruction behavior unchanged and backward compatible.
- Preserve the current archive command safety checks and prompts; this change is about instruction surfaces, not new archive command enforcement semantics.
- Do not expand this change to `verify` or `sync`; this proposal only covers `apply` and `archive`.

### Config Structure

- Continue using the existing top-level `context` field, and inject that project context into `apply` and `archive` instruction surfaces in addition to artifact instructions.
- Reserve `rules.apply` for workflow guidance injected into `/opsx:apply` instructions.
- Reserve `rules.archive` for workflow guidance injected into `/opsx:archive` instructions.
- Keep existing artifact keys such as `rules.specs`, `rules.design`, and `rules.tasks` unchanged for backward compatibility.

### Validation and Error Handling

- Extend config validation so reserved workflow targets are accepted alongside artifact keys.
- Keep malformed or unknown rule targets as validation errors with actionable messages so users can correct `openspec/config.yaml` before running workflow instructions.
- Apply artifact rules only to matching artifact instructions, and apply workflow rules only to their corresponding workflow instruction surfaces.
- Surface validation failures to callers of apply/archive instruction generation and cover those cases with unit and integration tests.

## Capabilities

### New Capabilities
- `cli-archive-instructions`: `openspec instructions archive` becomes a valid CLI call, returning a JSON object with `template`, `context`, and `rules` fields analogous to apply instructions.

### Modified Capabilities
- `context-injection`: extend project context injection from artifact-only instructions to apply and archive instruction surfaces
- `rules-injection`: extend the existing rules model so it can guide apply and archive in addition to matching artifacts; update generated config examples to document `rules.apply` and `rules.archive` as valid targets
- `cli-artifact-workflow`: include injected context and rules in apply instruction output; update apply skill template to consume and apply context/rules from instruction JSON
- `opsx-archive-skill`: include injected context and rules in archive workflow guidance while preserving current archive readiness checks and prompts
- `opsx-bulk-archive-skill`: fetch archive instructions once at workflow start to obtain project context and rules as constraints for the entire batch

## Impact

- `src/core/project-config.ts` and related validation will need to recognize workflow targets while remaining backward compatible for artifact keys.
- `src/commands/workflow/instructions.ts` and related types will need to surface injected context/rules for apply instructions, and a new archive instruction generation path will be added.
- `src/cli/index.ts` will need an `archive` branch in the `instructions` command handler to route to the new archive instruction path.
- `src/core/templates/workflows/apply-change.ts`, `archive-change.ts`, and `bulk-archive-change.ts` will need to consume `context` and `rules` from instruction output and treat them as AI constraints.
- `src/core/config-prompts.ts` will need updated comments and examples to show `rules.apply` and `rules.archive` as valid targets alongside artifact keys.
- `docs/opsx.md`, config examples, and relevant specs/tests will need updates so the documented behavior matches the new instruction surfaces.
- User-facing docs should include examples showing `rules.apply` and `rules.archive` alongside existing artifact rules, plus migration guidance for teams deciding when to keep artifact-specific guidance versus move workflow guidance into phase-specific targets.
