import { z } from 'zod';
import { RequirementSchema, createRequirementSchema } from './base.schema.js';
import { VALIDATION_MESSAGES } from '../validation/constants.js';

export function createSpecSchema(language?: string) {
  const reqSchema = language ? createRequirementSchema(language) : RequirementSchema;
  return z.object({
    name: z.string().min(1, VALIDATION_MESSAGES.SPEC_NAME_EMPTY),
    overview: z.string().min(1, VALIDATION_MESSAGES.SPEC_PURPOSE_EMPTY),
    requirements: z.array(reqSchema)
      .min(1, VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS),
    metadata: z.object({
      version: z.string().default('1.0.0'),
      format: z.literal('openspec'),
      sourcePath: z.string().optional(),
    }).optional(),
  });
}

export const SpecSchema = createSpecSchema();

export type Spec = z.infer<typeof SpecSchema>;
