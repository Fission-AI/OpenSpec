## Why

OpenSpec already documents `GIVEN` as part of scenario steps, but the default spec template and generated instructions teach agents to write only `WHEN`/`THEN`. This creates inconsistent specs and weakens precondition clarity for generated requirements.

## What Changes

- Make `GIVEN` part of the default scenario guidance for newly generated specs and help examples.
- Keep existing specs valid; this change does not add parser enforcement or validation warnings.
- Clarify that `GIVEN` captures initial state or preconditions, while `WHEN` captures the trigger and `THEN` captures observable outcomes.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `openspec-conventions`: scenario guidance should make `GIVEN` the normal first step for generated scenario examples while remaining non-breaking for existing specs.

## Impact

- `schemas/spec-driven/templates/spec.md`
- `schemas/spec-driven/schema.yaml`
- `schemas/workspace-planning/schema.yaml`
- `src/core/validation/constants.ts`
- `src/core/templates/workflows/onboard.ts`
- `src/core/templates/workflows/sync-specs.ts`
- `src/commands/schema.ts`
- `test/core/templates/skill-templates-parity.test.ts`
