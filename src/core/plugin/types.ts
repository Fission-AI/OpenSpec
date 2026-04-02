import { z } from 'zod';

// Valid hook points in the plugin lifecycle
export const VALID_HOOK_POINTS = [
  'propose.pre',
  'propose.post',
  'apply.pre',
  'apply.post',
  'archive.pre',
  'archive.post',
] as const;

// Config field declaration for a plugin setting
export const ConfigFieldSchema = z.object({
  type: z.enum(['string', 'boolean', 'number']),
  required: z.boolean().optional().default(false),
  default: z.union([z.string(), z.boolean(), z.number()]).optional(),
  description: z.string().optional(),
});

// Handler configuration for hooks and gates
export const HandlerConfigSchema = z.object({
  type: z.enum(['command', 'prompt', 'both']),
  run: z.string().optional(),
  file: z.string().optional(),
  ignore_failure: z.boolean().optional().default(false),
});

// A single hook registration
export const HookDefinitionSchema = z.object({
  id: z.string().min(1),
  handler: HandlerConfigSchema,
  description: z.string().optional(),
});

// A plugin-provided gate type
export const GateDefinitionSchema = z.object({
  id: z.string().min(1),
  handler: HandlerConfigSchema,
  description: z.string().optional(),
});

// Hooks grouped by hook point
export const PluginHooksSchema = z.object({
  'propose.pre': z.array(HookDefinitionSchema).optional(),
  'propose.post': z.array(HookDefinitionSchema).optional(),
  'apply.pre': z.array(HookDefinitionSchema).optional(),
  'apply.post': z.array(HookDefinitionSchema).optional(),
  'archive.pre': z.array(HookDefinitionSchema).optional(),
  'archive.post': z.array(HookDefinitionSchema).optional(),
});

// A single skill overlay operation (currently only 'append' supported)
export const SkillOverlaySchema = z.object({
  append: z.string(),
}).strict();

// Skill overlays mapped by workflow ID
export const SkillOverlaysSchema = z.record(z.string(), SkillOverlaySchema);

// Full plugin.yaml manifest
export const PluginManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  openspec: z.string().optional(),
  schemas: z.array(z.string()).optional(),
  config: z.record(z.string(), z.record(z.string(), ConfigFieldSchema)).optional(),
  hooks: PluginHooksSchema.optional(),
  gates: z.array(GateDefinitionSchema).optional(),
  skill_overlays: SkillOverlaysSchema.optional(),
});

// Derived TypeScript types
export type ConfigField = z.infer<typeof ConfigFieldSchema>;
export type HandlerConfig = z.infer<typeof HandlerConfigSchema>;
export type HookDefinition = z.infer<typeof HookDefinitionSchema>;
export type GateDefinition = z.infer<typeof GateDefinitionSchema>;
export type PluginHooks = z.infer<typeof PluginHooksSchema>;
export type SkillOverlay = z.infer<typeof SkillOverlaySchema>;
export type SkillOverlays = z.infer<typeof SkillOverlaysSchema>;
export type PluginManifest = z.infer<typeof PluginManifestSchema>;

// Runtime type (not Zod - internal only)
export interface LoadedPlugin {
  manifest: PluginManifest;
  dir: string;
  source: 'project' | 'user' | 'package';
  config: Record<string, Record<string, unknown>>;
}
