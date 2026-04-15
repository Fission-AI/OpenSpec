## Why

Teams using OpenSpec for product specs and high-level technical standards often need to track changes that don't modify spec-level requirements — bug fixes, documentation refactoring, dependency upgrades, infrastructure work, or implementation-only refactors. The `openspec/changes/` directory is valuable as a repository for technical change descriptions and team review artifacts even when no spec requirements change.

Today, `openspec validate` hard-fails with `CHANGE_NO_DELTAS` when a change has zero delta specs, and the artifact dependency graph blocks `tasks` on `specs` completion (determined by file existence of `specs/**/*.md`). This forces teams to either (a) skip the openspec workflow for non-spec changes, fragmenting their process, or (b) create artificial spec changes just to pass validation. Neither is acceptable.

## What Changes

Add `requireSpecDeltas` as a top-level tri-state setting in `openspec/config.yaml`:
- `"error"` (default when omitted) — current behavior, hard-fail on missing deltas
- `"warn"` — emit a WARNING but pass validation
- `false` — completely suppress the check, no output at all

When set to `"warn"` or `false`, two things change:
1. **Validation**: the `CHANGE_NO_DELTAS` check emits the configured level (or nothing) instead of ERROR
2. **Artifact graph**: `detectCompleted()` synthetically marks `specs` as complete so that `tasks` is unblocked and the propose workflow can proceed without writing spec files

The proposal instruction/template in the schema is static and doesn't adapt to this config. Projects using this feature should add a `rules.proposal` entry in config.yaml to tell the AI that Capabilities sections are optional. This uses the existing rules injection mechanism — no code changes needed.

Example config for specless workflow:
```yaml
schema: spec-driven
requireSpecDeltas: false

rules:
  proposal:
    - "The Capabilities section is optional. If the change has no spec-level requirement changes, leave New Capabilities and Modified Capabilities as 'None'."
```

### Considered and deferred: per-change metadata

A `skipSpecDeltas: true` field in `.openspec.yaml` would allow per-change overrides of the project default. This was considered but deferred because:
- The artifact graph fix (synthetic completion in `detectCompleted()`) would need to read change metadata, adding I/O to a currently simple function
- The project-level config covers the primary use case (teams that routinely make non-spec changes)
- Can be added later without breaking changes

## Capabilities

### New Capabilities

_(none — this extends existing capabilities)_

### Modified Capabilities

- `config-loading`: Add top-level `requireSpecDeltas` (tri-state: `"error"` | `"warn"` | `false`) to the ProjectConfig schema and resilient parsing
- `cli-validate`: Respect `requireSpecDeltas` when evaluating the `CHANGE_NO_DELTAS` check
- `artifact-graph`: Synthetically mark `specs` as complete in `detectCompleted()` when `requireSpecDeltas` is not `"error"`
- `cli-artifact-workflow`: Add `"skipped"` status to status display for synthetically completed artifacts (indicator `[~]`, dim color, `"skipped"` in JSON)

## Non-goals

- Making the `specs` artifact disappear from `openspec status` — it remains visible as `[~] skipped`
- Changing the `ChangeSchema` Zod validation for `deltas.min(1)` — that validates the proposal's Capabilities section, not spec files
- Dynamic instruction adaptation — the schema's proposal instruction is static; projects use `rules` config to adjust AI guidance
- Per-change override via `.openspec.yaml` — deferred for a future change

## Impact

- `src/core/project-config.ts` — extend `ProjectConfigSchema` with optional `requireSpecDeltas`
- `src/core/validation/validator.ts` — `validateChangeDeltaSpecs()` respects the tri-state setting
- `src/commands/validate.ts` — read project config and pass setting to the validator
- `src/core/artifact-graph/state.ts` — `detectCompleted()` synthetically marks `specs` done when config allows
- `src/core/validation/constants.ts` — add message for the warning case
