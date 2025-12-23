# Overview

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
- Global user override: `~/.config/openspec/schemas/<name>.yaml`
- Package built-in: `src/core/artifact-graph/schemas/<name>.yaml` (bundled with package)

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Glob pattern edge cases | Use well-tested glob library (fast-glob or similar) |
| Cycle detection | Kahn's algorithm naturally fails on cycles; provide clear error |
| Schema evolution | Version field in schema, validate on load |

## Cross-Cutting Tasks

- [ ] 8.1 Create `src/core/artifact-graph/index.ts` with public exports
