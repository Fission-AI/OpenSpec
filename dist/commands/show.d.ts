export declare class ShowCommand {
    execute(itemName?: string, options?: {
        json?: boolean;
        type?: string;
        noInteractive?: boolean;
        [k: string]: any;
    }): Promise<void>;
    private normalizeType;
    private runInteractiveByType;
    private showDirect;
    private printNonInteractiveHint;
    private warnIrrelevantFlags;
}
//# sourceMappingURL=show.d.ts.map