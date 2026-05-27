## Why

Currently, built-in schemas are embedded as TypeScript objects in `builtin-schemas.ts`. This works for schemas but doesn't support co-located templates. To enable self-contained schema packages (schema + templates together), we need to restructure schemas as directories.

## What Changes

- **BREAKING (internal):** Move built-in schemas from embedded TS objects to actual directory structure
- Schemas become directories containing `schema.yaml` + `templates/`
- Update `resolveSchema()` to load from directory structure
- Remove `builtin-schemas.ts` (replaced by file-based schemas)
- Update resolution to check user dir → package dir

## Impact

- Affected specs: `artifact-graph` (schema resolution changes)
- Affected code:
  - Remove `src/core/artifact-graph/builtin-schemas.ts`
  - Update `src/core/artifact-graph/resolver.ts`
  - Add `schemas/` directory at package root
- No external API changes (resolution still returns `SchemaYaml`)
