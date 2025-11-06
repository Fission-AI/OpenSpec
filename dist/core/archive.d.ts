export declare class ArchiveCommand {
    execute(changeName?: string, options?: {
        yes?: boolean;
        skipSpecs?: boolean;
        noValidate?: boolean;
        validate?: boolean;
    }): Promise<void>;
    private selectChange;
    private checkIncompleteTasks;
    private findSpecUpdates;
    private buildUpdatedSpec;
    private writeUpdatedSpec;
    private buildSpecSkeleton;
    private getArchiveDate;
}
//# sourceMappingURL=archive.d.ts.map