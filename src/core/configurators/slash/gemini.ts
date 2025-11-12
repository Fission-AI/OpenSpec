import { FileSystemUtils } from '../../../utils/file-system.js';
import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId, TemplateManager } from '../../templates/index.js';
import { OPENSPEC_MARKERS } from '../../config.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.gemini/commands/openspec/proposal.toml',
  apply: '.gemini/commands/openspec/apply.toml',
  archive: '.gemini/commands/openspec/archive.toml'
};

const DESCRIPTIONS: Record<SlashCommandId, string> = {
  proposal: 'Scaffold a new OpenSpec change and validate strictly.',
  apply: 'Implement an approved OpenSpec change and keep tasks in sync.',
  archive: 'Archive a deployed OpenSpec change and update specs.'
};

export class GeminiSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'gemini';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(_id: SlashCommandId): string | undefined {
    // TOML doesn't use separate frontmatter - it's all in one structure
    return undefined;
  }

  // Override to generate TOML format with markers inside the prompt field
  async generateAll(projectPath: string, _openspecDir: string): Promise<string[]> {
    const createdOrUpdated: string[] = [];

    for (const target of this.getTargets()) {
      const body = this.getBody(target.id);
      const filePath = FileSystemUtils.joinPath(projectPath, target.path);

      if (await FileSystemUtils.fileExists(filePath)) {
        await this.updateBody(filePath, body);
      } else {
        const tomlContent = this.generateTOML(target.id, body);
        await FileSystemUtils.writeFile(filePath, tomlContent);
      }

      createdOrUpdated.push(target.path);
    }

    return createdOrUpdated;
  }

  private generateTOML(id: SlashCommandId, body: string): string {
    const description = DESCRIPTIONS[id];

    // TOML format with triple-quoted string for multi-line prompt
    // Markers are inside the prompt value
    return `description = "${description}"

prompt = """
${OPENSPEC_MARKERS.start}
${body}
${OPENSPEC_MARKERS.end}
"""
`;
  }

  // Override updateBody to handle TOML format
  protected async updateBody(filePath: string, body: string): Promise<void> {
    const content = await FileSystemUtils.readFile(filePath);
    const startIndex = content.indexOf(OPENSPEC_MARKERS.start);
    const endIndex = content.indexOf(OPENSPEC_MARKERS.end);

    if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
      throw new Error(`Missing OpenSpec markers in ${filePath}`);
    }

    const before = content.slice(0, startIndex + OPENSPEC_MARKERS.start.length);
    const after = content.slice(endIndex);
    const updatedContent = `${before}\n${body}\n${after}`;

    await FileSystemUtils.writeFile(filePath, updatedContent);
  }
}
