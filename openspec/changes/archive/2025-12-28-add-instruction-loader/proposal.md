## Why

Slice 1 (artifact-graph) provides graph operations and state detection. Slice 2 (change-utils) provides change creation. We now need the ability to load templates for artifacts and enrich them with change-specific context so users/agents know what to create next.

## What Changes

- Add template resolution from schema directories (uses structure from `restructure-schema-directories`)
- Add instruction enrichment that injects change context into templates
- Add status formatting for CLI output
- New `instruction-loader` capability

## Dependencies

- Requires `restructure-schema-directories` to be implemented first (schemas as directories with co-located templates)

## Impact

- Affected specs: New `instruction-loader` spec
- Affected code: `src/core/artifact-graph/` (new files)
- Builds on: `artifact-graph` (Slice 1), uses `ArtifactGraph`, `detectCompleted`, `resolveSchema`
