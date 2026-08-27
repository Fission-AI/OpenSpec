## Why

We want to rename `spec-driven` to `openspec-default` to better reflect that it's the standard/default workflow. However, renaming directly would break existing projects that have `schema: spec-driven` in their `openspec/config.yaml`. Adding alias support allows both names to work interchangeably, enabling a smooth transition with no breaking changes.

## What Changes

- Add schema alias resolution in the schema resolver
- `openspec-default` and `spec-driven` will both resolve to the same schema
- The physical directory remains `schemas/spec-driven/` (or could be renamed to `schemas/openspec-default/` with `spec-driven` as the alias)
- All CLI commands and config files accept either name
- No changes required to existing user configs

## Capabilities

### New Capabilities

- `schema-aliases`: Support for schema name aliases so multiple names can resolve to the same schema directory

### Modified Capabilities

<!-- No existing spec-level behavior is changing - this is purely additive -->

## Impact

- `src/core/artifact-graph/resolver.ts` - Add alias resolution logic
- `schemas/` directory - Potentially rename `spec-driven` to `openspec-default`
- Documentation - Update to prefer `openspec-default` while noting `spec-driven` still works
- Default schema constants - Update `DEFAULT_SCHEMA` to `openspec-default`
