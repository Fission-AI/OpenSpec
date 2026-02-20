/**
 * Update Command
 *
 * Refreshes OpenSpec skills and commands for configured tools.
 * Supports profile-aware updates, delivery changes, migration, and smart update detection.
 */

import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { createRequire } from 'module';
import { FileSystemUtils } from '../utils/file-system.js';
import { transformToHyphenCommands } from '../utils/command-references.js';
import { AI_TOOLS, OPENSPEC_DIR_NAME } from './config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from './command-generation/index.js';
import {
  COMMAND_IDS,
  getConfiguredTools,
  getToolVersionStatus,
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
  getToolsWithSkillsDir,
  type ToolVersionStatus,
} from './shared/index.js';
import {
  detectLegacyArtifacts,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDetectionSummary,
  getToolsFromLegacyArtifacts,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import { isInteractive } from '../utils/interactive.js';
import { getGlobalConfig, type Delivery } from './global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS } from './profiles.js';
import { getAvailableTools } from './available-tools.js';
import {
  scanInstalledWorkflows as scanInstalledWorkflowsShared,
  migrateIfNeeded as migrateIfNeededShared,
} from './migration.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

/**
 * Maps workflow IDs to their skill directory names (used for delivery file cleanup).
 */
const WORKFLOW_TO_SKILL_DIR: Record<string, string> = {
  'explore': 'openspec-explore',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  /** Force update even when tools are up to date */
  force?: boolean;
}

/**
 * Scans installed workflow skill directories across all configured tools in the project.
 * Returns the union of detected workflow IDs that match ALL_WORKFLOWS.
 *
 * Wrapper around the shared migration module's scanInstalledWorkflows that accepts tool IDs.
 */
export function scanInstalledWorkflows(projectPath: string, toolIds: string[]): string[] {
  const tools = toolIds
    .map((id) => AI_TOOLS.find((t) => t.value === id))
    .filter((t): t is NonNullable<typeof t> => t != null);
  return scanInstalledWorkflowsShared(projectPath, tools);
}

export class UpdateCommand {
  private readonly force: boolean;

  constructor(options: UpdateCommandOptions = {}) {
    this.force = options.force ?? false;
  }

  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const openspecPath = path.join(resolvedProjectPath, OPENSPEC_DIR_NAME);

    // 1. Check openspec directory exists
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
    }

    // 2. Detect and handle legacy artifacts + upgrade legacy tools to new skills
    const newlyConfiguredTools = await this.handleLegacyCleanup(resolvedProjectPath);

    // 3. Find configured tools
    const configuredTools = this.getConfiguredToolsForUpdate(resolvedProjectPath);

    if (configuredTools.length === 0 && newlyConfiguredTools.length === 0) {
      console.log(chalk.yellow('No configured tools found.'));
      console.log(chalk.dim('Run "openspec init" to set up tools.'));
      return;
    }

    // 4. Perform one-time migration if needed (uses shared migration module)
    const allToolIds = [...new Set([...configuredTools, ...newlyConfiguredTools])];
    const allTools = allToolIds
      .map((id) => AI_TOOLS.find((t) => t.value === id))
      .filter((t): t is NonNullable<typeof t> => t != null);
    migrateIfNeededShared(resolvedProjectPath, allTools);

    // 5. Read global config for profile/delivery
    const globalConfig = getGlobalConfig();
    const profile = globalConfig.profile ?? 'core';
    const delivery: Delivery = globalConfig.delivery ?? 'both';
    const profileWorkflows = getProfileWorkflows(profile, globalConfig.workflows);
    const desiredWorkflows = profileWorkflows.filter((workflow): workflow is (typeof ALL_WORKFLOWS)[number] =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
    );
    const shouldGenerateSkills = delivery !== 'commands';
    const shouldGenerateCommands = delivery !== 'skills';

    // 6. Check version status for all configured tools
    const commandConfiguredTools = this.getCommandConfiguredTools(resolvedProjectPath);
    const commandConfiguredSet = new Set(commandConfiguredTools);
    const toolStatuses = configuredTools.map((toolId) => {
      const status = getToolVersionStatus(resolvedProjectPath, toolId, OPENSPEC_VERSION);
      if (!status.configured && commandConfiguredSet.has(toolId)) {
        return { ...status, configured: true };
      }
      return status;
    });
    const statusByTool = new Map(toolStatuses.map((status) => [status.toolId, status] as const));

    // 7. Smart update detection
    const toolsNeedingVersionUpdate = toolStatuses
      .filter((s) => s.needsUpdate)
      .map((s) => s.toolId);
    const toolsNeedingConfigSync = configuredTools.filter((toolId) =>
      this.hasProfileOrDeliveryDrift(
        resolvedProjectPath,
        toolId,
        desiredWorkflows,
        shouldGenerateSkills,
        shouldGenerateCommands
      )
    );
    const toolsToUpdateSet = new Set<string>([
      ...toolsNeedingVersionUpdate,
      ...toolsNeedingConfigSync,
    ]);
    const toolsUpToDate = toolStatuses.filter((s) => !toolsToUpdateSet.has(s.toolId));

    if (!this.force && toolsToUpdateSet.size === 0) {
      // All tools are up to date
      this.displayUpToDateMessage(toolStatuses);

      // Still check for new tool directories and extra workflows
      this.detectNewTools(resolvedProjectPath, configuredTools);
      this.displayExtraWorkflowsNote(resolvedProjectPath, configuredTools, desiredWorkflows);
      return;
    }

    // 8. Display update plan
    if (this.force) {
      console.log(`Force updating ${configuredTools.length} tool(s): ${configuredTools.join(', ')}`);
    } else {
      this.displayUpdatePlan([...toolsToUpdateSet], statusByTool, toolsUpToDate);
    }
    console.log();

    // 9. Determine what to generate based on delivery
    const skillTemplates = shouldGenerateSkills ? getSkillTemplates(desiredWorkflows) : [];
    const commandContents = shouldGenerateCommands ? getCommandContents(desiredWorkflows) : [];

    // 10. Update tools (all if force, otherwise only those needing update)
    const toolsToUpdate = this.force ? configuredTools : [...toolsToUpdateSet];
    const updatedTools: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];
    let removedCommandCount = 0;
    let removedSkillCount = 0;

    for (const toolId of toolsToUpdate) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool?.skillsDir) continue;

      const spinner = ora(`Updating ${tool.name}...`).start();

      try {
        const skillsDir = path.join(resolvedProjectPath, tool.skillsDir, 'skills');

        // Generate skill files if delivery includes skills
        if (shouldGenerateSkills) {
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(skillsDir, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            // Use hyphen-based command references for OpenCode
            const transformer = tool.value === 'opencode' ? transformToHyphenCommands : undefined;
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
        }

        // Delete skill directories if delivery is commands-only
        if (!shouldGenerateSkills) {
          removedSkillCount += await this.removeSkillDirs(skillsDir);
        }

        // Generate commands if delivery includes commands
        if (shouldGenerateCommands) {
          const adapter = CommandAdapterRegistry.get(tool.value);
          if (adapter) {
            const generatedCommands = generateCommands(commandContents, adapter);

            for (const cmd of generatedCommands) {
              const commandFile = path.isAbsolute(cmd.path) ? cmd.path : path.join(resolvedProjectPath, cmd.path);
              await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
            }
          }
        }

        // Delete command files if delivery is skills-only
        if (!shouldGenerateCommands) {
          removedCommandCount += await this.removeCommandFiles(resolvedProjectPath, toolId);
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

    // 11. Summary
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')} (v${OPENSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ Failed: ${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }
    if (removedCommandCount > 0) {
      console.log(chalk.dim(`Removed: ${removedCommandCount} command files (delivery: skills)`));
    }
    if (removedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${removedSkillCount} skill directories (delivery: commands)`));
    }

    // 12. Show onboarding message for newly configured tools from legacy upgrade
    if (newlyConfiguredTools.length > 0) {
      console.log();
      console.log(chalk.bold('Getting started:'));
      console.log('  /opsx:new       Start a new change');
      console.log('  /opsx:continue  Create the next artifact');
      console.log('  /opsx:apply     Implement tasks');
      console.log();
      console.log(`Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec')}`);
    }

    // 13. Detect new tool directories not currently configured
    this.detectNewTools(resolvedProjectPath, configuredTools);

    // 14. Display note about extra workflows not in profile
    this.displayExtraWorkflowsNote(resolvedProjectPath, configuredTools, desiredWorkflows);

    // 15. List affected tools
    if (updatedTools.length > 0) {
      const toolDisplayNames = updatedTools;
      console.log(chalk.dim(`Tools: ${toolDisplayNames.join(', ')}`));
    }

    console.log();
    console.log(chalk.dim('Restart your IDE for changes to take effect.'));
  }

  /**
   * Display message when all tools are up to date.
   */
  private displayUpToDateMessage(toolStatuses: ToolVersionStatus[]): void {
    const toolNames = toolStatuses.map((s) => s.toolId);
    console.log(chalk.green(`✓ All ${toolStatuses.length} tool(s) up to date (v${OPENSPEC_VERSION})`));
    console.log(chalk.dim(`  Tools: ${toolNames.join(', ')}`));
    console.log();
    console.log(chalk.dim('Use --force to refresh files anyway.'));
  }

  /**
   * Display the update plan showing which tools need updating.
   */
  private displayUpdatePlan(
    toolsToUpdate: string[],
    statusByTool: Map<string, ToolVersionStatus>,
    upToDate: ToolVersionStatus[]
  ): void {
    const updates = toolsToUpdate.map((toolId) => {
      const status = statusByTool.get(toolId);
      if (status?.needsUpdate) {
        const fromVersion = status.generatedByVersion ?? 'unknown';
        return `${status.toolId} (${fromVersion} → ${OPENSPEC_VERSION})`;
      }
      return `${toolId} (config sync)`;
    });

    console.log(`Updating ${toolsToUpdate.length} tool(s): ${updates.join(', ')}`);

    if (upToDate.length > 0) {
      const upToDateNames = upToDate.map((s) => s.toolId);
      console.log(chalk.dim(`Already up to date: ${upToDateNames.join(', ')}`));
    }
  }

  /**
   * Returns tools that are configured via either skills or commands.
   */
  private getConfiguredToolsForUpdate(projectPath: string): string[] {
    const skillConfigured = getConfiguredTools(projectPath);
    const commandConfigured = this.getCommandConfiguredTools(projectPath);
    return [...new Set([...skillConfigured, ...commandConfigured])];
  }

  /**
   * Returns tools with at least one generated command file on disk.
   */
  private getCommandConfiguredTools(projectPath: string): string[] {
    return AI_TOOLS
      .filter((tool) => {
        if (!tool.skillsDir) return false;
        const toolDir = path.join(projectPath, tool.skillsDir);
        try {
          return fs.statSync(toolDir).isDirectory();
        } catch {
          return false;
        }
      })
      .map((tool) => tool.value)
      .filter((toolId) => this.toolHasAnyConfiguredCommand(projectPath, toolId));
  }

  /**
   * Checks whether a tool has at least one generated OpenSpec command file.
   */
  private toolHasAnyConfiguredCommand(projectPath: string, toolId: string): boolean {
    const adapter = CommandAdapterRegistry.get(toolId);
    if (!adapter) return false;

    for (const commandId of COMMAND_IDS) {
      const cmdPath = adapter.getFilePath(commandId);
      const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);
      if (fs.existsSync(fullPath)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Detects if profile or delivery settings require a file-level sync.
   */
  private hasProfileOrDeliveryDrift(
    projectPath: string,
    toolId: string,
    profileWorkflows: readonly (typeof ALL_WORKFLOWS)[number][],
    shouldGenerateSkills: boolean,
    shouldGenerateCommands: boolean
  ): boolean {
    const tool = AI_TOOLS.find((t) => t.value === toolId);
    if (!tool?.skillsDir) return false;

    const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
    const adapter = CommandAdapterRegistry.get(toolId);

    if (shouldGenerateSkills) {
      for (const workflow of profileWorkflows) {
        const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
        if (!dirName) continue;
        const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
        if (!fs.existsSync(skillFile)) {
          return true;
        }
      }
    } else {
      for (const workflow of ALL_WORKFLOWS) {
        const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
        if (!dirName) continue;
        const skillDir = path.join(skillsDir, dirName);
        if (fs.existsSync(skillDir)) {
          return true;
        }
      }
    }

    if (shouldGenerateCommands && adapter) {
      for (const workflow of profileWorkflows) {
        const cmdPath = adapter.getFilePath(workflow);
        const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);
        if (!fs.existsSync(fullPath)) {
          return true;
        }
      }
    } else if (!shouldGenerateCommands && adapter) {
      for (const workflow of ALL_WORKFLOWS) {
        const cmdPath = adapter.getFilePath(workflow);
        const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);
        if (fs.existsSync(fullPath)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Detects new tool directories that aren't currently configured and displays a hint.
   */
  private detectNewTools(projectPath: string, configuredTools: string[]): void {
    const availableTools = getAvailableTools(projectPath);
    const configuredSet = new Set(configuredTools);

    const newTools = availableTools.filter((t) => !configuredSet.has(t.value));

    if (newTools.length > 0) {
      console.log();
      for (const tool of newTools) {
        console.log(chalk.yellow(`Detected new tool: ${tool.name}. Run 'openspec init' to add it.`));
      }
    }
  }

  /**
   * Displays a note about extra workflows installed that aren't in the current profile.
   */
  private displayExtraWorkflowsNote(
    projectPath: string,
    configuredTools: string[],
    profileWorkflows: readonly string[]
  ): void {
    const installedWorkflows = scanInstalledWorkflows(projectPath, configuredTools);
    const profileSet = new Set(profileWorkflows);
    const extraWorkflows = installedWorkflows.filter((w) => !profileSet.has(w));

    if (extraWorkflows.length > 0) {
      console.log(chalk.dim(`Note: ${extraWorkflows.length} extra workflows not in profile (use \`openspec config profile\` to manage)`));
    }
  }

  /**
   * Removes skill directories for workflows when delivery changed to commands-only.
   * Returns the number of directories removed.
   */
  private async removeSkillDirs(skillsDir: string): Promise<number> {
    let removed = 0;

    for (const workflow of ALL_WORKFLOWS) {
      const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
      if (!dirName) continue;

      const skillDir = path.join(skillsDir, dirName);
      try {
        if (fs.existsSync(skillDir)) {
          await fs.promises.rm(skillDir, { recursive: true, force: true });
          removed++;
        }
      } catch {
        // Ignore errors
      }
    }

    return removed;
  }

  /**
   * Removes command files for workflows when delivery changed to skills-only.
   * Returns the number of files removed.
   */
  private async removeCommandFiles(
    projectPath: string,
    toolId: string,
  ): Promise<number> {
    let removed = 0;

    const adapter = CommandAdapterRegistry.get(toolId);
    if (!adapter) return 0;

    for (const workflow of ALL_WORKFLOWS) {
      const cmdPath = adapter.getFilePath(workflow);
      const fullPath = path.isAbsolute(cmdPath) ? cmdPath : path.join(projectPath, cmdPath);

      try {
        if (fs.existsSync(fullPath)) {
          await fs.promises.unlink(fullPath);
          removed++;
        }
      } catch {
        // Ignore errors
      }
    }

    return removed;
  }

  /**
   * Detect and handle legacy OpenSpec artifacts.
   * Unlike init, update warns but continues if legacy files found in non-interactive mode.
   * Returns array of tool IDs that were newly configured during legacy upgrade.
   */
  private async handleLegacyCleanup(projectPath: string): Promise<string[]> {
    // Detect legacy artifacts
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return []; // No legacy artifacts found
    }

    // Show what was detected
    console.log();
    console.log(formatDetectionSummary(detection));
    console.log();

    const canPrompt = isInteractive();

    if (this.force) {
      // --force flag: proceed with cleanup automatically
      await this.performLegacyCleanup(projectPath, detection);
      // Then upgrade legacy tools to new skills
      return this.upgradeLegacyTools(projectPath, detection, canPrompt);
    }

    if (!canPrompt) {
      // Non-interactive mode without --force: warn and continue
      // (Unlike init, update doesn't abort - user may just want to update skills)
      console.log(chalk.yellow('⚠ Run with --force to auto-cleanup legacy files, or run interactively.'));
      console.log();
      return [];
    }

    // Interactive mode: prompt for confirmation
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: 'Upgrade and clean up legacy files?',
      default: true,
    });

    if (shouldCleanup) {
      await this.performLegacyCleanup(projectPath, detection);
      // Then upgrade legacy tools to new skills
      return this.upgradeLegacyTools(projectPath, detection, canPrompt);
    } else {
      console.log(chalk.dim('Skipping legacy cleanup. Continuing with skill update...'));
      console.log();
      return [];
    }
  }

  /**
   * Perform cleanup of legacy artifacts.
   */
  private async performLegacyCleanup(projectPath: string, detection: LegacyDetectionResult): Promise<void> {
    const spinner = ora('Cleaning up legacy files...').start();

    const result = await cleanupLegacyArtifacts(projectPath, detection);

    spinner.succeed('Legacy files cleaned up');

    const summary = formatCleanupSummary(result);
    if (summary) {
      console.log();
      console.log(summary);
    }

    console.log();
  }

  /**
   * Upgrade legacy tools to new skills system.
   * Returns array of tool IDs that were newly configured.
   */
  private async upgradeLegacyTools(
    projectPath: string,
    detection: LegacyDetectionResult,
    canPrompt: boolean
  ): Promise<string[]> {
    // Get tools that had legacy artifacts
    const legacyTools = getToolsFromLegacyArtifacts(detection);

    if (legacyTools.length === 0) {
      return [];
    }

    // Get currently configured tools
    const configuredTools = this.getConfiguredToolsForUpdate(projectPath);
    const configuredSet = new Set(configuredTools);

    // Filter to tools that aren't already configured
    const unconfiguredLegacyTools = legacyTools.filter((t) => !configuredSet.has(t));

    if (unconfiguredLegacyTools.length === 0) {
      return [];
    }

    // Get valid tools (those with skillsDir)
    const validToolIds = new Set(getToolsWithSkillsDir());
    const validUnconfiguredTools = unconfiguredLegacyTools.filter((t) => validToolIds.has(t));

    if (validUnconfiguredTools.length === 0) {
      return [];
    }

    // Show what tools were detected from legacy artifacts
    console.log(chalk.bold('Tools detected from legacy artifacts:'));
    for (const toolId of validUnconfiguredTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      console.log(`  • ${tool?.name || toolId}`);
    }
    console.log();

    let selectedTools: string[];

    if (this.force || !canPrompt) {
      // Non-interactive with --force: auto-select detected tools
      selectedTools = validUnconfiguredTools;
      console.log(`Setting up skills for: ${selectedTools.join(', ')}`);
    } else {
      // Interactive mode: prompt for tool selection with detected tools pre-selected
      const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

      const sortedChoices = validUnconfiguredTools.map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        return {
          name: tool?.name || toolId,
          value: toolId,
          configured: false,
          preSelected: true, // Pre-select all detected legacy tools
        };
      });

      selectedTools = await searchableMultiSelect({
        message: 'Select tools to set up with the new skill system:',
        pageSize: 15,
        choices: sortedChoices,
        validate: (_selected: string[]) => true, // Allow empty selection (user can skip)
      });

      if (selectedTools.length === 0) {
        console.log(chalk.dim('Skipping tool setup.'));
        console.log();
        return [];
      }
    }

    // Create skills for selected tools
    const newlyConfigured: string[] = [];
    const skillTemplates = getSkillTemplates();
    const commandContents = getCommandContents();

    for (const toolId of selectedTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool?.skillsDir) continue;

      const spinner = ora(`Setting up ${tool.name}...`).start();

      try {
        const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

        // Create skill files
        for (const { template, dirName } of skillTemplates) {
          const skillDir = path.join(skillsDir, dirName);
          const skillFile = path.join(skillDir, 'SKILL.md');

          // Use hyphen-based command references for OpenCode
          const transformer = tool.value === 'opencode' ? transformToHyphenCommands : undefined;
          const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
          await FileSystemUtils.writeFile(skillFile, skillContent);
        }

        // Create commands
        const adapter = CommandAdapterRegistry.get(tool.value);
        if (adapter) {
          const generatedCommands = generateCommands(commandContents, adapter);

          for (const cmd of generatedCommands) {
            const commandFile = path.isAbsolute(cmd.path) ? cmd.path : path.join(projectPath, cmd.path);
            await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
          }
        }

        spinner.succeed(`Setup complete for ${tool.name}`);
        newlyConfigured.push(toolId);
      } catch (error) {
        spinner.fail(`Failed to set up ${tool.name}`);
        console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    if (newlyConfigured.length > 0) {
      console.log();
    }

    return newlyConfigured;
  }
}
