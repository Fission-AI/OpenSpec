import { MarkdownParser, Section } from './markdown-parser.js';
import { buildCodeFenceMask } from './requirement-text.js';
import { Change, Delta, DeltaOperation, Requirement } from '../schemas/index.js';
import path from 'path';
import { promises as fs } from 'fs';
import { discoverSpecFiles } from '../../utils/spec-discovery.js';

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
      throw new Error('Change 必须包含 Why 章节');
    }
    
    if (!whatChanges) {
      throw new Error('Change 必须包含 What Changes 章节');
    }

    // 从 What Changes 章节解析 delta（简单格式）
    const simpleDeltas = this.parseDeltas(whatChanges);
    
    // 检查是否有 delta 格式的 spec 文件
    const specsDir = path.join(this.changeDir, 'specs');
    const deltaDeltas = await this.parseDeltaSpecs(specsDir);
    
    // 合并两种类型的 delta，优先使用 delta 格式（如果可用）
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

    // 递归发现 delta spec 文件，以便也解析
    // specs/<area>/<capability>/spec.md 等嵌套布局（#1353）
    const specFiles = await discoverSpecFiles(specsDir);

    for (const { id, specFile } of specFiles) {
      try {
        const content = await fs.readFile(specFile, 'utf-8');
        const specDeltas = this.parseSpecDeltas(id, content);
        deltas.push(...specDeltas);
      } catch (error) {
        // Spec 文件可能不可读，这是可以接受的
        continue;
      }
    }

    return deltas;
  }

  /**
   * 从 delta 章节读取需求，忽略不是 `### Requirement: <name>` 的标题。
   *
   * Delta 章节通常带有分隔符标题，如 `### Documentation Requirements`。
   * 基础解析器将每个子标题都当作需求处理，这会产生一个没有场景的
   * 虚拟需求（#498）：归档会警告缺少场景，`show --json` 报告一个
   * 额外的 delta。delta 读取器已跳过这些标题并做了记录，因此这里
   * 保持两个读取器一致。
   *
   * 在此覆盖而非在 MarkdownParser 中进行，以保持主 spec 解析 —
   * `view`、`list`、`spec --json`、spec 验证 — 不受影响。
   */
  protected parseRequirements(section: Section): Requirement[] {
    return super.parseRequirements({
      ...section,
      children: section.children.filter((child) =>
        /^Requirement:\s*\S/i.test(child.title.trim())
      ),
    });
  }

  private parseSpecDeltas(specName: string, content: string): Delta[] {
    const deltas: Delta[] = [];
    const sections = this.parseSectionsFromContent(content);
    
    // 解析 ADDED 需求
    const addedSection = this.findSection(sections, 'ADDED Requirements');
    if (addedSection) {
      const requirements = this.parseRequirements(addedSection);
      requirements.forEach(req => {
        deltas.push({
          spec: specName,
          operation: 'ADDED' as DeltaOperation,
          description: `添加需求：${req.text}`,
          // 提供单数和复数形式以保证兼容性
          requirement: req,
          requirements: [req],
        });
      });
    }
    
    // 解析 MODIFIED 需求
    const modifiedSection = this.findSection(sections, 'MODIFIED Requirements');
    if (modifiedSection) {
      const requirements = this.parseRequirements(modifiedSection);
      requirements.forEach(req => {
        deltas.push({
          spec: specName,
          operation: 'MODIFIED' as DeltaOperation,
          description: `修改需求：${req.text}`,
          requirement: req,
          requirements: [req],
        });
      });
    }
    
    // 解析 REMOVED 需求
    const removedSection = this.findSection(sections, 'REMOVED Requirements');
    if (removedSection) {
      const requirements = this.parseRequirements(removedSection);
      requirements.forEach(req => {
        deltas.push({
          spec: specName,
          operation: 'REMOVED' as DeltaOperation,
          description: `删除需求：${req.text}`,
          requirement: req,
          requirements: [req],
        });
      });
    }
    
    // 解析 RENAMED 需求
    const renamedSection = this.findSection(sections, 'RENAMED Requirements');
    if (renamedSection) {
      const renames = this.parseRenames(renamedSection.content);
      renames.forEach(rename => {
        deltas.push({
          spec: specName,
          operation: 'RENAMED' as DeltaOperation,
          description: `将需求从 "${rename.from}" 重命名为 "${rename.to}"`,
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
