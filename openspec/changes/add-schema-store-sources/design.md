## Context

OpenSpec currently resolves one active planning root. That root owns `openspec/specs`, `openspec/changes`, project configuration, and project-local schemas. A config-only consumer repository may redirect planning to a registered Store with `store: <id>`, but schema resolution then follows the planning Store as part of the same root.

The department use case needs two independent roles:

- a planning root that owns specs, changes, and archives; and
- a schema root that owns reusable workflow schemas and templates.

Both roots can already be represented by registered Store checkouts. Store checkout synchronization deliberately remains a normal Git responsibility. The design must therefore reuse Store identity and registry resolution, preserve synchronous schema parsing, and avoid the Git fetch, lockfile, cache, and integrity machinery of a separate remote-source subsystem.

## Goals / Non-Goals

**Goals:**

- Allow a consumer project to select one registered Store as its schema source without redirecting planning.
- Allow a project to combine local planning, a planning Store, and a different schema Store.
- Let the consumer restrict which schemas from the schema Store participate in discovery and resolution.
- Keep current schema behavior byte-compatible when `schemaStore` is absent.
- Resolve Store IDs once through the existing registry and pass canonical local paths to synchronous schema code.
- Produce clear, machine-readable diagnostics for invalid declarations and unavailable Store checkouts.

**Non-Goals:**

- Fetching, cloning, pulling, committing, or pushing Store repositories.
- Pinning a schema Store to a commit per consumer project.
- Content-addressed caches, schema lockfiles, or bundle integrity hashes.
- Combining schemas from multiple schema Stores in one consumer.
- Glob matching beyond the special all-visible token `*`.
- Schema merging or inheritance across roots.
- Changing how Store Git drift is detected or repaired.

## Decisions

### 1. Use role-specific Store declarations

The existing `store` field continues to select the planning Store. A new `schemaStore` field selects the schema Store:

```yaml
store: department-planning
schema: qeda-sdd
schemaStore: department-schemas
```

Scalar `schemaStore` is shorthand for the object form with every schema visible:

```yaml
schemaStore:
  id: department-schemas
  schemas:
    - "*"
```

This is preferred over overloading `store` with a mode flag because the configuration states both roles directly and remains reproducible for humans, agents, and CI.

Alternative considered: a command-only `--schema-store` flag. Rejected as the primary contract because every lifecycle command would need the flag and omissions could resolve a different schema. A future CLI override can be added independently if a concrete use case appears.

Alternative considered: a general array of mounted Stores with arbitrary roles. Rejected because the current requirement has exactly two roles and a generalized mount graph would add ordering, conflict, and diagnostic complexity without a demonstrated need.

### 2. Normalize one strict visibility model

The normalized declaration is:

```ts
interface SchemaStoreDeclaration {
  id: string;
  schemas: '*' | string[];
}
```

Rules:

- a scalar declaration normalizes to `{ id, schemas: '*' }`;
- an object without `schemas` also defaults to `'*'`;
- `schemas: ["*"]` is the explicit all-visible form;
- otherwise `schemas` is a non-empty, duplicate-free list of exact valid schema names;
- `*` cannot be combined with names;
- empty lists, unsupported fields, invalid Store IDs, invalid schema names, and non-string values are invalid declarations.

The visibility filter applies only to schemas contributed by the schema Store. User and package schemas retain their existing behavior. A hidden Store schema does not participate in discovery, resolution, shadow reporting, or suggestions.

Exact names are preferred over general globs because schema names are already a finite discoverable set and exact matching avoids platform-dependent pattern behavior.

### 3. Fail closed for an explicitly invalid or unavailable schema Store

Generic project-config loading remains resilient and warns field-by-field. Schema context resolution additionally reads the declaration as an authority-bearing field:

- malformed `schemaStore` fails schema-context resolution instead of silently falling back;
- an unknown Store ID points to `openspec store register`;
- missing or mismatched Store identity points to `openspec store doctor <id>`;
- a missing `openspec/schemas` directory is treated as an empty schema Store, so a newly created Store can be populated incrementally;
- a configured schema that is absent or hidden reports the visible Store schemas and normal fallback candidates.

Failing closed prevents a typo in `schemaStore` from silently selecting a user or package schema with the same name.

### 4. Resolve Store registry state before synchronous schema lookup

Store registry APIs are asynchronous, while schema directory loading is intentionally synchronous. Root selection already occurs asynchronously for workflow commands.

Introduce a resolved command context with three explicit ownership locations:

