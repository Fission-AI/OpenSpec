import { Spec, Change, Requirement, Scenario, Delta, DeltaOperation } from '../schemas/index.js';

export interface Section {
  level: number;
  title: string;
  content: string;
  children: Section[];
}

export class MarkdownParser {
  private lines: string[];
  private currentLine: number;

  constructor(content: string) {
    const normalized = MarkdownParser.normalizeContent(content);
    this.lines = normalized.split('\n');
    this.currentLine = 0;
  }

  protected static normalizeContent(content: string): string {
    return content.replace(/\r\n?/g, '\n');
  }

  parseSpec(name: string): Spec {
    const sections = this.parseSections();
    const purpose = this.findSection(sections, 'Purpose')?.content || '';
    
    const requirementsSection = this.findSection(sections, 'Requirements');
    
    if (!purpose) {
      throw new Error('Spec must have a Purpose section');
    }
    
    if (!requirementsSection) {
      throw new Error('Spec must have a Requirements section');
    }

    const requirements = this.parseRequirements(requirementsSection);

    return {
      name,
      overview: purpose.trim(),
      requirements,
      metadata: {
        version: '1.0.0',
        format: 'openspec',
      },
    };
  }

  parseChange(name: string): Change {
    const sections = this.parseSections();
    const why = this.findSection(sections, 'Why')?.content || '';
    const whatChanges = this.findSection(sections, 'What Changes')?.content || '';
    
    if (!why) {
      throw new Error('Change must have a Why section');
    }
    
    if (!whatChanges) {
      throw new Error('Change must have a What Changes section');
    }

    const deltas = this.parseDeltas(whatChanges);

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

  protected parseSections(): Section[] {
    const sections: Section[] = [];
    const stack: Section[] = [];
    
    for (let i = 0; i < this.lines.length; i++) {
      const line = this.lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const content = this.getContentUntilNextHeader(i + 1, level);
        
        const section: Section = {
          level,
          title,
          content,
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

  protected getContentUntilNextHeader(startLine: number, currentLevel: number): string {
    const contentLines: string[] = [];
    
    for (let i = startLine; i < this.lines.length; i++) {
      const line = this.lines[i];
      const headerMatch = line.match(/^(#{1,6})\s+/);
      
      if (headerMatch && headerMatch[1].length <= currentLevel) {
        break;
      }
      
      contentLines.push(line);
    }
    
    return contentLines.join('\n').trim();
  }

  protected findSection(sections: Section[], title: string): Section | undefined {
    for (const section of sections) {
      if (section.title.toLowerCase() === title.toLowerCase()) {
        return section;
      }
      const child = this.findSection(section.children, title);
      if (child) {
        return child;
      }
    }
    return undefined;
  }

  protected parseRequirements(section: Section): Requirement[] {
    const requirements: Requirement[] = [];
    
    for (const child of section.children) {
      // Extract requirement text from first non-empty content line, fall back to heading
      let text = child.title;
      
      // Get content before any child sections (scenarios)
      if (child.content.trim()) {
        // Split content into lines and find content before any child headers
        const lines = child.content.split('\n');
        const contentBeforeChildren: string[] = [];
        
        for (const line of lines) {
          // Stop at child headers (scenarios start with ####)
          if (line.trim().startsWith('#')) {
            break;
          }
          contentBeforeChildren.push(line);
        }
        
        // Find first non-empty line
        const directContent = contentBeforeChildren.join('\n').trim();
        if (directContent) {
          const firstLine = directContent.split('\n').find(l => l.trim());
          if (firstLine) {
            text = firstLine.trim();
          }
        }
      }
      
      const scenarios = this.parseScenarios(child);
      
      requirements.push({
        text,
        scenarios,
      });
    }
    
    return requirements;
  }

  protected parseScenarios(requirementSection: Section): Scenario[] {
    const scenarios: Scenario[] = [];
    
    for (const scenarioSection of requirementSection.children) {
      // Store the raw text content of the scenario section
      if (scenarioSection.content.trim()) {
        scenarios.push({
          rawText: scenarioSection.content
        });
      }
    }
    
    return scenarios;
  }


  protected parseDeltas(content: string): Delta[] {
    const deltas: Delta[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      // Match both formats: **spec:** and **spec**:
      const deltaMatch = line.match(/^\s*-\s*\*\*([^*:]+)(?::\*\*|\*\*:)\s*(.+)$/);
      if (deltaMatch) {
        const specName = deltaMatch[1].trim();
        const description = deltaMatch[2].trim();
        
        let operation: DeltaOperation = 'MODIFIED';
        const lowerDesc = description.toLowerCase();
        
        // Use word boundaries to avoid false matches (e.g., "address" matching "add")
        // Check RENAMED first since it's more specific than patterns containing "new"
        if (/\brename(s|d|ing)?\b/.test(lowerDesc) || /\brenamed\s+(to|from)\b/.test(lowerDesc)) {
          operation = 'RENAMED';
        } else if (/\badd(s|ed|ing)?\b/.test(lowerDesc) || /\bcreate(s|d|ing)?\b/.test(lowerDesc) || /\bnew\b/.test(lowerDesc)) {
          operation = 'ADDED';
        } else if (/\bremove(s|d|ing)?\b/.test(lowerDesc) || /\bdelete(s|d|ing)?\b/.test(lowerDesc)) {
          operation = 'REMOVED';
        }
        
        deltas.push({
          spec: specName,
          operation,
          description,
        });
      }
    }
    
    return deltas;
  }
}