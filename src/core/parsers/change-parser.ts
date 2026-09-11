import { MarkdownParser, Section } from './markdown-parser.js';
import { buildCodeFenceMask } from './requirement-text.js';
import { parseDeltaSpec, type RequirementBlock } from './requirement-blocks.js';
import { Change, Delta, DeltaOperation, Requirement } from '../schemas/index.js';
import path from 'path';
import { promises as fs } from 'fs';
import { discoverSpecFiles, type DiscoveredSpec } from '../../utils/spec-discovery.js';

interface DeltaSection {
  operation: DeltaOperation;
  requirements: Requirement[];
  renames?: Array<{ from: string; to: string }>;
}

/** A header-only block for a REMOVED entry written in the bullet form. */
function removedNameBlock(name: string): RequirementBlock {
  const headerLine = `### Requirement: ${name}`;
  return { headerLine, name, raw: headerLine };
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

    // Delta spec files, when the change has any, are the only source of
    // structured deltas, even when they hold no entry archive can apply.
    // Falling back to the "What Changes" prose then reported operations that
    // never happen: a bullet-form REMOVED showed up as an invented MODIFIED.
    // The prose (simple format) is read only for a change with no delta specs.
    const specFiles = await discoverSpecFiles(path.join(this.changeDir, 'specs'));
    const deltas = specFiles.length > 0
      ? await this.parseDeltaSpecs(specFiles)
      : this.parseDeltas(whatChanges);

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

  // The spec files come from discoverSpecFiles, which walks specs/ recursively
  // so nested layouts like specs/<area>/<capability>/spec.md are parsed too (#1353)
  private async parseDeltaSpecs(specFiles: DiscoveredSpec[]): Promise<Delta[]> {
    const deltas: Delta[] = [];

    for (const { id, specFile } of specFiles) {
      try {
        const content = await fs.readFile(specFile, 'utf-8');
        const specDeltas = this.parseSpecDeltas(id, content);
        deltas.push(...specDeltas);
      } catch (error) {
        // Spec file might not be readable, which is okay
        continue;
      }
    }

    return deltas;
  }

  /**
   * Read requirements from a delta section, ignoring headers that are not
   * `### Requirement: <name>`.
   *
   * A delta section often carries divider headers such as
   * `### Documentation Requirements`. The base parser treats every child header
   * as a requirement, which invented a scenario-less requirement that does not
   * exist (#498): archive warned about a missing scenario, and `show --json`
   * reported an extra delta. The delta reader already skips these headers and
   * notes them, so this keeps the two readers in agreement.
   *
   * Overriding here rather than in MarkdownParser keeps main spec parsing —
   * `view`, `list`, `spec --json`, spec validation — untouched.
   */
  protected parseRequirements(section: Section): Requirement[] {
    return super.parseRequirements({
      ...section,
      children: section.children.filter((child) =>
        /^Requirement:\s*\S/i.test(child.title.trim())
      ),
    });
  }

  /**
   * The deltas in one spec file, read by parseDeltaSpec — the reader archive
   * applies — so what `show` reports is what archive will do. This used to be a
   * second reader that disagreed with it: a bullet-form REMOVED was invisible,
   * a repeated section header was read only once, and a RENAMED line written
   * with `*` or `+` was dropped.
   */
  private parseSpecDeltas(specName: string, content: string): Delta[] {
    const deltas: Delta[] = [];
    const plan = parseDeltaSpec(content);

    // Parse ADDED requirements
    this.toRequirements(plan.added).forEach(req => {
      deltas.push({
        spec: specName,
        operation: 'ADDED' as DeltaOperation,
        description: `Add requirement: ${req.text}`,
        // Provide both single and plural forms for compatibility
        requirement: req,
        requirements: [req],
      });
    });

    // Parse MODIFIED requirements
    this.toRequirements(plan.modified).forEach(req => {
      deltas.push({
        spec: specName,
        operation: 'MODIFIED' as DeltaOperation,
        description: `Modify requirement: ${req.text}`,
        requirement: req,
        requirements: [req],
      });
    });

    // Parse REMOVED requirements, in document order. A bullet-form entry
    // carries only a name, so it reads as a header-form removal with no body.
    const removedBlocks = [...plan.removedBlocks];
    const removed = plan.removed.map((name) => {
      const index = removedBlocks.findIndex((block) => block.name === name);
      return index === -1 ? removedNameBlock(name) : removedBlocks.splice(index, 1)[0];
    });
    this.toRequirements(removed).forEach(req => {
      deltas.push({
        spec: specName,
        operation: 'REMOVED' as DeltaOperation,
        description: `Remove requirement: ${req.text}`,
        requirement: req,
        requirements: [req],
      });
    });

    // Parse RENAMED requirements
    plan.renamed.forEach(rename => {
      deltas.push({
        spec: specName,
        operation: 'RENAMED' as DeltaOperation,
        description: `Rename requirement from "${rename.from}" to "${rename.to}"`,
        rename,
      });
    });

    return deltas;
  }

  /**
   * One Requirement per block, read by the same section parser (and the
   * header filter above) as before, so text and scenarios are unchanged.
   */
  private toRequirements(blocks: RequirementBlock[]): Requirement[] {
    return blocks.flatMap((block) => {
      const [headerLine, ...body] = block.raw.split('\n');
      // Canonical header: the delta reader also accepts `###Requirement:` with
      // no space, which the section parser would not see as a header.
      const title = headerLine.replace(/^###\s*/, '').trim();
      const [section] = this.parseSectionsFromContent([`### ${title}`, ...body].join('\n'));
      return this.parseRequirements({ level: 2, title: '', content: '', children: [section] });
    });
  }

  private parseSectionsFromContent(content: string): Section[] {
    const normalizedContent = ChangeParser.normalizeContent(content);
    const lines = normalizedContent.split('\n');
    const codeFenceLineMask = buildCodeFenceMask(lines);
    const sections: Section[] = [];
    const stack: Section[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (codeFenceLineMask[i]) {
        continue;
      }
      const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);
      
      if (headerMatch) {
        const level = headerMatch[1].length;
        const title = headerMatch[2].trim();
        const contentLines = this.getContentUntilNextHeaderFromLines(lines, codeFenceLineMask, i + 1, level);
        
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

  private getContentUntilNextHeaderFromLines(
    lines: string[],
    codeFenceLineMask: boolean[],
    startLine: number,
    currentLevel: number
  ): string[] {
    const contentLines: string[] = [];
    
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      const headerMatch = codeFenceLineMask[i] ? null : line.match(/^(#{1,6})\s+/);
      
      if (headerMatch && headerMatch[1].length <= currentLevel) {
        break;
      }
      
      contentLines.push(line);
    }
    
    return contentLines;
  }
}
