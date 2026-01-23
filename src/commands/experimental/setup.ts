/**
 * Artifact Experimental Setup Command
 *
 * Generates Agent Skills and slash commands for the experimental artifact workflow.
 */

import ora from 'ora';
import chalk from 'chalk';
import path from 'path';
import * as fs from 'fs';
import { getExploreSkillTemplate, getNewChangeSkillTemplate, getContinueChangeSkillTemplate, getApplyChangeSkillTemplate, getFfChangeSkillTemplate, getSyncSpecsSkillTemplate, getArchiveChangeSkillTemplate, getBulkArchiveChangeSkillTemplate, getVerifyChangeSkillTemplate, getOpsxExploreCommandTemplate, getOpsxNewCommandTemplate, getOpsxContinueCommandTemplate, getOpsxApplyCommandTemplate, getOpsxFfCommandTemplate, getOpsxSyncCommandTemplate, getOpsxArchiveCommandTemplate, getOpsxBulkArchiveCommandTemplate, getOpsxVerifyCommandTemplate } from '../../core/templates/skill-templates.js';
import { FileSystemUtils } from '../../utils/file-system.js';
import { isInteractive } from '../../utils/interactive.js';
import { serializeConfig } from '../../core/config-prompts.js';
import { AI_TOOLS } from '../../core/config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
  type CommandContent,
} from '../../core/command-generation/index.js';
import { DEFAULT_SCHEMA } from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ArtifactExperimentalSetupOptions {
  tool?: string;
  interactive?: boolean;
  selectedTools?: string[];  // For multi-select from interactive prompt
}

/**
 * Status of experimental skill configuration for a tool.
 */
interface ToolExperimentalStatus {
  /** Whether the tool has any experimental skills configured */
  configured: boolean;
  /** Whether all 9 experimental skills are configured */
  fullyConfigured: boolean;
  /** Number of skills currently configured (0-9) */
  skillCount: number;
}

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

/**
 * Names of experimental skill directories created by openspec experimental.
 */
