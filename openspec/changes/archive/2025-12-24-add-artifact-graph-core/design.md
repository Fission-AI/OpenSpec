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

### Decision: Immutable Completed Set
Represent completion state as an immutable Set of completed artifact IDs.

**Rationale:**
- Functional style, easier to reason about
- State derived fresh each query, no mutation needed
- Clear separation between graph structure and runtime state
- Filesystem can only detect binary existence (complete vs not complete)

**Note:** `inProgress` and `failed` states are deferred to future slices. They would require external state tracking (e.g., a status file) since file existence alone cannot distinguish these states.

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

### Decision: Two-Level Schema Resolution
Schemas resolve from global user data directory, falling back to package built-ins.

**Resolution order:**
1. `${XDG_DATA_HOME:-~/.local/share}/openspec/schemas/<name>.yaml` - Global user override
2. `<package>/schemas/<name>.yaml` - Built-in defaults

**Rationale:**
- Follows XDG Base Directory Specification (schemas are data, not config)
- Mirrors existing `getGlobalConfigDir()` pattern in `src/core/global-paths.ts`
- Built-ins baked into package, never auto-copied
- Users customize by creating files in global data dir
- Simple - no project-level overrides (can add later if needed)

**XDG compliance:**
- Uses `XDG_DATA_HOME` env var when set (all platforms)
- Unix/macOS fallback: `~/.local/share/openspec/`
- Windows fallback: `%LOCALAPPDATA%/openspec/`

**Alternatives considered:**
- Project-level overrides: Added complexity, not needed initially
- Auto-copy to user space: Creates drift, harder to update defaults
- Config directory (`XDG_CONFIG_HOME`): Schemas are workflow definitions (data), not user preferences (config)

### Decision: Template Field Parsed But Not Resolved
The `template` field is required in schema YAML for completeness, but template resolution is deferred to Slice 3.

**Rationale:**
- Slice 1 focuses on "What's Ready?" - dependency and completion queries only
- Template paths are validated syntactically (non-empty string) but not resolved
- Keeps Slice 1 focused and independently testable

### Decision: Cycle Error Format
Cycle errors list all artifact IDs in the cycle for easy debugging.

**Format:** `"Cyclic dependency detected: A → B → C → A"`

**Rationale:**
- Shows the full cycle path, not just that a cycle exists
- Actionable - developer can see exactly which artifacts to fix
- Consistent with Kahn's algorithm which naturally identifies cycle participants

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
// Slice 1: Simple completion tracking via filesystem
type CompletedSet = Set<string>;

// Return type for blocked query
interface BlockedArtifacts {
  [artifactId: string]: string[];  // artifact → list of unmet dependencies
}

interface ArtifactGraphResult {
  completed: string[];
  ready: string[];
  blocked: BlockedArtifacts;
  buildOrder: string[];
}
```

## File Structure

```
src/core/artifact-graph/
├── index.ts           # Public exports
├── types.ts           # Zod schemas and type definitions
├── graph.ts           # ArtifactGraph class
├── state.ts           # State detection logic
├── resolver.ts        # Schema resolution (global → built-in)
└── schemas/           # Built-in schema definitions (package level)
    ├── spec-driven.yaml   # Default: proposal → specs → design → tasks
    └── tdd.yaml           # Alternative: tests → implementation → docs
```

**Schema Resolution Paths:**
- Global user override: `${XDG_DATA_HOME:-~/.local/share}/openspec/schemas/<name>.yaml`
- Package built-in: `src/core/artifact-graph/schemas/<name>.yaml` (bundled with package)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Glob pattern edge cases | Use well-tested glob library (fast-glob or similar) |
| Cycle detection | Kahn's algorithm naturally fails on cycles; provide clear error |
| Schema evolution | Version field in schema, validate on load |

## Open Questions

None - all questions resolved in Decisions section.
