import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.clinerules/workflows/lightspec-proposal.md',
  apply: '.clinerules/workflows/lightspec-apply.md',
  archive: '.clinerules/workflows/lightspec-archive.md',
  'context-check': '.cline/commands/lightspec-context-check.md'
};

export class ClineSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'cline';
  readonly isAvailable = true;

  protected getRelativePath(id: SlashCommandId): string {
    return FILE_PATHS[id];
  }

  protected getFrontmatter(id: SlashCommandId): string | undefined {
    const descriptions: Record<SlashCommandId, string> = {
      proposal: 'Scaffold a new LightSpec change and validate strictly.',
      apply: 'Implement an approved LightSpec change and keep tasks in sync.',
      archive: 'Archive a deployed LightSpec change and update specs.',
      'context-check': 'Validate project context in agent instruction files and help populate missing information.'
    };
    const description = descriptions[id];
    return `# LightSpec: ${id.charAt(0).toUpperCase() + id.slice(1)}\n\n${description}`;
  }
}
