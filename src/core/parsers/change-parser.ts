import { MarkdownParser, Section } from './markdown-parser.js';
import { Change, Delta, DeltaOperation, Requirement } from '../schemas/index.js';
import path from 'path';
import { promises as fs } from 'fs';

interface DeltaSection {
  operation: DeltaOperation;
  requirements: Requirement[];
  renames?: Array<{ from: string; to: string }>;
}

export class ChangeParser extends MarkdownParser {
  private changeDir: string;

  constructor(content: string, changeDir: string) {
    super(content);
    this.changeDir = changeDir;
  }

  async parseChangeWithDeltas(name: string): Promise<Change> {
    const sections = this.parseSections();
    const why = this.findSection(sections, 'Why')?.content || '';
    const whatChanges = this.findSection(sections, 'What Changes')?.content || '';
    
    if (!why) {
      throw new Error('Change must have a Why section');
    }
    
    if (!whatChanges) {
      throw new Error('Change must have a What Changes section');
    }

    // Parse deltas from the What Changes section (simple format)
    const simpleDeltas = this.parseDeltas(whatChanges);
    
    // Check if there are spec files with delta format
    const specsDir = path.join(this.changeDir, 'specs');
    const deltaDeltas = await this.parseDeltaSpecs(specsDir);
    
    // Combine both types of deltas, preferring delta format if available
    const deltas = deltaDeltas.length > 0 ? deltaDeltas : simpleDeltas;

    return {
      name,
      why: why.trim(),
      whatChanges: whatChanges.trim(),
      deltas,
      metadata: {
        version: '1.0.0',
        format: 'openspec-change',
      },
    };
  }

  private async parseDeltaSpecs(specsDir: string): Promise<Delta[]> {
    const deltas: Delta[] = [];
    
    try {
      const specDirs = await fs.readdir(specsDir, { withFileTypes: true });
      
      for (const dir of specDirs) {
        if (!dir.isDirectory()) continue;
        
        const specName = dir.name;
        const specFile = path.join(specsDir, specName, 'spec.md');
        
        try {
          const content = await fs.readFile(specFile, 'utf-8');
          const specDeltas = this.parseSpecDeltas(specName, content);
          deltas.push(...specDeltas);
        } catch (error) {
          // Spec file might not exist, which is okay
          continue;
        }
      }
    } catch (error) {
      // Specs directory might not exist, which is okay
      return [];
    }
    
    return deltas;
  }

  private parseSpecDeltas(specName: string, content: string): Delta[] {
    const deltas: Delta[] = [];
    const sections = this.parseSectionsFromContent(content);
    
    // Parse ADDED requirements
    const addedSection = this.findSection(sections, 'ADDED Requirements');
    if (addedSection) {
      const requirements = this.parseRequirements(addedSection);
      requirements.forEach(req => {
        deltas.push({
          spec: specName,
          operation: 'ADDED' as DeltaOperation,
          description: `Add requirement: ${req.text}`,
          // Provide both single and plural forms for compatibility
          requirement: req,
          requirements: [req],
        });
      });
    }
    
    // Parse MODIFIED requirements
    const modifiedSection = this.findSection(sections, 'MODIFIED Requirements');
    if (modifiedSection) {
      const requirements = this.parseRequirements(modifiedSection);
      requirements.forEach(req => {
        deltas.push({
          spec: specName,
          operation: 'MODIFIED' as DeltaOperation,
          description: `Modify requirement: ${req.text}`,
          requirement: req,
          requirements: [req],
        });
      });
    }
    
    // Parse REMOVED requirements
    const removedSection = this.findSection(sections, 'REMOVED Requirements');
    if (removedSection) {
      const requirements = this.parseRequirements(removedSection);
      requirements.forEach(req => {
        deltas.push({
          spec: specName,
          operation: 'REMOVED' as DeltaOperation,
          description: `Remove requirement: ${req.text}`,
          requirement: req,
          requirements: [req],
        });
      });
    }
    
    // Parse RENAMED requirements
    const renamedSection = this.findSection(sections, 'RENAMED Requirements');
    if (renamedSection) {
      const renames = this.parseRenames(renamedSection.content);
      renames.forEach(rename => {
        deltas.push({
          spec: specName,
          operation: 'RENAMED' as DeltaOperation,
          description: `Rename requirement from "${rename.from}" to "${rename.to}"`,
          rename,
        });
      });
    }
    
    return deltas;
  }

  private parseRenames(content: string): Array<{ from: string; to: string }> {
    const renames: Array<{ from: string; to: string }> = [];
    const lines = ChangeParser.normalizeContent(content).split('\n');
    
    let currentRename: { from?: string; to?: string } = {};
    
    for (const line of lines) {
      const fromMatch = line.match(/^\s*-?\s*FROM:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
      const toMatch = line.match(/^\s*-?\s*TO:\s*`?###\s*Requirement:\s*(.+?)`?\s*$/);
      
      if (fromMatch) {
        currentRename.from = fromMatch[1].trim();
      } else if (toMatch) {
        currentRename.to = toMatch[1].trim();
        
        if (currentRename.from && currentRename.to) {
          renames.push({
            from: currentRename.from,
            to: currentRename.to,
          });
          currentRename = {};
        }
      }
    }
    
    return renames;
  }

  private parseSectionsFromContent(content: string): Section[] {
    const normalizedContent = ChangeParser.normalizeContent(content);
    const lines = normalizedContent.split('\n');
    const sections: Section[] = [];
    const stack: Section[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const contentLines = this.getContentUntilNextHeaderFromLines(lines, i + 1, level);
        
        const section = {
          level,
          title,
          content: contentLines.join('\n').trim(),
          children: [],
        };

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
          stack.pop();
        }

        if (stack.length === 0) {
          sections.push(section);
        } else {
          stack[stack.length - 1].children.push(section);
        }
        
        stack.push(section);
      }
    }
    
    return sections;
  }

  private getContentUntilNextHeaderFromLines(lines: string[], startLine: number, currentLevel: number): string[] {
    const contentLines: string[] = [];
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+/);
      
      if (headerMatch && headerMatch[1].length <= currentLevel) {
        break;
      }
      
      contentLines.push(line);
    }
    
    return contentLines;
  }
}