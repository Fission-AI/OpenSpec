import { z } from 'zod';
import { RequirementSchema } from './base.schema.js';
import { VALIDATION_MESSAGES } from '../validation/constants.js';
export const SpecSchema = z.object({
    name: z.string().min(1, VALIDATION_MESSAGES.SPEC_NAME_EMPTY),
    overview: z.string().min(1, VALIDATION_MESSAGES.SPEC_PURPOSE_EMPTY),
    requirements: z.array(RequirementSchema)
        .min(1, VALIDATION_MESSAGES.SPEC_NO_REQUIREMENTS),
    metadata: z.object({
        version: z.string().default('1.0.0'),
        format: z.literal('openspec'),
        sourcePath: z.string().optional(),
    }).optional(),
});
//# sourceMappingURL=spec.schema.js.map