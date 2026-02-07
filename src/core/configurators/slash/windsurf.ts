import { SlashCommandConfigurator } from './base.js';
import { SlashCommandId } from '../../templates/index.js';

const FILE_PATHS: Record<SlashCommandId, string> = {
  proposal: '.windsurf/workflows/lightspec-proposal.md',
  apply: '.windsurf/workflows/lightspec-apply.md',
  archive: '.windsurf/workflows/lightspec-archive.md',
  'context-check': '.windsurf/workflows/lightspec-context-check.md'
};

export class WindsurfSlashCommandConfigurator extends SlashCommandConfigurator {
  readonly toolId = 'windsurf';
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
    return `---\ndescription: ${description}\nauto_execution_mode: 3\n---`;
  }
}
