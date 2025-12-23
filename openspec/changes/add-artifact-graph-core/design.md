## Context

This implements "Slice 1: What's Ready?" from the artifact POC analysis. The core insight is using the filesystem as a database - artifact completion is detected by file existence, making the system stateless and version-control friendly.

This module will coexist with the current OpenSpec system as a parallel capability, potentially enabling future migration or integration.

## Goals / Non-Goals

**Goals:**
- Pure dependency graph logic with no side effects
- Stateless state detection (rescan filesystem each query)
- Support glob patterns for multi-file artifacts (e.g., `specs/*.md`)
- Load artifact definitions from YAML schemas
- Calculate topological build order
- Determine "ready" artifacts based on dependency completion

**Non-Goals:**
- CLI commands (Slice 4)
- Multi-change management (Slice 2)
- Template resolution and enrichment (Slice 3)
- Agent integration or Claude commands
- Replacing existing OpenSpec functionality

## Decisions

### Decision: Filesystem as Database
Use file existence for state detection rather than a separate state file.

**Rationale:**
- Stateless - no state corruption possible
- Git-friendly - state derived from committed files
- Simple - no sync issues between state file and actual files

**Alternatives considered:**
- JSON/SQLite state file: More complex, sync issues, not git-friendly
- Git metadata: Too coupled to git, complex implementation

### Decision: Kahn's Algorithm for Topological Sort
Use Kahn's algorithm for computing build order.

**Rationale:**
- Well-understood, O(V+E) complexity
- Naturally detects cycles during execution
- Produces a stable, deterministic order

### Decision: Glob Pattern Support
Support glob patterns like `specs/*.md` in artifact `generates` field.

**Rationale:**
- Allows multiple files to satisfy a single artifact requirement
- Common pattern for spec directories with multiple files
- Uses standard glob syntax

### Decision: Immutable State Sets
Represent `ArtifactState` as immutable Sets (completed, inProgress, failed).

**Rationale:**
- Functional style, easier to reason about
- State derived fresh each query, no mutation needed
- Clear separation between graph structure and runtime state

### Decision: Zod for Schema Validation
Use Zod for validating YAML schema structure and deriving TypeScript types.

**Rationale:**
- Already a project dependency (v4.0.17) used in `src/core/schemas/`
- Type inference via `z.infer<>` - single source of truth for types
- Runtime validation with detailed error messages
- Consistent with existing project patterns (`base.schema.ts`, `config-schema.ts`)

**Alternatives considered:**
- Manual validation: More code, error-prone, no type inference
- JSON Schema: Would require additional dependency, less TypeScript integration
- io-ts: Not already in project, steeper learning curve

## Data Structures

**Zod Schemas (source of truth):**

```typescript
import { z } from 'zod';

// Artifact definition schema
export const ArtifactSchema = z.object({
  id: z.string().min(1, 'Artifact ID is required'),
  generates: z.string().min(1),      // e.g., "proposal.md" or "specs/*.md"
  description: z.string(),
  template: z.string(),              // path to template file
  requires: z.array(z.string()).default([]),
});

// Full schema YAML structure
export const SchemaYamlSchema = z.object({
  name: z.string().min(1, 'Schema name is required'),
  version: z.number().int().positive(),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1, 'At least one artifact required'),
});

// Derived TypeScript types
export type Artifact = z.infer<typeof ArtifactSchema>;
export type SchemaYaml = z.infer<typeof SchemaYamlSchema>;
```

**Runtime State (not Zod - internal only):**

```typescript
interface ArtifactState {
  completed: Set<string>;
  inProgress: Set<string>;
  failed: Set<string>;
}

interface ArtifactGraphResult {
  completed: string[];
  ready: string[];
  blocked: string[];
  buildOrder: string[];
}
```

## File Structure

```
src/core/artifact-graph/
├── index.ts           # Public exports
├── types.ts           # Type definitions
├── graph.ts           # ArtifactGraph class
├── state.ts           # State detection logic
└── schema.ts          # YAML schema parser
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Glob pattern edge cases | Use well-tested glob library (fast-glob or similar) |
| Cycle detection | Kahn's algorithm naturally fails on cycles; provide clear error |
| Schema evolution | Version field in schema, validate on load |

## Open Questions

- Should we support custom file existence predicates for advanced scenarios?
- What's the appropriate error format for cycle detection?
