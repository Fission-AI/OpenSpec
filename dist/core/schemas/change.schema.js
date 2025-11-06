import { z } from 'zod';
import { RequirementSchema } from './base.schema.js';
import { MIN_WHY_SECTION_LENGTH, MAX_WHY_SECTION_LENGTH, MAX_DELTAS_PER_CHANGE, VALIDATION_MESSAGES } from '../validation/constants.js';
export const DeltaOperationType = z.enum(['ADDED', 'MODIFIED', 'REMOVED', 'RENAMED']);
export const DeltaSchema = z.object({
    spec: z.string().min(1, VALIDATION_MESSAGES.DELTA_SPEC_EMPTY),
    operation: DeltaOperationType,
    description: z.string().min(1, VALIDATION_MESSAGES.DELTA_DESCRIPTION_EMPTY),
    requirement: RequirementSchema.optional(),
    requirements: z.array(RequirementSchema).optional(),
    rename: z.object({
        from: z.string(),
        to: z.string(),
    }).optional(),
});
export const ChangeSchema = z.object({
    name: z.string().min(1, VALIDATION_MESSAGES.CHANGE_NAME_EMPTY),
    why: z.string()
        .min(MIN_WHY_SECTION_LENGTH, VALIDATION_MESSAGES.CHANGE_WHY_TOO_SHORT)
        .max(MAX_WHY_SECTION_LENGTH, VALIDATION_MESSAGES.CHANGE_WHY_TOO_LONG),
    whatChanges: z.string().min(1, VALIDATION_MESSAGES.CHANGE_WHAT_EMPTY),
    deltas: z.array(DeltaSchema)
        .min(1, VALIDATION_MESSAGES.CHANGE_NO_DELTAS)
        .max(MAX_DELTAS_PER_CHANGE, VALIDATION_MESSAGES.CHANGE_TOO_MANY_DELTAS),
    metadata: z.object({
        version: z.string().default('1.0.0'),
        format: z.literal('openspec-change'),
        sourcePath: z.string().optional(),
    }).optional(),
});
//# sourceMappingURL=change.schema.js.map