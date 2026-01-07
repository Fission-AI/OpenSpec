## Why

With per-change schema metadata in place (see `add-per-change-schema-metadata`), agents can now create changes with different workflow schemas. However, the agent skills are still hardcoded to `spec-driven` artifacts and don't offer schema selection to users.

## What Changes

**Scope: Experimental artifact workflow agent skills**

**Depends on:** `add-per-change-schema-metadata` (must be implemented first)

- Update `openspec-new-change` skill to prompt user for schema selection
- Update `openspec-continue-change` skill to work with any schema's artifacts
- Update `openspec-apply-change` skill to handle schema-specific task structures
- Add schema descriptions to help users choose appropriate workflow

## Capabilities

### Modified Capabilities
- `cli-artifact-workflow`: Agent skills support dynamic schema selection

## Impact

- **Affected code**: `src/core/templates/skill-templates.ts`
- **User experience**: Users can choose TDD, spec-driven, or future workflows when starting a change
- **Agent behavior**: Skills read artifact list from schema rather than hardcoding
- **Backward compatible**: Default remains `spec-driven` if user doesn't choose
