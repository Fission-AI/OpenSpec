## Context

The experimental artifact workflow supports multiple schemas (`spec-driven`, `tdd`), but schema selection must be passed on every command. This creates friction for agents and users.

We need a lightweight metadata file to persist the schema choice per change.

## Goals / Non-Goals

**Goals:**
- Store schema choice once at change creation
- Auto-detect schema in experimental workflow commands
- Maintain backward compatibility (no metadata = default)
- Validate metadata with Zod schema

**Non-Goals:**
- Migrate existing changes (they use default)
- Extend to legacy commands
- Store additional metadata beyond schema (keep minimal for now)

## Decisions

### Decision: Zod Schema Design

The metadata file (`.openspec.yaml`) will be validated with this Zod schema:

```typescript
// src/core/artifact-graph/types.ts (or new metadata.ts)

import { z } from 'zod';
import { listSchemas } from './resolver.js';

/**
 * Schema for per-change metadata stored in .openspec.yaml
 */
export const ChangeMetadataSchema = z.object({
  // Required: which workflow schema this change uses
  schema: z.string().min(1, { message: 'schema is required' }).refine(
    (val) => listSchemas().includes(val),
    (val) => ({ message: `Unknown schema '${val}'. Available: ${listSchemas().join(', ')}` })
  ),

  // Optional: creation timestamp (ISO date string)
  created: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'created must be YYYY-MM-DD format'
  }).optional(),
});

export type ChangeMetadata = z.infer<typeof ChangeMetadataSchema>;
```

**Rationale:**
- `schema` is required and validated against available schemas at parse time
- `created` is optional, ISO date format for consistency
- Minimal fields - can extend later without breaking existing files
- Follows existing codebase pattern (see `ArtifactSchema`, `SchemaYamlSchema`)

### Decision: File Location and Format

**Location:** `openspec/changes/<name>/.openspec.yaml`

**Format:**
```yaml
schema: tdd
created: 2025-01-05
```

**Alternatives considered:**
- `change.yaml` - less hidden, but clutters directory
- Frontmatter in `proposal.md` - couples to proposal existence
- `openspec.json` - YAML matches existing schema files

### Decision: Read/Write Functions

```typescript
// src/utils/change-metadata.ts

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { ChangeMetadataSchema, type ChangeMetadata } from '../core/artifact-graph/types.js';

const METADATA_FILENAME = '.openspec.yaml';

export function writeChangeMetadata(
  changeDir: string,
  metadata: ChangeMetadata
): void {
  // Validate before writing
  const validated = ChangeMetadataSchema.parse(metadata);
  const content = yaml.stringify(validated);
  fs.writeFileSync(path.join(changeDir, METADATA_FILENAME), content);
}

export function readChangeMetadata(
  changeDir: string
): ChangeMetadata | null {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  const content = fs.readFileSync(metaPath, 'utf-8');
  const parsed = yaml.parse(content);

  // Validate and return (throws ZodError if invalid)
  return ChangeMetadataSchema.parse(parsed);
}
```

### Decision: Schema Resolution Order

When determining which schema to use:

1. **Explicit `--schema` flag** (highest priority - user override)
2. **`.openspec.yaml` metadata** (persisted choice)
3. **Default `spec-driven`** (fallback)

```typescript
function resolveSchemaForChange(
  changeDir: string,
  explicitSchema?: string
): string {
  if (explicitSchema) return explicitSchema;

  const metadata = readChangeMetadata(changeDir);
  if (metadata?.schema) return metadata.schema;

  return 'spec-driven';
}
```

## Risks / Trade-offs

- **Extra file per change** → Minimal overhead, hidden file
- **YAML parsing dependency** → Already using `yaml` package for schema files
- **Schema validation at read time** → Fail fast with clear error if corrupted

## Migration Plan

No migration needed:
- Existing changes without `.openspec.yaml` continue to work (use default)
- New changes created with `openspec new change --schema X` get metadata file

## Open Questions

- Should `openspec new change` prompt for schema interactively if not specified? (Leaning no - default is fine)
