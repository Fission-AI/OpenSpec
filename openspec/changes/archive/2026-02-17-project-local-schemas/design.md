## Context

OpenSpec currently resolves schemas from two locations:
1. User override: `~/.local/share/openspec/schemas/<name>/`
2. Package built-in: `<npm-package>/schemas/<name>/`

This change adds a third, highest-priority level: project-local schemas at `./openspec/schemas/<name>/`.

The resolver functions in `src/core/artifact-graph/resolver.ts` currently don't take a `projectRoot` parameter because user and package paths are absolute. To support project-local schemas, we need to pass project root context into the resolver.

## Goals / Non-Goals

**Goals:**
- Enable version-controlled custom workflow schemas
- Allow teams to share schemas via git without per-machine setup
- Maintain backward compatibility with existing resolver API
- Integrate with `config.yaml`'s `schema` field (from project-config change)

**Non-Goals:**
- Schema inheritance or `extends` keyword
- Template-level overrides (partial forks)
- Schema management CLI commands (`openspec schema copy/which/diff/reset`)
- Validation that project-local schema names don't conflict with built-ins (shadowing is intentional)

## Decisions

### Decision 1: Add optional `projectRoot` parameter to resolver functions

**Choice:** Add optional `projectRoot?: string` parameter to resolver functions rather than using `process.cwd()` internally.

**Alternatives considered:**
- Use `process.cwd()` internally: Simpler API but implicit, harder to test, doesn't match existing codebase patterns
- Create separate project-aware functions: No breaking changes but awkward API, callers must compose

**Rationale:** The codebase already follows a pattern where CLI commands get project root via `process.cwd()` and pass it down to functions that need it. Adding an optional parameter maintains backward compatibility while enabling explicit, testable behavior.

**Affected functions:**
```typescript
getSchemaDir(name: string, projectRoot?: string): string | null
listSchemas(projectRoot?: string): string[]
listSchemasWithInfo(projectRoot?: string): SchemaInfo[]
resolveSchema(name: string, projectRoot?: string): SchemaYaml
```

### Decision 2: Resolution order is project → user → package

**Choice:** Project-local schemas have highest priority, then user overrides, then package built-ins.

**Rationale:**
- Project-local should win because it represents team intent (version controlled, shared)
- User overrides still useful for personal experimentation without affecting team
- Package built-ins are the fallback defaults

```
1. ./openspec/schemas/<name>/              # Project-local (highest)
2. ~/.local/share/openspec/schemas/<name>/ # User override
3. <npm-package>/schemas/<name>/           # Package built-in (lowest)
```

### Decision 3: Add `getProjectSchemasDir()` helper function

**Choice:** Create a dedicated function to get the project schemas directory path.

```typescript
function getProjectSchemasDir(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', 'schemas');
}
```

**Rationale:** Matches existing pattern with `getPackageSchemasDir()` and `getUserSchemasDir()`. Keeps path logic centralized.

### Decision 4: Extend `SchemaInfo.source` to include `'project'`

**Choice:** Update the source type from `'package' | 'user'` to `'project' | 'user' | 'package'`.

**Rationale:** Consumers need to distinguish project-local schemas for display purposes (e.g., `schemasCommand` output).

### Decision 5: No special handling for schema name conflicts

**Choice:** If a project-local schema has the same name as a built-in (e.g., `spec-driven`), the project-local version wins. No warning, no error.

**Rationale:** This is intentional shadowing. Teams may want to customize a built-in schema while keeping the same name for familiarity.

## Risks / Trade-offs

### Risk: Confusion when project schema shadows built-in
A team could create `openspec/schemas/spec-driven/` that shadows the built-in, causing confusion when someone expects default behavior.

**Mitigation:** The `openspec schemas` command shows the source of each schema. Users can see `spec-driven (project)` vs `spec-driven (package)`.

### Risk: Missing projectRoot parameter
If callers forget to pass `projectRoot`, project-local schemas won't be found.

**Mitigation:**
- Make the change incrementally, updating call sites that need project-local support
- Existing behavior (user + package only) is preserved when `projectRoot` is undefined

### Trade-off: Optional parameter vs required
Making `projectRoot` optional maintains backward compatibility but means some code paths may silently skip project-local resolution.

**Accepted:** Backward compatibility is more important. The main entry points (CLI commands) will always pass `projectRoot`.

## Implementation Approach

1. **Update `resolver.ts`:**
   - Add `getProjectSchemasDir(projectRoot: string)` function
   - Update `getSchemaDir()` to check project-local first when `projectRoot` provided
   - Update `listSchemas()` to include project schemas when `projectRoot` provided
   - Update `listSchemasWithInfo()` to return `source: 'project'` for project schemas
   - Update `SchemaInfo` type to include `'project'` in source union

2. **Update `artifact-workflow.ts`:**
   - Update `schemasCommand` to pass `projectRoot` and display source labels

3. **Update call sites:**
   - Any existing code that needs project-local resolution should pass `projectRoot`
   - `config.yaml` schema resolution already has access to `projectRoot`
