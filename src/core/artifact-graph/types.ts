import * as path from 'node:path';
import { z } from 'zod';

function relativePathSchema(fieldName: string) {
  return z
    .string()
    .min(1, { error: `${fieldName} is required` })
    .superRefine((value, ctx) => {
      const segments = value.split(/[\\/]+/u);
      const isDrivePath = /^[A-Za-z]:/u.test(value);
      const isAbsolute =
        path.posix.isAbsolute(value) || path.win32.isAbsolute(value) || isDrivePath;
      const escapes = segments.includes('..');

      if (isAbsolute || escapes || value.includes('\0')) {
        ctx.addIssue({
          code: 'custom',
          message: `${fieldName} must be a relative path inside its allowed directory`,
        });
      }
    });
}

// Artifact definition schema
export const ArtifactSchema = z.object({
  id: z.string().min(1, { error: 'Artifact ID is required' }),
  generates: relativePathSchema('generates field'),
  description: z.string(),
  template: relativePathSchema('template field'),
  instruction: z.string().optional(),
  requires: z.array(z.string()).default([]),
});

// Apply phase configuration for schema-aware apply instructions
export const ApplyPhaseSchema = z.object({
  // Artifact IDs that must exist before apply is available
  requires: z.array(z.string()).min(1, { error: 'At least one required artifact' }),
  // Path to file with checkboxes for progress (relative to change dir), or null if no tracking
  tracks: relativePathSchema('apply.tracks').nullable().optional(),
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

const TextOverrideOperationSchema = z
  .object({
    prepend: z.string().optional(),
    append: z.string().optional(),
    replace: z.string().optional(),
  })
  .strict()
  .superRefine((operation, ctx) => {
    const hasPrepend = operation.prepend !== undefined;
    const hasAppend = operation.append !== undefined;
    const hasReplace = operation.replace !== undefined;

    if (!hasPrepend && !hasAppend && !hasReplace) {
      ctx.addIssue({
        code: 'custom',
        message: 'Text override requires prepend, append, or replace',
      });
    }
    if (hasReplace && (hasPrepend || hasAppend)) {
      ctx.addIssue({
        code: 'custom',
        message: 'replace cannot be combined with prepend or append',
      });
    }
  });

const StringCollectionOverrideSchema = z
  .object({
    add: z.array(z.string().min(1)).optional(),
    remove: z.array(z.string().min(1)).optional(),
    replace: z.array(z.string().min(1)).optional(),
  })
  .strict()
  .superRefine((operation, ctx) => {
    const hasAdd = operation.add !== undefined;
    const hasRemove = operation.remove !== undefined;
    const hasReplace = operation.replace !== undefined;

    if (!hasAdd && !hasRemove && !hasReplace) {
      ctx.addIssue({
        code: 'custom',
        message: 'Collection override requires add, remove, or replace',
      });
    }
    if (hasReplace && (hasAdd || hasRemove)) {
      ctx.addIssue({
        code: 'custom',
        message: 'replace cannot be combined with add or remove',
      });
    }

    for (const [field, values] of Object.entries(operation)) {
      if (values && new Set(values).size !== values.length) {
        ctx.addIssue({
          code: 'custom',
          path: [field],
          message: `${field} contains duplicate entries`,
        });
      }
    }

    if (operation.add && operation.remove) {
      const removed = new Set(operation.remove);
      const overlap = operation.add.filter((value) => removed.has(value));
      if (overlap.length > 0) {
        ctx.addIssue({
          code: 'custom',
          message: `Values cannot be both added and removed: ${overlap.join(', ')}`,
        });
      }
    }
  });

const ArtifactOverrideSchema = z
  .object({
    generates: relativePathSchema('generates field').optional(),
    description: z.string().optional(),
    template: relativePathSchema('template field').optional(),
    instruction: TextOverrideOperationSchema.optional(),
    requires: StringCollectionOverrideSchema.optional(),
  })
  .strict();

const ApplyPhaseOverrideSchema = z
  .object({
    requires: StringCollectionOverrideSchema.optional(),
    tracks: relativePathSchema('apply.tracks').nullable().optional(),
    instruction: TextOverrideOperationSchema.optional(),
  })
  .strict();

/** A user-level patch layered over a package schema. */
export const SchemaOverrideYamlSchema = z
  .object({
    patchVersion: z.literal(1),
    description: z.string().optional(),
    artifacts: z.record(z.string().min(1), ArtifactOverrideSchema).optional(),
    apply: ApplyPhaseOverrideSchema.optional(),
  })
  .strict();

// Derived TypeScript types
export type Artifact = z.infer<typeof ArtifactSchema>;
export type ApplyPhase = z.infer<typeof ApplyPhaseSchema>;
export type SchemaYaml = z.infer<typeof SchemaYamlSchema>;
export type TextOverrideOperation = z.infer<typeof TextOverrideOperationSchema>;
export type StringCollectionOverride = z.infer<typeof StringCollectionOverrideSchema>;
export type SchemaOverrideYaml = z.infer<typeof SchemaOverrideYamlSchema>;

// Runtime state types (not Zod - internal only)

// Slice 1: Simple completion tracking via filesystem
export type CompletedSet = Set<string>;

// Return type for blocked query
export interface BlockedArtifacts {
  [artifactId: string]: string[];
}