const EXPERIMENTAL_SKILL_NAMES = [
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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Gets the list of tools with skillsDir configured.
 */
export function getToolsWithSkillsDir(): string[] {
  return AI_TOOLS.filter((t) => t.skillsDir).map((t) => t.value);
}

/**
 * Checks which experimental skill files exist for a tool.
 */
function getToolExperimentalStatus(projectRoot: string, toolId: string): ToolExperimentalStatus {
  const tool = AI_TOOLS.find((t) => t.value === toolId);
  if (!tool?.skillsDir) {
    return { configured: false, fullyConfigured: false, skillCount: 0 };
  }

  const skillsDir = path.join(projectRoot, tool.skillsDir, 'skills');
  let skillCount = 0;

  for (const skillName of EXPERIMENTAL_SKILL_NAMES) {
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    if (fs.existsSync(skillFile)) {
      skillCount++;
    }
  }

  return {
    configured: skillCount > 0,
    fullyConfigured: skillCount === EXPERIMENTAL_SKILL_NAMES.length,
    skillCount,
  };
}

/**
 * Gets the experimental status for all tools with skillsDir configured.
 */
function getExperimentalToolStates(projectRoot: string): Map<string, ToolExperimentalStatus> {
  const states = new Map<string, ToolExperimentalStatus>();
  const toolIds = AI_TOOLS.filter((t) => t.skillsDir).map((t) => t.value);

  for (const toolId of toolIds) {
    states.set(toolId, getToolExperimentalStatus(projectRoot, toolId));
  }

  return states;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

/**
 * Generates Agent Skills and slash commands for the experimental artifact workflow.
 * Creates <toolDir>/skills/ directory with SKILL.md files following Agent Skills spec.
 * Creates slash commands using tool-specific adapters.
 */
export async function artifactExperimentalSetupCommand(options: ArtifactExperimentalSetupOptions): Promise<void> {
  const projectRoot = process.cwd();

  // Validate --tool flag or selectedTools is provided, or prompt interactively
  const hasToolsSpecified = options.tool || (options.selectedTools && options.selectedTools.length > 0);
  if (!hasToolsSpecified) {
    const validTools = getToolsWithSkillsDir();
    const canPrompt = isInteractive(options);

    if (canPrompt && validTools.length > 0) {
      // Show animated welcome screen before tool selection
      const { showWelcomeScreen } = await import('../../ui/welcome-screen.js');
      await showWelcomeScreen();

      const { searchableMultiSelect } = await import('../../prompts/searchable-multi-select.js');

      // Get experimental status for all tools to show configured indicators
      const toolStates = getExperimentalToolStates(projectRoot);

      // Build choices with configured status and sort configured tools first
      const sortedChoices = validTools
        .map((toolId) => {
          const tool = AI_TOOLS.find((t) => t.value === toolId);
          const status = toolStates.get(toolId);
          const configured = status?.configured ?? false;

          return {
            name: tool?.name || toolId,
            value: toolId,
            configured,
            preSelected: configured,  // Pre-select configured tools for easy refresh
          };
        })
        .sort((a, b) => {
          // Configured tools first
          if (a.configured && !b.configured) return -1;
          if (!a.configured && b.configured) return 1;
          return 0;
        });

      const selectedTools = await searchableMultiSelect({
        message: `Select tools to set up (${validTools.length} available)`,
        pageSize: 15,
        choices: sortedChoices,
        validate: (selected: string[]) => selected.length > 0 || 'Select at least one tool',
      });

      if (selectedTools.length === 0) {
        throw new Error('At least one tool must be selected');
      }

      options.tool = selectedTools[0];
      options.selectedTools = selectedTools;
    } else {
      throw new Error(
        `Missing required option --tool. Valid tools with skill generation support:\n  ${validTools.join('\n  ')}`
      );
    }
  }

  // Determine tools to set up - prefer selectedTools if provided
  const toolsToSetup = options.selectedTools && options.selectedTools.length > 0
    ? options.selectedTools
    : [options.tool!];

  // Get tool states before processing to track created vs refreshed
  const preSetupStates = getExperimentalToolStates(projectRoot);

  // Validate all tools before starting
  const validatedTools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> = [];
  for (const toolId of toolsToSetup) {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool) {
      const validToolIds = AI_TOOLS.map((t) => t.value);
      throw new Error(
        `Unknown tool '${toolId}'. Valid tools:\n  ${validToolIds.join('\n  ')}`
      );
    }

    if (!tool.skillsDir) {
      const validToolsWithSkills = getToolsWithSkillsDir();
      throw new Error(
        `Tool '${toolId}' does not support skill generation (no skillsDir configured).\nTools with skill generation support:\n  ${validToolsWithSkills.join('\n  ')}`
      );
    }

    const preState = preSetupStates.get(tool.value);
    validatedTools.push({
      value: tool.value,
      name: tool.name,
      skillsDir: tool.skillsDir,
      wasConfigured: preState?.configured ?? false,
    });
  }

  // Track all created files across all tools
  const allCreatedSkillFiles: string[] = [];
  const allCreatedCommandFiles: string[] = [];
  let anyCommandsSkipped = false;
  const toolsWithSkippedCommands: string[] = [];
  const failedTools: Array<{ name: string; error: Error }> = [];

  // Get skill and command templates once (shared across all tools)
  const exploreSkill = getExploreSkillTemplate();
  const newChangeSkill = getNewChangeSkillTemplate();
  const continueChangeSkill = getContinueChangeSkillTemplate();
  const applyChangeSkill = getApplyChangeSkillTemplate();
  const ffChangeSkill = getFfChangeSkillTemplate();
  const syncSpecsSkill = getSyncSpecsSkillTemplate();
  const archiveChangeSkill = getArchiveChangeSkillTemplate();
  const bulkArchiveChangeSkill = getBulkArchiveChangeSkillTemplate();
  const verifyChangeSkill = getVerifyChangeSkillTemplate();

  const skillTemplates = [
    { template: exploreSkill, dirName: 'openspec-explore' },
    { template: newChangeSkill, dirName: 'openspec-new-change' },
    { template: continueChangeSkill, dirName: 'openspec-continue-change' },
    { template: applyChangeSkill, dirName: 'openspec-apply-change' },
    { template: ffChangeSkill, dirName: 'openspec-ff-change' },
    { template: syncSpecsSkill, dirName: 'openspec-sync-specs' },
    { template: archiveChangeSkill, dirName: 'openspec-archive-change' },
    { template: bulkArchiveChangeSkill, dirName: 'openspec-bulk-archive-change' },
    { template: verifyChangeSkill, dirName: 'openspec-verify-change' },
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

  // Process each tool
  for (const tool of validatedTools) {
    const spinner = ora(`Setting up experimental artifact workflow for ${tool.name}...`).start();

    try {
      // Use tool-specific skillsDir
      const skillsDir = path.join(projectRoot, tool.skillsDir, 'skills');

      // Create skill directories and SKILL.md files
      for (const { template, dirName } of skillTemplates) {
        const skillDir = path.join(skillsDir, dirName);
        const skillFile = path.join(skillDir, 'SKILL.md');

        // Generate SKILL.md content with YAML frontmatter
        const skillContent = `---
name: ${template.name}
description: ${template.description}
---

${template.instructions}
`;

        // Write the skill file
        await FileSystemUtils.writeFile(skillFile, skillContent);
        allCreatedSkillFiles.push(path.relative(projectRoot, skillFile));
      }

      // Generate commands using the adapter system
      const adapter = CommandAdapterRegistry.get(tool.value);
      if (adapter) {
        const generatedCommands = generateCommands(commandContents, adapter);

        for (const cmd of generatedCommands) {
          const commandFile = path.join(projectRoot, cmd.path);
          await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
          allCreatedCommandFiles.push(cmd.path);
        }
      } else {
        anyCommandsSkipped = true;
        toolsWithSkippedCommands.push(tool.value);
      }

      spinner.succeed(`Setup complete for ${tool.name}!`);
    } catch (error) {
      spinner.fail(`Failed for ${tool.name}`);
      failedTools.push({ name: tool.name, error: error as Error });
    }
  }

  // If all tools failed, throw an error
  if (failedTools.length === validatedTools.length) {
    const errorMessages = failedTools.map(f => `  ${f.name}: ${f.error.message}`).join('\n');
    throw new Error(`All tools failed to set up:\n${errorMessages}`);
  }

  // Filter to only successfully configured tools
  const successfulTools = validatedTools.filter(t => !failedTools.some(f => f.name === t.name));

  // Print success summary
  console.log();
  console.log(chalk.bold('Experimental Artifact Workflow Setup Complete'));
  console.log();

  // Tools and counts (show unique counts, not total files across all tools)
  if (successfulTools.length > 0) {
    // Separate newly created tools from refreshed (previously configured) tools
    const createdTools = successfulTools.filter(t => !t.wasConfigured);
    const refreshedTools = successfulTools.filter(t => t.wasConfigured);

    if (createdTools.length > 0) {
      console.log(`Created: ${createdTools.map(t => t.name).join(', ')}`);
    }
    if (refreshedTools.length > 0) {
      console.log(`Refreshed: ${refreshedTools.map(t => t.name).join(', ')}`);
    }

    const uniqueSkillCount = skillTemplates.length;
    const uniqueCommandCount = commandContents.length;
    const toolDirs = [...new Set(successfulTools.map(t => t.skillsDir))].join(', ');
    // Only count commands if any were actually created (some tools may not have adapters)
    const hasCommands = allCreatedCommandFiles.length > 0;
    if (hasCommands) {
      console.log(`${uniqueSkillCount} skills and ${uniqueCommandCount} commands in ${toolDirs}/`);
    } else {
      console.log(`${uniqueSkillCount} skills in ${toolDirs}/`);
    }
  }

  if (failedTools.length > 0) {
    console.log(chalk.red(`Failed: ${failedTools.map(f => `${f.name} (${f.error.message})`).join(', ')}`));
  }

  if (anyCommandsSkipped) {
    console.log(chalk.dim(`Commands skipped for: ${toolsWithSkippedCommands.join(', ')} (no adapter)`));
  }

  // Config creation (simplified)
  const configPath = path.join(projectRoot, 'openspec', 'config.yaml');
  const configYmlPath = path.join(projectRoot, 'openspec', 'config.yml');
  const configYamlExists = fs.existsSync(configPath);
  const configYmlExists = fs.existsSync(configYmlPath);
  const configExists = configYamlExists || configYmlExists;

  if (configExists) {
    const existingConfigName = configYamlExists ? 'config.yaml' : 'config.yml';
    console.log(`Config: openspec/${existingConfigName} (exists)`);
  } else if (!isInteractive(options)) {
    console.log(chalk.dim(`Config: skipped (non-interactive mode)`));
  } else {
    const yamlContent = serializeConfig({ schema: DEFAULT_SCHEMA });
    try {
      await FileSystemUtils.writeFile(configPath, yamlContent);
      console.log(`Config: openspec/config.yaml (schema: ${DEFAULT_SCHEMA})`);
    } catch (writeError) {
      console.log(chalk.red(`Config: failed to create (${(writeError as Error).message})`));
    }
  }

  // Getting started
  console.log();
  console.log(chalk.bold('Getting started:'));
  console.log('  /opsx:new       Start a new change');
  console.log('  /opsx:continue  Create the next artifact');
  console.log('  /opsx:apply     Implement tasks');

  // Links
  console.log();
  console.log(`Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec/blob/main/docs/experimental-workflow.md')}`);
  console.log(`Feedback:   ${chalk.cyan('https://github.com/Fission-AI/OpenSpec/issues')}`);
  console.log();
}
