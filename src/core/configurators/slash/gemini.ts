import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';
import { FileSystemUtils } from '../../../utils/file-system.js';
import { TemplateManager } from '../../templates/index.js';
import { OPENSPEC_MARKERS } from '../../config.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.gemini/commands/openspec_proposal.toml',
  apply: '.gemini/commands/openspec_apply.toml', 
  archive: '.gemini/commands/openspec_archive.toml'
};

export class GeminiSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'gemini';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(_id: SlashCommandId): string | undefined {
    return undefined; // TOML doesn't use standard frontmatter
  }

  async generateAll(projectPath: string, _openspecDir: string): Promise<string[]> {
    const createdOrUpdated: string[] = [];

    for (const target of this.getTargets()) {
      const body = this.getBody(target.id);
      const filePath = FileSystemUtils.joinPath(projectPath, target.path);

      // Generate TOML format content for Gemini
      const tomlContent = this.generateTomlContent(target.id, body);

      await FileSystemUtils.writeFile(filePath, tomlContent);
      createdOrUpdated.push(target.path);
    }

    return createdOrUpdated;
  }

  async updateExisting(projectPath: string, _openspecDir: string): Promise<string[]> {
    const updated: string[] = [];

    for (const target of this.getTargets()) {
      const filePath = FileSystemUtils.joinPath(projectPath, target.path);
      if (await FileSystemUtils.fileExists(filePath)) {
        const body = this.getBody(target.id);
        const tomlContent = this.generateTomlContent(target.id, body);
        await FileSystemUtils.writeFile(filePath, tomlContent);
        updated.push(target.path);
      }
    }

    return updated;
  }

  private generateTomlContent(id: SlashCommandId, body: string): string {
    const commandNames: Record<SlashCommandId, string> = {
      proposal: 'OpenSpec: Proposal',
      apply: 'OpenSpec: Apply', 
      archive: 'OpenSpec: Archive'
    };

    const descriptions: Record<SlashCommandId, string> = {
      proposal: 'Scaffold a new OpenSpec change and validate strictly',
      apply: 'Implement an approved OpenSpec change and keep tasks in sync',
      archive: 'Archive a deployed OpenSpec change and update specs'
    };

    // Create the markdown content with proper frontmatter
    const markdownContent = `---
description: ${descriptions[id]}
---

${body}`;

    return `description = "${descriptions[id]}"

prompt = """
${markdownContent}
"""

# OpenSpec managed content - do not modify manually
[openspec]
managed = true
version = "1.0"
markers = { start = "${OPENSPEC_MARKERS.start}", end = "${OPENSPEC_MARKERS.end}" }
`;
  }
}