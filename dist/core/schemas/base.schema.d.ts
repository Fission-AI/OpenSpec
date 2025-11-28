import { z } from 'zod';
export declare const ScenarioSchema: z.ZodObject<{
    rawText: z.ZodString;
}, z.core.$strip>;
export declare const RequirementSchema: z.ZodObject<{
    text: z.ZodString;
    scenarios: z.ZodArray<z.ZodObject<{
        rawText: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Scenario = z.infer<typeof ScenarioSchema>;
export type Requirement = z.infer<typeof RequirementSchema>;
//# sourceMappingURL=base.schema.d.ts.map