import { z } from 'zod';
export declare const DeltaOperationType: z.ZodEnum<{
    ADDED: "ADDED";
    MODIFIED: "MODIFIED";
    REMOVED: "REMOVED";
    RENAMED: "RENAMED";
}>;
export declare const DeltaSchema: z.ZodObject<{
    spec: z.ZodString;
    operation: z.ZodEnum<{
        ADDED: "ADDED";
        MODIFIED: "MODIFIED";
        REMOVED: "REMOVED";
        RENAMED: "RENAMED";
    }>;
    description: z.ZodString;
    requirement: z.ZodOptional<z.ZodObject<{
        text: z.ZodString;
        scenarios: z.ZodArray<z.ZodObject<{
            rawText: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    requirements: z.ZodOptional<z.ZodArray<z.ZodObject<{
        text: z.ZodString;
        scenarios: z.ZodArray<z.ZodObject<{
            rawText: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>>;
    rename: z.ZodOptional<z.ZodObject<{
        from: z.ZodString;
        to: z.ZodString;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const ChangeSchema: z.ZodObject<{
    name: z.ZodString;
    why: z.ZodString;
    whatChanges: z.ZodString;
    deltas: z.ZodArray<z.ZodObject<{
        spec: z.ZodString;
        operation: z.ZodEnum<{
            ADDED: "ADDED";
            MODIFIED: "MODIFIED";
            REMOVED: "REMOVED";
            RENAMED: "RENAMED";
        }>;
        description: z.ZodString;
        requirement: z.ZodOptional<z.ZodObject<{
            text: z.ZodString;
            scenarios: z.ZodArray<z.ZodObject<{
                rawText: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>>;
        requirements: z.ZodOptional<z.ZodArray<z.ZodObject<{
            text: z.ZodString;
            scenarios: z.ZodArray<z.ZodObject<{
                rawText: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>>>;
        rename: z.ZodOptional<z.ZodObject<{
            from: z.ZodString;
            to: z.ZodString;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
    metadata: z.ZodOptional<z.ZodObject<{
        version: z.ZodDefault<z.ZodString>;
        format: z.ZodLiteral<"openspec-change">;
        sourcePath: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type DeltaOperation = z.infer<typeof DeltaOperationType>;
export type Delta = z.infer<typeof DeltaSchema>;
export type Change = z.infer<typeof ChangeSchema>;
//# sourceMappingURL=change.schema.d.ts.map