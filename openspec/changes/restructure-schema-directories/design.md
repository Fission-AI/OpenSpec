## Context

Built-in schemas are currently embedded as TypeScript objects:

```typescript
// src/core/artifact-graph/builtin-schemas.ts
export const SPEC_DRIVEN_SCHEMA: SchemaYaml = {
  name: 'spec-driven',
  version: 1,
  artifacts: [...]
};
```

This doesn't support templates co-located with schemas. The instruction loader (Slice 3) needs templates, and the cleanest approach is self-contained schema directories.

## Goals / Non-Goals

**Goals:**
- Schemas as self-contained directories (schema.yaml + templates/)
- User overrides via XDG data directory
- Simple 2-level resolution (user → package)
- Templates co-located with their schema

**Non-Goals:**
- Shared template fallback (intentionally avoiding complexity)
- Runtime schema compilation
- Schema inheritance

## Decisions

### 1. Directory structure

Each schema is a directory containing `schema.yaml` and `templates/`:

```
<package>/schemas/
├── spec-driven/
│   ├── schema.yaml
│   └── templates/
│       ├── proposal.md
│       ├── design.md
│       ├── spec.md
│       └── tasks.md
└── tdd/
    ├── schema.yaml
    └── templates/
        ├── spec.md
        ├── test.md
        ├── implementation.md
        └── docs.md
```

**Why:** Self-contained like Helm charts. No cross-schema dependencies. Each schema owns its templates.

### 2. Resolution order (2 levels)

```
1. ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml   # User override
2. <package>/schemas/<name>/schema.yaml                    # Built-in
3. Error (not found)
```

**Why:** Simple mental model. User can override entire schema directory or just parts.

### 3. Template path in schema.yaml

The `template` field is relative to the schema's `templates/` directory:

```yaml
# schemas/spec-driven/schema.yaml
artifacts:
  - id: proposal
    template: "proposal.md"  # → schemas/spec-driven/templates/proposal.md
```

**Why:** Paths are relative to the schema, not a global templates directory.

### 4. Resolve package directory via import.meta.url

```typescript
function getPackageSchemasDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // Navigate from src/core/artifact-graph/ to package root
  return path.join(path.dirname(currentFile), '..', '..', '..', 'schemas');
}
```

**Why:** Works in ESM. No hardcoded paths.

### 5. Keep schema.yaml format unchanged

The YAML format stays the same - only the storage location changes:

```yaml
name: spec-driven
version: 1
description: Specification-driven development
artifacts:
  - id: proposal
    generates: "proposal.md"
    template: "proposal.md"
    requires: []
```

**Why:** No breaking changes to schema format. Just moving from TS to YAML files.

## Migration

1. Create `schemas/` directory at package root
2. Convert `SPEC_DRIVEN_SCHEMA` to `schemas/spec-driven/schema.yaml`
3. Convert `TDD_SCHEMA` to `schemas/tdd/schema.yaml`
4. Update `resolveSchema()` to load from directories
5. Remove `builtin-schemas.ts`
6. Update `listSchemas()` to scan directories

## Risks / Trade-offs

**File I/O at runtime:**
- Previously schemas were in-memory objects
- Now requires reading YAML files
- Mitigation: Schemas are small, loaded once per operation

**Package distribution:**
- Must ensure `schemas/` directory is included in npm package
- Add to `files` in package.json

## Open Questions

None.
