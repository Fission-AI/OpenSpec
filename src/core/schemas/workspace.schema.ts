import { z } from 'zod';

export const WorkspaceRepoSchema = z.object({
  name: z.string().min(1, 'Repo name is required'),
  path: z.string().min(1, 'Repo path is required'),
  role: z.string().optional(),
});

export const CrossRepoConventionsSchema = z.object({
  requireImpactSection: z.boolean().default(true),
  requireImplementationOrder: z.boolean().default(false),
});

export const WorkspaceConventionsSchema = z.object({
  crossRepoChanges: CrossRepoConventionsSchema.optional(),
});

export const WorkspaceConfigSchema = z.object({
  name: z.string().min(1, 'Workspace name is required'),
  repos: z.array(WorkspaceRepoSchema).min(1, 'At least one repo is required'),
  conventions: WorkspaceConventionsSchema.optional(),
});

export type WorkspaceRepo = z.infer<typeof WorkspaceRepoSchema>;
export type CrossRepoConventions = z.infer<typeof CrossRepoConventionsSchema>;
export type WorkspaceConventions = z.infer<typeof WorkspaceConventionsSchema>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;