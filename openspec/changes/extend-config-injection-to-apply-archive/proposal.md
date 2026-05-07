## Why

Project config currently applies `context` and `rules` only when generating artifact instructions. Teams lose those same project constraints once they move into `/opsx:apply` and `/opsx:archive`, which makes the workflow inconsistent and forces users to restate guidance that is already present in `openspec/config.yaml`.

We should reuse the existing config model so project-level guidance stays available across the most common post-artifact actions, without requiring a new config format or changing existing artifact behavior.

## What Changes

- Extend `context` injection so the existing project context is available in apply instructions and archive workflow instructions, not only artifact instructions.
- Extend `rules` injection so the existing `rules` object can also provide workflow-specific guidance for `apply` and `archive` while preserving current artifact-targeted behavior.
- Keep existing artifact instruction behavior unchanged and backward compatible.
- Preserve the current archive command safety checks and prompts; this change is about instruction surfaces, not new archive command enforcement semantics.
- Do not expand this change to `verify` or `sync`; this proposal only covers `apply` and `archive`.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `context-injection`: extend project context injection from artifact-only instructions to apply and archive instruction surfaces
- `rules-injection`: extend the existing rules model so it can guide apply and archive in addition to matching artifacts
- `cli-artifact-workflow`: include injected context and rules in apply instruction output
- `opsx-archive-skill`: include injected context and rules in archive workflow guidance while preserving current archive readiness checks and prompts

## Impact

- `src/core/project-config.ts` and related validation will need to recognize workflow targets while remaining backward compatible for artifact keys.
- `src/commands/workflow/instructions.ts` and related types will need to surface injected context/rules for apply instructions.
- Archive workflow templates and supporting generation paths will need to consume injected context/rules for `/opsx:archive` guidance.
- `src/core/config-prompts.ts`, config docs, and relevant specs/tests will need updates so the documented behavior matches the new instruction surfaces.
