## Why

When proposing a change, the skill scans `openspec/explorations/` to find a matching exploration doc. For users who already know exactly which exploration doc to use — or whose doc doesn't match by filename/header — this grep-and-prompt step is friction. A direct parameter lets users skip it entirely and provide the path explicitly.

## What Changes

- The `/enpalspec:propose` skill accepts an optional `--exploration <path>` parameter in the command argument string
- When the parameter is provided, the skill reads that file directly instead of scanning `openspec/explorations/`
- The exploration scan and no-match gate (step 3) is skipped entirely when the parameter is given
- The rest of the flow (seeding artifacts from the doc) is unchanged

## Capabilities

### New Capabilities

- `propose-exploration-param`: Allows callers of `/enpalspec:propose` to explicitly pass an exploration document path, bypassing the directory scan and match-heuristic step

### Modified Capabilities

- `propose-skill-workflow`: The propose skill's exploration gate behavior changes — it now supports an explicit path that short-circuits the scan

## Impact

- `src/core/templates/workflows/propose.ts` — both `getOpsxProposeSkillTemplate()` and `getOpsxProposeCommandTemplate()` updated to document the new parameter and amend step 3 logic
- `openspec/specs/propose-skill-workflow/spec.md` — existing requirement modified to reflect the `--exploration` bypass
