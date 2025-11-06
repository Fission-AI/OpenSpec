import { MarkdownParser } from './markdown-parser.js';
import { Change } from '../schemas/index.js';
export declare class ChangeParser extends MarkdownParser {
    private changeDir;
    constructor(content: string, changeDir: string);
    parseChangeWithDeltas(name: string): Promise<Change>;
    private parseDeltaSpecs;
    private parseSpecDeltas;
    private parseRenames;
    private parseSectionsFromContent;
    private getContentUntilNextHeaderFromLines;
}
//# sourceMappingURL=change-parser.d.ts.map