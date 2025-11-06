import { Spec, Change, Requirement, Scenario, Delta } from '../schemas/index.js';
export interface Section {
    level: number;
    title: string;
    content: string;
    children: Section[];
}
export declare class MarkdownParser {
    private lines;
    private currentLine;
    constructor(content: string);
    protected static normalizeContent(content: string): string;
    parseSpec(name: string): Spec;
    parseChange(name: string): Change;
    protected parseSections(): Section[];
    protected getContentUntilNextHeader(startLine: number, currentLevel: number): string;
    protected findSection(sections: Section[], title: string): Section | undefined;
    protected parseRequirements(section: Section): Requirement[];
    protected parseScenarios(requirementSection: Section): Scenario[];
    protected parseDeltas(content: string): Delta[];
}
//# sourceMappingURL=markdown-parser.d.ts.map