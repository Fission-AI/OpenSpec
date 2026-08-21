import { readFileSync } from 'fs';
import path from 'path';
import { MarkdownParser } from '../parsers/markdown-parser.js';
import { ChangeParser } from '../parsers/change-parser.js';
import { Spec, Change } from '../schemas/index.js';
import { itemNameFromPath } from '../change-discovery.js';

export class JsonConverter {
  convertSpecToJson(filePath: string): string {
    const content = readFileSync(filePath, 'utf-8');
    const parser = new MarkdownParser(content);
    const specName = this.extractNameFromPath(filePath);
    
    const spec = parser.parseSpec(specName);
    
    const jsonSpec = {
      ...spec,
      metadata: {
        ...spec.metadata,
        sourcePath: filePath,
      },
    };
    
    return JSON.stringify(jsonSpec, null, 2);
  }

  async convertChangeToJson(filePath: string): Promise<string> {
    const content = readFileSync(filePath, 'utf-8');
    const changeName = this.extractNameFromPath(filePath);
    const changeDir = path.dirname(filePath);
    const parser = new ChangeParser(content, changeDir);
    
    const change = await parser.parseChangeWithDeltas(changeName);
    
    const jsonChange = {
      ...change,
      metadata: {
        ...change.metadata,
        sourcePath: filePath,
      },
    };
    
    return JSON.stringify(jsonChange, null, 2);
  }

  private extractNameFromPath(filePath: string): string {
    return itemNameFromPath(filePath);
  }
}
