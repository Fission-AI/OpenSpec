import path from 'path';
import { FileSystemUtils } from '../utils/file-system.js';
import { LIGHTSPEC_DIR_NAME } from './config.js';
import { ToolRegistry } from './configurators/registry.js';
import { AgentSkillRegistry } from './configurators/skills/registry.js';
import { agentsTemplate } from './templates/agents-template.js';

export class UpdateCommand {
  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const lightspecDirName = LIGHTSPEC_DIR_NAME;
    const lightspecPath = path.join(resolvedProjectPath, lightspecDirName);

    // 1. Check lightspec directory exists
    if (!await FileSystemUtils.directoryExists(lightspecPath)) {
      throw new Error(`No LightSpec directory found. Run 'lightspec init' first.`);
    }

    // 2. Update AGENTS.md (full replacement)
    const agentsPath = path.join(lightspecPath, 'AGENTS.md');

    await FileSystemUtils.writeFile(agentsPath, agentsTemplate);

    // 3. Update existing AI tool configuration files only
    const configurators = ToolRegistry.getAll();
    const skillConfigurators = AgentSkillRegistry.getAll();
    const updatedFiles: string[] = [];
    const createdFiles: string[] = [];
    const failedFiles: string[] = [];
    const updatedSkillFiles: string[] = [];
    const failedSkillTools: string[] = [];

    for (const configurator of configurators) {
      const configFilePath = path.join(
        resolvedProjectPath,
        configurator.configFileName
      );
      const fileExists = await FileSystemUtils.fileExists(configFilePath);
      const shouldConfigure =
        fileExists || configurator.configFileName === 'AGENTS.md';

      if (!shouldConfigure) {
        continue;
      }

      try {
        if (fileExists && !await FileSystemUtils.canWriteFile(configFilePath)) {
          throw new Error(
            `Insufficient permissions to modify ${configurator.configFileName}`
          );
        }

        await configurator.configure(resolvedProjectPath, lightspecPath);
        updatedFiles.push(configurator.configFileName);

        if (!fileExists) {
          createdFiles.push(configurator.configFileName);
        }
      } catch (error) {
        failedFiles.push(configurator.configFileName);
        console.error(
          `Failed to update ${configurator.configFileName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    for (const skillConfigurator of skillConfigurators) {
      if (!skillConfigurator.isAvailable) {
        continue;
      }

      try {
        const updated = await skillConfigurator.updateExisting(
          resolvedProjectPath,
          lightspecPath
        );
        updatedSkillFiles.push(...updated);
      } catch (error) {
        failedSkillTools.push(skillConfigurator.toolId);
        console.error(
          `Failed to update skills for ${skillConfigurator.toolId}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    const summaryParts: string[] = [];
    const instructionFiles: string[] = ['lightspec/AGENTS.md'];

    if (updatedFiles.includes('AGENTS.md')) {
      instructionFiles.push(
        createdFiles.includes('AGENTS.md') ? 'AGENTS.md (created)' : 'AGENTS.md'
      );
    }

    summaryParts.push(
      `Updated LightSpec instructions (${instructionFiles.join(', ')})`
    );

    const aiToolFiles = updatedFiles.filter((file) => file !== 'AGENTS.md');
    if (aiToolFiles.length > 0) {
      summaryParts.push(`Updated AI tool files: ${aiToolFiles.join(', ')}`);
    }

    if (updatedSkillFiles.length > 0) {
      // Normalize to forward slashes for cross-platform log consistency
      const normalized = updatedSkillFiles.map((p) => FileSystemUtils.toPosixPath(p));
      summaryParts.push(`Updated skills: ${normalized.join(', ')}`);
    }

    const failedItems = [
      ...failedFiles,
      ...failedSkillTools.map(
        (toolId) => `skill refresh (${toolId})`
      ),
    ];

    if (failedItems.length > 0) {
      summaryParts.push(`Failed to update: ${failedItems.join(', ')}`);
    }

    console.log(summaryParts.join(' | '));

    // No additional notes
  }
}
