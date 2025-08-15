import { Spec, Change, Requirement, Scenario, Delta, DeltaOperation } from '../schemas/index.js';

interface Section {
  level: number;
  title: string;
  content: string;
  children: Section[];
}

export class MarkdownParser {
  private lines: string[];
  private currentLine: number;

  constructor(content: string) {
    this.lines = content.split('\n');
    this.currentLine = 0;
  }

  parseSpec(name: string): Spec {
    const sections = this.parseSections();
    const overview = this.findSection(sections, 'Overview')?.content || 
                    this.findSection(sections, 'Purpose')?.content || '';
    const requirementsSection = this.findSection(sections, 'Requirements') || 
                               this.findSection(sections, 'Behavior');
    
    if (!overview) {
      throw new Error('Spec must have an Overview or Purpose section');
    }
    
    if (!requirementsSection) {
      throw new Error('Spec must have a Requirements or Behavior section');
    }

    const requirements = this.parseRequirements(requirementsSection);

    return {
      name,
      overview: overview.trim(),
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

  private parseSections(): Section[] {
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

  private getContentUntilNextHeader(startLine: number, currentLevel: number): string {
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

  private findSection(sections: Section[], title: string): Section | undefined {
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

  private parseRequirements(section: Section): Requirement[] {
    const requirements: Requirement[] = [];
    
    for (const child of section.children) {
      // Extract the first line of content as the requirement text
      const contentLines = child.content.split('\n').filter(line => line.trim());
      const text = contentLines.length > 0 ? contentLines[0] : child.title;
      const scenarios = this.parseScenarios(child);
      
      requirements.push({
        text,
        scenarios,
      });
    }
    
    return requirements;
  }

  private parseScenarios(requirementSection: Section): Scenario[] {
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


  private parseDeltas(content: string): Delta[] {
    const deltas: Delta[] = [];
    const lines = content.split('\n');
    
    for (const line of lines) {
      const deltaMatch = line.match(/^\s*-\s*\*\*([^:]+):\*\*\s*(.+)$/);
      if (deltaMatch) {
        const specName = deltaMatch[1].trim();
        const description = deltaMatch[2].trim();
        
        let operation: DeltaOperation = 'MODIFIED';
        const lowerDesc = description.toLowerCase();
        
        // Use word boundaries to avoid false matches (e.g., "address" matching "add")
        if (/\badd(s|ed|ing)?\b/.test(lowerDesc) || /\bcreate(s|d|ing)?\b/.test(lowerDesc) || /\bnew\b/.test(lowerDesc)) {
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