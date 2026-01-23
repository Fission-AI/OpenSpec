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

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/**
 * Gets the list of tools with skillsDir configured.
 */
export function getToolsWithSkillsDir(): string[] {
  return AI_TOOLS.filter((t) => t.skillsDir).map((t) => t.value);
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

  // Validate --tool flag is provided or prompt interactively
  if (!options.tool) {
    const validTools = getToolsWithSkillsDir();
    const canPrompt = isInteractive(options);

    if (canPrompt && validTools.length > 0) {
      // Show animated welcome screen before tool selection
      const { showWelcomeScreen } = await import('../../ui/welcome-screen.js');
      await showWelcomeScreen();

      const { searchableMultiSelect } = await import('../../prompts/searchable-multi-select.js');

      const selectedTools = await searchableMultiSelect({
        message: `Select tools to set up (${validTools.length} available)`,
        pageSize: 15,
        choices: validTools.map((toolId) => {
          const tool = AI_TOOLS.find((t) => t.value === toolId);
          return { name: tool?.name || toolId, value: toolId };
        }),
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

  // Determine tools to set up
  const toolsToSetup = options.selectedTools || [options.tool!];

  // Validate all tools before starting
  const validatedTools: Array<{ value: string; name: string; skillsDir: string }> = [];
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

    validatedTools.push({ value: tool.value, name: tool.name, skillsDir: tool.skillsDir });
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

  // Print success message
  console.log();
  console.log(chalk.bold(`🧪 Experimental Artifact Workflow Setup Complete`));
  console.log();
  if (successfulTools.length > 0) {
    console.log(chalk.bold(`Tools configured: ${successfulTools.map(t => t.name).join(', ')}`));
  }
  if (failedTools.length > 0) {
    console.log(chalk.red(`Tools failed: ${failedTools.map(f => f.name).join(', ')}`));
  }
  console.log();

  console.log(chalk.bold('Skills Created:'));
  for (const file of allCreatedSkillFiles) {
    console.log(chalk.green('  ✓ ' + file));
  }
  console.log();

  if (anyCommandsSkipped) {
    console.log(chalk.yellow(`Command generation skipped for: ${toolsWithSkippedCommands.join(', ')} (no adapter)`));
    console.log();
  }

  if (allCreatedCommandFiles.length > 0) {
    console.log(chalk.bold('Slash Commands Created:'));
    for (const file of allCreatedCommandFiles) {
      console.log(chalk.green('  ✓ ' + file));
    }
    console.log();
  }

  // Config creation section (happens once, not per-tool)
  console.log('━'.repeat(70));
  console.log();
  console.log(chalk.bold('📋 Project Configuration (Optional)'));
  console.log();
  console.log('Configure project defaults for OpenSpec workflows.');
  console.log();

  // Check if config already exists
  const configPath = path.join(projectRoot, 'openspec', 'config.yaml');
  const configYmlPath = path.join(projectRoot, 'openspec', 'config.yml');
  const configExists = fs.existsSync(configPath) || fs.existsSync(configYmlPath);

  if (configExists) {
    // Config already exists, skip creation
    console.log(chalk.blue('ℹ️  openspec/config.yaml already exists. Skipping config creation.'));
    console.log();
    console.log('   To update config, edit openspec/config.yaml manually or:');
    console.log('   1. Delete openspec/config.yaml');
    console.log('   2. Run openspec artifact-experimental-setup again');
    console.log();
  } else if (!isInteractive(options)) {
    // Non-interactive mode (CI, automation, piped input, or --no-interactive flag)
    console.log(chalk.blue('ℹ️  Skipping config prompts (non-interactive mode)'));
    console.log();
    console.log('   To create config manually, add openspec/config.yaml with:');
    console.log(chalk.dim('   schema: spec-driven'));
    console.log();
  } else {
    // Create config with default schema
    const yamlContent = serializeConfig({ schema: DEFAULT_SCHEMA });

    try {
      await FileSystemUtils.writeFile(configPath, yamlContent);

      console.log();
      console.log(chalk.green('✓ Created openspec/config.yaml'));
      console.log();
      console.log(`   Default schema: ${chalk.cyan(DEFAULT_SCHEMA)}`);
      console.log();
      console.log(chalk.dim('   Edit the file to add project context and per-artifact rules.'));
      console.log();

      // Git commit suggestion with all tool directories
      const toolDirs = validatedTools.map(t => t.skillsDir + '/').join(' ');
      console.log(chalk.bold('To share with team:'));
      console.log(chalk.dim(`  git add openspec/config.yaml ${toolDirs}`));
      console.log(chalk.dim('  git commit -m "Setup OpenSpec experimental workflow"'));
      console.log();
    } catch (writeError) {
      // Handle file write errors
      console.error();
      console.error(chalk.red('✗ Failed to write openspec/config.yaml'));
      console.error(chalk.dim(`  ${(writeError as Error).message}`));
      console.error();
      console.error('Fallback: Create config manually:');
      console.error(chalk.dim('  1. Create openspec/config.yaml'));
      console.error(chalk.dim('  2. Copy the following content:'));
      console.error();
      console.error(chalk.dim(yamlContent));
      console.error();
    }
  }

  console.log('━'.repeat(70));
  console.log();
  console.log(chalk.bold('📖 Usage:'));
  console.log();
  console.log('  ' + chalk.cyan('Skills') + ' work automatically in compatible editors:');
  for (const tool of validatedTools) {
    console.log(`  • ${tool.name} - Skills in ${tool.skillsDir}/skills/`);
  }
  console.log();
  console.log('  Ask naturally:');
  console.log('  • "I want to start a new OpenSpec change to add <feature>"');
  console.log('  • "Continue working on this change"');
  console.log('  • "Implement the tasks for this change"');
  console.log();
  if (allCreatedCommandFiles.length > 0) {
    console.log('  ' + chalk.cyan('Slash Commands') + ' for explicit invocation:');
    console.log('  • /opsx:explore - Think through ideas, investigate problems');
    console.log('  • /opsx:new - Start a new change');
    console.log('  • /opsx:continue - Create the next artifact');
    console.log('  • /opsx:apply - Implement tasks');
    console.log('  • /opsx:ff - Fast-forward: create all artifacts at once');
    console.log('  • /opsx:sync - Sync delta specs to main specs');
    console.log('  • /opsx:verify - Verify implementation matches artifacts');
    console.log('  • /opsx:archive - Archive a completed change');
    console.log('  • /opsx:bulk-archive - Archive multiple completed changes');
    console.log();
  }
  // Report any failures at the end
  if (failedTools.length > 0) {
    console.log(chalk.red('⚠️  Some tools failed to set up:'));
    for (const { name, error } of failedTools) {
      console.log(chalk.red(`  • ${name}: ${error.message}`));
    }
    console.log();
  }

  console.log(chalk.yellow('💡 This is an experimental feature.'));
  console.log('   Feedback welcome at: https://github.com/Fission-AI/OpenSpec/issues');
  console.log();
}
