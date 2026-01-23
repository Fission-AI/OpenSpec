/**
 * Update Command
 *
 * Refreshes OpenSpec skills and commands for configured tools.
 */

import path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { FileSystemUtils } from '../utils/file-system.js';
import { AI_TOOLS, OPENSPEC_DIR_NAME } from './config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
  type CommandContent,
} from './command-generation/index.js';
import {
  getExploreSkillTemplate,
  getNewChangeSkillTemplate,
  getContinueChangeSkillTemplate,
  getApplyChangeSkillTemplate,
  getFfChangeSkillTemplate,
  getSyncSpecsSkillTemplate,
  getArchiveChangeSkillTemplate,
  getBulkArchiveChangeSkillTemplate,
  getVerifyChangeSkillTemplate,
  getOpsxExploreCommandTemplate,
  getOpsxNewCommandTemplate,
  getOpsxContinueCommandTemplate,
  getOpsxApplyCommandTemplate,
  getOpsxFfCommandTemplate,
  getOpsxSyncCommandTemplate,
  getOpsxArchiveCommandTemplate,
  getOpsxBulkArchiveCommandTemplate,
  getOpsxVerifyCommandTemplate,
} from './templates/skill-templates.js';

/**
 * Names of skill directories created by openspec.
 */
const SKILL_NAMES = [
  'openspec-explore',
  'openspec-new-change',
  'openspec-continue-change',
  'openspec-apply-change',
  'openspec-ff-change',
  'openspec-sync-specs',
  'openspec-archive-change',
  'openspec-bulk-archive-change',
  'openspec-verify-change',
];

/**
 * Checks if a tool has been configured (has skills).
 */
function isToolConfigured(projectRoot: string, toolId: string): boolean {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) {
    return false;
  }

  const skillsDir = path.join(projectRoot, tool.skillsDir, 'skills');

  // Check if at least one skill exists
  for (const skillName of SKILL_NAMES) {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      return true;
    }
  }

  return false;
}

/**
 * Gets all configured tools in the project.
 */
function getConfiguredTools(projectRoot: string): string[] {
  return AI_TOOLS
    .filter((t) => t.skillsDir && isToolConfigured(projectRoot, t.value))
    .map((t) => t.value);
}

export class UpdateCommand {
  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const openspecPath = path.join(resolvedProjectPath, OPENSPEC_DIR_NAME);

    // 1. Check openspec directory exists
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
    }

    // 2. Find configured tools
    const configuredTools = getConfiguredTools(resolvedProjectPath);

    if (configuredTools.length === 0) {
      console.log(chalk.yellow('No configured tools found.'));
      console.log(chalk.dim('Run "openspec init" to set up tools.'));
      return;
    }

    console.log(`Updating ${configuredTools.length} tool(s): ${configuredTools.join(', ')}`);
    console.log();

    // 3. Prepare templates
    const skillTemplates = [
      { template: getExploreSkillTemplate(), dirName: 'openspec-explore' },
      { template: getNewChangeSkillTemplate(), dirName: 'openspec-new-change' },
      { template: getContinueChangeSkillTemplate(), dirName: 'openspec-continue-change' },
      { template: getApplyChangeSkillTemplate(), dirName: 'openspec-apply-change' },
      { template: getFfChangeSkillTemplate(), dirName: 'openspec-ff-change' },
      { template: getSyncSpecsSkillTemplate(), dirName: 'openspec-sync-specs' },
      { template: getArchiveChangeSkillTemplate(), dirName: 'openspec-archive-change' },
      { template: getBulkArchiveChangeSkillTemplate(), dirName: 'openspec-bulk-archive-change' },
      { template: getVerifyChangeSkillTemplate(), dirName: 'openspec-verify-change' },
    ];

    const commandTemplates = [
      { template: getOpsxExploreCommandTemplate(), id: 'explore' },
      { template: getOpsxNewCommandTemplate(), id: 'new' },
      { template: getOpsxContinueCommandTemplate(), id: 'continue' },
      { template: getOpsxApplyCommandTemplate(), id: 'apply' },
      { template: getOpsxFfCommandTemplate(), id: 'ff' },
      { template: getOpsxSyncCommandTemplate(), id: 'sync' },
      { template: getOpsxArchiveCommandTemplate(), id: 'archive' },
      { template: getOpsxBulkArchiveCommandTemplate(), id: 'bulk-archive' },
      { template: getOpsxVerifyCommandTemplate(), id: 'verify' },
    ];

    const commandContents: CommandContent[] = commandTemplates.map(({ template, id }) => ({
      id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      body: template.content,
    }));

    // 4. Update each tool
    const updatedTools: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];

    for (const toolId of configuredTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool?.skillsDir) continue;

      const spinner = ora(`Updating ${tool.name}...`).start();

      try {
        const skillsDir = path.join(resolvedProjectPath, tool.skillsDir, 'skills');

        // Update skill files
        for (const { template, dirName } of skillTemplates) {
          const skillDir = path.join(skillsDir, dirName);
          const skillFile = path.join(skillDir, 'SKILL.md');

          const skillContent = `---
name: ${template.name}
description: ${template.description}
license: ${template.license || 'MIT'}
compatibility: ${template.compatibility || 'Requires openspec CLI.'}
metadata:
  author: ${template.metadata?.author || 'openspec'}
  version: "${template.metadata?.version || '1.0'}"
---

${template.instructions}
`;

          await FileSystemUtils.writeFile(skillFile, skillContent);
        }

        // Update commands
        const adapter = CommandAdapterRegistry.get(tool.value);
        if (adapter) {
          const generatedCommands = generateCommands(commandContents, adapter);

          for (const cmd of generatedCommands) {
            const commandFile = path.join(resolvedProjectPath, cmd.path);
            await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
          }
        }

        spinner.succeed(`Updated ${tool.name}`);
        updatedTools.push(tool.name);
      } catch (error) {
        spinner.fail(`Failed to update ${tool.name}`);
        failedTools.push({
          name: tool.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    // 5. Summary
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')}`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ Failed: ${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }

    console.log();
    console.log(chalk.dim('Restart your IDE for changes to take effect.'));
  }
}
