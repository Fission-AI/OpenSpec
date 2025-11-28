export declare class ChangeCommand {
    private converter;
    constructor();
    /**
     * Show a change proposal.
     * - Text mode: raw markdown passthrough (no filters)
     * - JSON mode: minimal object with deltas; --deltas-only returns same object with filtered deltas
     *   Note: --requirements-only is deprecated alias for --deltas-only
     */
    show(changeName?: string, options?: {
        json?: boolean;
        requirementsOnly?: boolean;
        deltasOnly?: boolean;
        noInteractive?: boolean;
    }): Promise<void>;
    /**
     * List active changes.
     * - Text default: IDs only; --long prints minimal details (title, counts)
     * - JSON: array of { id, title, deltaCount, taskStatus }, sorted by id
     */
    list(options?: {
        json?: boolean;
        long?: boolean;
    }): Promise<void>;
    validate(changeName?: string, options?: {
        strict?: boolean;
        json?: boolean;
        noInteractive?: boolean;
    }): Promise<void>;
    private getActiveChanges;
    private extractTitle;
    private countTasks;
    private printNextSteps;
}
//# sourceMappingURL=change.d.ts.map