import { z } from 'zod';

// Artifact definition schema
export const ArtifactSchema = z.object({
  id: z.string().min(1, { error: 'Artifact ID is required' }),
  generates: z.string().min(1, { error: 'generates field is required' }),
  description: z.string(),
  template: z.string().min(1, { error: 'template field is required' }),
  instruction: z.string().optional(),
  requires: z.array(z.string()).default([]),
});

// Gate definition for quality checkpoints
export const GateSchema = z.object({
  id: z.string().min(1),
  check: z.string().min(1), // 'capability-coverage' | 'scenario-task-ratio' | 'all-tasks-done' | 'validate-delta-specs' | 'ai-review' | 'command'
  severity: z.enum(['blocking', 'warning']),
  prompt: z.string().optional(),
  command: z.string().optional(),
  retry: z.number().int().positive().optional(),
  on_p2: z.enum(['batch-then-recheck', 'skip']).optional(),
});

// Gates configuration with pre (before coding) and post (after coding) arrays
export const GatesSchema = z.object({
  pre: z.array(GateSchema).optional(),
  post: z.array(GateSchema).optional(),
});

// TDD configuration for a step
export const TddConfigSchema = z.object({
  enforce: z.enum(['per-task', 'per-group', 'optional']),
  test_pattern: z.string().optional(),
  min_coverage: z.number().optional(),
  marker: z.boolean().optional(),
});

// Step definition within apply phase
export const StepSchema = z.object({
  id: z.string().min(1),
  method: z.enum(['tdd', 'free', 'gate']).optional(),
  tdd: TddConfigSchema.optional(),
  gate_ref: z.string().optional(),
  instruction: z.string().optional(),
});

// Apply phase configuration for schema-aware apply instructions
export const ApplyPhaseSchema = z.object({
  // Artifact IDs that must exist before apply is available
  requires: z.array(z.string()).min(1, { error: 'At least one required artifact' }),
  // Path to file with checkboxes for progress (relative to change dir), or null if no tracking
  tracks: z.string().nullable().optional(),
  // Quality gates (pre = before coding, post = after coding)
  gates: GatesSchema.optional(),
  // Execution steps within apply (coded, reviewed, committed, etc.)
  steps: z.array(StepSchema).optional(),
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

