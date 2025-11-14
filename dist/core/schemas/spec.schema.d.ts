import { z } from 'zod';
export declare const SpecSchema: z.ZodObject<{
    name: z.ZodString;
    overview: z.ZodString;
    requirements: z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        scenarios: z.ZodArray<z.ZodObject<{
            rawText: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        version: z.ZodDefault<z.ZodString>;
        format: z.ZodLiteral<"openspec">;
        sourcePath: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type Spec = z.infer<typeof SpecSchema>;
//# sourceMappingURL=spec.schema.d.ts.map