```ts
interface ResolvedOpenSpecRoot {
  path: string;          // planning root
  consumerRoot: string;  // config owner
  schemaContext: {
    root: string;        // consumer root or registered schema Store root
    source: 'project' | 'store';
    storeId?: string;
    visibleSchemas: '*' | readonly string[];
  };
  // existing changes/specs/archive fields
}
```

Resolution sequence:

1. Canonicalize the command start path.
2. Find the consumer repository containing the controlling config, when present.
3. Resolve the planning root using existing `--store`, local-root, `store:`, and global-default precedence.
4. Read `schemaStore` from the consumer root, falling back to the planning root only when no consumer root exists.
5. Resolve the schema Store ID through the existing registry and validate Store identity.
6. Return canonical local paths and normalized visibility to downstream synchronous schema resolution.

Schema-only commands use the same schema-context resolver rather than duplicating registry lookup.

Alternative considered: make `getSchemaDir`, `resolveSchema`, and every caller asynchronous. Rejected because registry lookup is the only asynchronous requirement and can be completed at the command boundary.

Operational configuration remains backward-compatible with Planning Store
selection. When planning is redirected and the consumer does not declare
`schemaStore`, commands continue to use the Planning Store's configuration.
When the consumer does declare `schemaStore`, its configuration overlays the
Planning Store configuration: consumer-authored schema choices and rules can
target the selected schema authority, while omitted fields such as
`references`, context, and operation guidance remain inherited from the
Planning Store.

### 5. Treat a schema Store as the project schema layer

When `schemaStore` is configured, its visible schemas replace the consumer repository's project-local schema layer. Resolution precedence becomes:

1. visible schema Store schema;
2. user schema;
3. package schema.

When `schemaStore` is absent, precedence remains:

1. consumer/project-local schema;
2. user schema;
3. package schema.

The planning Store is never searched for schemas merely because it owns the active changes. If a project wants the same Store for both roles, it declares the same ID in `store` and `schemaStore`.

This avoids implicit coupling and makes the schema authority visible in consumer configuration.

Because the Store replaces the consumer-local project layer, `schema init` and
`schema fork` MUST NOT write into the consumer repository while `schemaStore`
is configured. Such files would be immediately invisible to resolution.
Instead, both commands fail before mutation, identify the configured Store, and
direct the user to edit that Store or remove `schemaStore` before creating a
project-local schema.

### 6. Report Store provenance consistently

Schema discovery records extend the source union with `store`. Store-backed results include the Store ID and canonical schema directory path.

The following surfaces use the same resolved schema context and visibility:

- `openspec schemas`;
- `openspec schema which <name>`;
- `openspec schema which --all`;
- template reporting;
- schema validation;
- change creation, status, instructions, apply, verify, and archive.

Human output labels Store schemas with the Store ID. JSON output adds `source: "store"` and `storeId` without changing existing fields for project, user, or package sources.

### 7. Keep Git synchronization external

The schema Store is an ordinary registered Store checkout. OpenSpec reads its current working tree and never contacts its remote during normal commands. Teams update it with normal Git operations and can use existing Store doctor output to inspect Git drift.

This is an explicit trade-off: consumers do not get per-project commit pinning, but the implementation remains aligned with the existing Store contract and the stated departmental workflow.

## Risks / Trade-offs

- **One checkout serves every consumer on a machine** → Document that updating the registered schema Store changes its schemas for all local consumers; teams that need version isolation must register differently named Store checkouts.
- **A dirty schema Store can affect consumers immediately** → Preserve normal Git ownership and surface the canonical Store/path in `schema which`; do not imply OpenSpec has pinned or synchronized it.
- **Root context still touches workflow commands** → Pass one resolved schema context through existing command boundaries and cover local, planning-Store, and split-Store journeys with integration tests.
- **Visibility can hide a schema that remains available elsewhere** → Treat the Store filter as source-specific, label the winning source, and include available-source diagnostics.
- **Invalid authority could otherwise fall back silently** → Strict schema-context resolution fails closed whenever the `schemaStore` field is present but unusable.
- **Windows path and case behavior differs** → Use existing canonicalization and Store registry helpers, `path.join`, and platform-neutral temporary-directory tests.

## Migration Plan

1. Add parsing and normalization while leaving absent-field behavior unchanged.
2. Add schema-context resolution and tests without changing existing command output for non-users.
3. Route schema consumers through the resolved context and add Store provenance.
4. Document creation, registration, Git update, visibility, and split planning/schema examples.
5. Release as an additive experimental capability. Rollback consists of removing `schemaStore`; planning and schema resolution then use their previous roots and precedence.

## Open Questions

None for the initial scope. Multiple schema Stores, CLI overrides, per-consumer commit pinning, and pattern visibility require separate proposals.
