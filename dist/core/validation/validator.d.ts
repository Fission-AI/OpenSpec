import { ValidationReport } from './types.js';
export declare class Validator {
    private strictMode;
    constructor(strictMode?: boolean);
    validateSpec(filePath: string): Promise<ValidationReport>;
    /**
     * Validate spec content from a string (used for pre-write validation of rebuilt specs)
     */
    validateSpecContent(specName: string, content: string): Promise<ValidationReport>;
    validateChange(filePath: string): Promise<ValidationReport>;
    /**
     * Validate delta-formatted spec files under a change directory.
     * Enforces:
     * - At least one delta across all files
     * - ADDED/MODIFIED: each requirement has SHALL/MUST and at least one scenario
     * - REMOVED: names only; no scenario/description required
     * - RENAMED: pairs well-formed
     * - No duplicates within sections; no cross-section conflicts per spec
     */
    validateChangeDeltaSpecs(changeDir: string): Promise<ValidationReport>;
    private convertZodErrors;
    private applySpecRules;
    private applyChangeRules;
    private enrichTopLevelError;
    private extractNameFromPath;
    private createReport;
    isValid(report: ValidationReport): boolean;
    private extractRequirementText;
    private containsShallOrMust;
    private countScenarios;
    private formatSectionList;
}
//# sourceMappingURL=validator.d.ts.map