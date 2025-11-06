interface ExecuteOptions {
    all?: boolean;
    changes?: boolean;
    specs?: boolean;
    type?: string;
    strict?: boolean;
    json?: boolean;
    noInteractive?: boolean;
    concurrency?: string;
}
export declare class ValidateCommand {
    execute(itemName: string | undefined, options?: ExecuteOptions): Promise<void>;
    private normalizeType;
    private runInteractiveSelector;
    private printNonInteractiveHint;
    private validateDirectItem;
    private validateByType;
    private printReport;
    private printNextSteps;
    private runBulkValidation;
}
export {};
//# sourceMappingURL=validate.d.ts.map