import * as path from 'node:path';
import { z } from 'zod';

// Stub project root used solely for `..`-escape detection during validation.
// Validation is path-only — no filesystem is touched, so any absolute root works.
const FOLDER_VALIDATION_STUB_ROOT = path.resolve('/__openspec_validation_stub__');

// Artifact definition schema
export const ArtifactSchema = z.object({
  id: z.string().min(1, { error: 'Artifact ID is required' }),
  generates: z.string().min(1, { error: 'generates field is required' }),
  description: z.string(),
  template: z.string().min(1, { error: 'template field is required' }),
  instruction: z.string().optional(),
  folder: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      if (value === undefined) return;

      const trimmed = value.trim();
      if (trimmed.length === 0) {
        ctx.addIssue({
          code: 'custom',
          message: 'folder must be a non-empty path',
        });
        return;
      }

      // Check both POSIX and Windows absolute-path forms regardless of host platform,
      // so a Windows-style "C:\\..." schema fails validation on Linux/macOS too.
      if (path.posix.isAbsolute(trimmed) || path.win32.isAbsolute(trimmed)) {
        ctx.addIssue({
          code: 'custom',
          message: `folder must be a relative path (got "${trimmed}")`,
        });
        return;
      }

      const resolved = path.resolve(FOLDER_VALIDATION_STUB_ROOT, trimmed);
      const rootWithSep = FOLDER_VALIDATION_STUB_ROOT.endsWith(path.sep)
        ? FOLDER_VALIDATION_STUB_ROOT
        : FOLDER_VALIDATION_STUB_ROOT + path.sep;
      if (resolved !== FOLDER_VALIDATION_STUB_ROOT && !resolved.startsWith(rootWithSep)) {
        ctx.addIssue({
          code: 'custom',
          message: `folder must stay within the project root (got "${trimmed}")`,
        });
        return;
      }

      const normalized = path.normalize(trimmed);
      const normalizedPosix = normalized.replace(/\\/g, '/');
      if (normalizedPosix === 'openspec' || normalizedPosix.startsWith('openspec/')) {
        ctx.addIssue({
          code: 'custom',
          message: 'folder must not start with the reserved "openspec/" prefix',
        });
      }
    }),
  requires: z.array(z.string()).default([]),
});

// Apply phase configuration for schema-aware apply instructions
export const ApplyPhaseSchema = z.object({
  // Artifact IDs that must exist before apply is available
  requires: z.array(z.string()).min(1, { error: 'At least one required artifact' }),
  // Path to file with checkboxes for progress (relative to change dir), or null if no tracking
  tracks: z.string().nullable().optional(),
  // Custom guidance for the apply phase
  instruction: z.string().optional(),
});

// Full schema YAML structure
export const SchemaYamlSchema = z.object({
  name: z.string().min(1, { error: 'Schema name is required' }),
  version: z.number().int().positive({ error: 'Version must be a positive integer' }),
  description: z.string().optional(),
  artifacts: z.array(ArtifactSchema).min(1, { error: 'At least one artifact required' }),
  // Optional apply phase configuration (for schema-aware apply instructions)
  apply: ApplyPhaseSchema.optional(),
});

// Derived TypeScript types
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ApplyPhase = z.infer<typeof ApplyPhaseSchema>;
export type SchemaYaml = z.infer<typeof SchemaYamlSchema>;

// Per-change metadata schema
// Note: schema field is validated at parse time against available schemas
// using a lazy import to avoid circular dependencies
export const ChangeMetadataSchema = z.object({
  // Required: which workflow schema this change uses
  schema: z.string().min(1, { message: 'schema is required' }),

  // Optional: creation timestamp (ISO date string)
  created: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, {
      message: 'created must be YYYY-MM-DD format',
    })
    .optional(),
});

export type ChangeMetadata = z.infer<typeof ChangeMetadataSchema>;

// Runtime state types (not Zod - internal only)

// Slice 1: Simple completion tracking via filesystem
export type CompletedSet = Set<string>;

// Return type for blocked query
export interface BlockedArtifacts {
  [artifactId: string]: string[];
}

