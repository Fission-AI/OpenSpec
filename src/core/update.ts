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
import { getTransformerForTool } from '../utils/command-references.js';
import { AI_TOOLS, OPENSPEC_DIR_NAME } from './config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from './command-generation/index.js';
import {
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
  formatDeferredGlobalPromptSummary,
  formatCleanupSummary,
  formatDetectionSummary,
  getLegacyGlobalPromptMatches,
  getLegacyWorkflowIdsForTool,
  getToolsFromLegacyArtifacts,
  omitGlobalLegacyPromptFiles,
  pickGlobalLegacyPromptFiles,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import { isInteractive } from '../utils/interactive.js';
import { getGlobalConfig, type Delivery, type Profile } from './global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS, CORE_WORKFLOWS } from './profiles.js';
import { getAvailableTools } from './available-tools.js';
import {
  WORKFLOW_TO_SKILL_DIR,
  getCommandConfiguredTools,
  getConfiguredToolsForProfileSync,
  getToolsNeedingProfileSync,
} from './profile-sync-drift.js';
import {
  scanInstalledWorkflows as scanInstalledWorkflowsShared,
  migrateIfNeeded as migrateIfNeededShared,
  migrateLegacySkillDirs,
} from './migration.js';
import {
  resolveCommandSurfaceCapability,
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
  shouldReconcileCommandFilesForTool,
  shouldRemoveSkillsForTool,
} from './command-surface.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

/**
 * Captures legacy migration side effects so update can refresh newly configured
 * tools and honor workflow subsets inferred from legacy Codex prompt filenames.
 */
type LegacyUpgradeResult = {
  newlyConfiguredTools: string[];
  workflowOverrides: Partial<Record<string, readonly (typeof ALL_WORKFLOWS)[number][]>>;
  deferredGlobalCleanup?: LegacyDetectionResult;
};

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  /** Force update even when tools are up to date */
  force?: boolean;
}

/**
 * Scans installed workflow artifacts (skills and managed commands) across all configured tools.
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

  /**
   * Refreshes OpenSpec skills and commands for all configured tools,
   * regenerating artifacts according to the effective profile and delivery mode.
   *
   * @param projectPath - Path to the project root containing the openspec directory
   */
  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const openspecPath = path.join(resolvedProjectPath, OPENSPEC_DIR_NAME);

    // 1. Check openspec directory exists
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
    }

    // 2. Migrate OpenSpec-managed skills left in renamed tool directories
    // (e.g. .kimi -> .kimi-code) so they stay detected and get refreshed,
    // then perform the one-time profile migration if needed before any
    // legacy upgrade generation.
    for (const migration of migrateLegacySkillDirs(resolvedProjectPath)) {
      console.log(chalk.dim(`Migrated ${migration.movedSkillDirs} skill director${migration.movedSkillDirs === 1 ? 'y' : 'ies'}: ${migration.from}/skills → ${migration.to}/skills`));
    }

    // Use detected tool directories to preserve existing opsx skills/commands.
    const detectedTools = getAvailableTools(resolvedProjectPath);
    migrateIfNeededShared(resolvedProjectPath, detectedTools);

    // 3. Read global config for profile/delivery
    const globalConfig = getGlobalConfig();
    const profile = globalConfig.profile ?? 'core';
    const delivery: Delivery = globalConfig.delivery ?? 'both';
    const profileWorkflows = getProfileWorkflows(profile, globalConfig.workflows);
    const desiredWorkflows = profileWorkflows.filter((workflow): workflow is (typeof ALL_WORKFLOWS)[number] =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
    );

    // 4. Detect and handle legacy artifacts + upgrade legacy tools using effective config
    const legacyUpgrade = await this.handleLegacyCleanup(
      resolvedProjectPath,
      desiredWorkflows,
      delivery
    );
    const {
      newlyConfiguredTools,
      workflowOverrides: legacyWorkflowOverrides,
      deferredGlobalCleanup,
    } = legacyUpgrade;

    // 5. Find configured tools
    const configuredTools = getConfiguredToolsForProfileSync(resolvedProjectPath);

    if (configuredTools.length === 0 && newlyConfiguredTools.length === 0) {
      if (deferredGlobalCleanup) {
        await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
      }
      console.log(chalk.yellow('No configured tools found.'));
      console.log(chalk.dim('Run "openspec init" to set up tools.'));
      return;
    }

    // 6. Check version status for all configured tools
    const commandConfiguredTools = getCommandConfiguredTools(resolvedProjectPath);
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
    const toolsNeedingConfigSync = getToolsNeedingProfileSync(
      resolvedProjectPath,
      desiredWorkflows,
      delivery,
      configuredTools
    );
    const toolsToUpdateSet = new Set<string>([
      ...toolsNeedingVersionUpdate,
      ...toolsNeedingConfigSync,
    ]);
    const toolsUpToDate = toolStatuses.filter((s) => !toolsToUpdateSet.has(s.toolId));

    if (!this.force && toolsToUpdateSet.size === 0 && newlyConfiguredTools.length === 0) {
      if (deferredGlobalCleanup) {
        await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
      }
      // All tools are up to date
      this.displayUpToDateMessage(toolStatuses);

      // Still check for new tool directories and extra workflows
      this.detectNewTools(resolvedProjectPath, configuredTools);
      this.displayExtraWorkflowsNote(resolvedProjectPath, configuredTools, desiredWorkflows);
      this.displayMissingCoreWorkflowsNote(profile, globalConfig.workflows);
      this.displaySetupNotes(configuredTools);
      return;
    }

    // 8. Display update plan
    if (this.force) {
      console.log(`Force updating ${configuredTools.length} tool(s): ${configuredTools.join(', ')}`);
    } else if (toolsToUpdateSet.size === 0) {
      console.log('No additional refresh needed after legacy migration.');
    } else {
      this.displayUpdatePlan([...toolsToUpdateSet], statusByTool, toolsUpToDate);
    }
    console.log();

    // 9. Determine what to generate based on delivery
    const deliveryIncludesCommands = delivery !== 'skills';
    // 10. Update tools (all if force, otherwise only those needing update)
    const toolsToUpdate = this.force ? configuredTools : [...toolsToUpdateSet];
    const updatedTools: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];
    const skillsInvocableCommandSkips: string[] = [];
    let removedCommandCount = 0;
    let removedSkillCount = 0;
    let removedDeselectedCommandCount = 0;
    let removedDeselectedSkillCount = 0;

    for (const toolId of toolsToUpdate) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool?.skillsDir) continue;

      const spinner = ora(`Updating ${tool.name}...`).start();

      try {
        const skillsDir = path.join(resolvedProjectPath, tool.skillsDir, 'skills');
        const shouldGenerateSkills = shouldGenerateSkillsForTool(tool.value, delivery);
        const shouldGenerateCommands = shouldGenerateCommandsForTool(tool.value, delivery);
        const toolWorkflows = legacyWorkflowOverrides[tool.value] ?? desiredWorkflows;
        const skillTemplates = getSkillTemplates(toolWorkflows);
        const commandContents = getCommandContents(toolWorkflows);

        // Generate skill files if delivery includes skills
        if (shouldGenerateSkills) {
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(skillsDir, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            const transformer = getTransformerForTool(tool.value, delivery);
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }

          removedDeselectedSkillCount += await this.removeUnselectedSkillDirs(skillsDir, toolWorkflows);
        }

        // Delete skill directories if delivery is commands-only
        if (shouldRemoveSkillsForTool(tool.value, delivery)) {
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

            removedDeselectedCommandCount += await this.removeUnselectedCommandFiles(
              resolvedProjectPath,
              toolId,
              toolWorkflows
            );
          }
        } else if (deliveryIncludesCommands && resolveCommandSurfaceCapability(tool.value) === 'skills-invocable') {
          skillsInvocableCommandSkips.push(tool.value);
        }

        // Delete command files if delivery is skills-only
        if (shouldReconcileCommandFilesForTool(tool.value, delivery)) {
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

    if (deferredGlobalCleanup) {
      await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
    }

    // 11. Summary
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')} (v${OPENSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ Failed: ${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }
    if (skillsInvocableCommandSkips.length > 0) {
      console.log(chalk.dim(`Commands skipped for: ${skillsInvocableCommandSkips.join(', ')} (uses skills)`));
    }
    if (removedCommandCount > 0) {
      console.log(chalk.dim(`Removed: ${removedCommandCount} command files (delivery: skills)`));
    }
    if (removedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${removedSkillCount} skill directories (delivery: commands)`));
    }
    if (removedDeselectedCommandCount > 0) {
      console.log(chalk.dim(`Removed: ${removedDeselectedCommandCount} command files (deselected workflows)`));
    }
    if (removedDeselectedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${removedDeselectedSkillCount} skill directories (deselected workflows)`));
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

    const configuredAndNewTools = [...new Set([...configuredTools, ...newlyConfiguredTools])];

    // 13. Detect new tool directories not currently configured
    this.detectNewTools(resolvedProjectPath, configuredAndNewTools);

    // 14. Display note about extra workflows not in profile
    this.displayExtraWorkflowsNote(resolvedProjectPath, configuredAndNewTools, desiredWorkflows);
    this.displayMissingCoreWorkflowsNote(profile, globalConfig.workflows);
    this.displaySetupNotes(configuredAndNewTools);

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
   * Shows manual setup notes for configured tools that need extra
   * configuration before they pick up generated files.
   */
  private displaySetupNotes(toolIds: string[]): void {
    for (const toolId of toolIds) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (tool?.setupNote) {
        console.log(chalk.yellow(`Setup required for ${tool.name}: ${tool.setupNote}`));
      }
    }
  }

  /**
   * Detects new tool directories that aren't currently configured and displays a hint.
   */
  private detectNewTools(projectPath: string, configuredTools: string[]): void {
    const availableTools = getAvailableTools(projectPath);
    const configuredSet = new Set(configuredTools);

    const newTools = availableTools.filter((t) => !configuredSet.has(t.value));

    if (newTools.length > 0) {
      const newToolNames = newTools.map((tool) => tool.name);
      const isSingleTool = newToolNames.length === 1;
      const toolNoun = isSingleTool ? 'tool' : 'tools';
      const pronoun = isSingleTool ? 'it' : 'them';
      console.log();
      console.log(
        chalk.yellow(
          `Detected new ${toolNoun}: ${newToolNames.join(', ')}. Run 'openspec init' to add ${pronoun}.`
        )
      );
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
   * Point out core workflows a custom profile is missing, so releases that
   * grow CORE_WORKFLOWS stay discoverable. Keep custom profiles user-owned;
   * do not mutate them.
   */
  private displayMissingCoreWorkflowsNote(profile: Profile, workflows?: readonly string[]): void {
    if (profile !== 'custom' || !workflows) {
      return;
    }

    const workflowSet = new Set(workflows);
    const missing = CORE_WORKFLOWS.filter((workflow) => !workflowSet.has(workflow));

    if (missing.length === 0) {
      return;
    }

    const label = missing.length === 1 ? 'workflow' : 'workflows';
    const pronoun = missing.length === 1 ? 'it' : 'them';
    console.log(chalk.dim(`Note: Your custom profile is missing ${missing.length} core ${label}: ${missing.join(', ')}`));
    console.log(chalk.dim(`Run \`openspec config profile\` to add ${pronoun}, or \`openspec config profile core\` to use the core set.`));
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
   * Removes skill directories for workflows that are no longer selected in the active profile.
   * Returns the number of directories removed.
   */
  private async removeUnselectedSkillDirs(
    skillsDir: string,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][]
  ): Promise<number> {
    const desiredSet = new Set(desiredWorkflows);
    let removed = 0;

    for (const workflow of ALL_WORKFLOWS) {
      if (desiredSet.has(workflow)) continue;
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
   * Removes command files for workflows that are no longer selected in the active profile.
   * Returns the number of files removed.
   */
  private async removeUnselectedCommandFiles(
    projectPath: string,
    toolId: string,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][]
  ): Promise<number> {
    let removed = 0;

    const adapter = CommandAdapterRegistry.get(toolId);
    if (!adapter) return 0;

    const desiredSet = new Set(desiredWorkflows);

    for (const workflow of ALL_WORKFLOWS) {
      if (desiredSet.has(workflow)) continue;
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
  private async handleLegacyCleanup(
    projectPath: string,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][],
    delivery: Delivery
  ): Promise<LegacyUpgradeResult> {
    // Detect legacy artifacts
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return { newlyConfiguredTools: [], workflowOverrides: {} }; // No legacy artifacts found
    }

    // Show what was detected
    const immediateSummary = formatDetectionSummary(omitGlobalLegacyPromptFiles(detection));
    const deferredSummary = formatDeferredGlobalPromptSummary(detection);
    if (immediateSummary || deferredSummary) {
      console.log();
      if (immediateSummary) {
        console.log(immediateSummary);
        console.log();
      }
      if (deferredSummary) {
        console.log(deferredSummary);
        console.log();
      }
    }

    const canPrompt = isInteractive();

    if (this.force) {
      const legacyUpgrade = await this.upgradeLegacyTools(
        projectPath,
        detection,
        canPrompt,
        desiredWorkflows,
        delivery
      );
      await this.performImmediateLegacyCleanup(projectPath, detection);
      return {
        ...legacyUpgrade,
        deferredGlobalCleanup: pickGlobalLegacyPromptFiles(
          detection,
          detection.globalSlashCommandFiles
        ),
      };
    }

    if (!canPrompt) {
      // Non-interactive mode without --force: warn and continue
      // (Unlike init, update doesn't abort - user may just want to update skills)
      console.log(chalk.yellow('⚠ Run with --force to auto-cleanup legacy files, or run interactively.'));
      console.log();
      return { newlyConfiguredTools: [], workflowOverrides: {} };
    }

    // Interactive mode: prompt for confirmation
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: 'Upgrade and clean up legacy files?',
      default: true,
    });

    if (shouldCleanup) {
      const legacyUpgrade = await this.upgradeLegacyTools(
        projectPath,
        detection,
        canPrompt,
        desiredWorkflows,
        delivery
      );
      await this.performImmediateLegacyCleanup(projectPath, detection);
      return {
        ...legacyUpgrade,
        deferredGlobalCleanup: pickGlobalLegacyPromptFiles(
          detection,
          detection.globalSlashCommandFiles
        ),
      };
    } else {
      console.log(chalk.dim('Skipping legacy cleanup. Continuing with skill update...'));
      console.log();
      return { newlyConfiguredTools: [], workflowOverrides: {} };
    }
  }

  /**
   * Cleans approved repo-local legacy artifacts before configured tools refresh.
   */
  private async performImmediateLegacyCleanup(
    projectPath: string,
    detection: LegacyDetectionResult
  ): Promise<void> {
    const immediateDetection = omitGlobalLegacyPromptFiles(detection);
    if (immediateDetection.hasLegacyArtifacts) {
      await this.performLegacyCleanup(projectPath, immediateDetection);
    }
  }

  /**
   * Cleans approved global Codex prompts after configured tools refresh so newly
   * installed replacement skills can retire their prompts in the same run.
   */
  private async performDeferredGlobalPromptCleanup(
    projectPath: string,
    detection: LegacyDetectionResult
  ): Promise<void> {
    const availableCodexWorkflows = new Set(scanInstalledWorkflows(projectPath, ['codex']));
    const removableMatches = getLegacyGlobalPromptMatches(detection)
      .filter((prompt) => prompt.workflowIds.every((workflowId) => availableCodexWorkflows.has(workflowId)));

    if (removableMatches.length > 0) {
      await this.performLegacyCleanup(
        projectPath,
        pickGlobalLegacyPromptFiles(
          detection,
          removableMatches.map((prompt) => prompt.path)
        )
      );
    }

    const blockedMatches = getLegacyGlobalPromptMatches(detection)
      .filter((prompt) => !removableMatches.some((match) => match.path === prompt.path));

    if (blockedMatches.length > 0) {
      console.log(chalk.yellow('Preserved deferred global prompts without replacement skills:'));
      for (const prompt of blockedMatches) {
        console.log(chalk.dim(`  - ${prompt.toolId}: ${prompt.path}`));
      }
      console.log();
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
   * Upgrades unconfigured legacy tools into the skills-based setup and carries
   * workflow overrides for migrations that should mirror legacy Codex prompts.
   */
  private async upgradeLegacyTools(
    projectPath: string,
    detection: LegacyDetectionResult,
    canPrompt: boolean,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][],
    delivery: Delivery
  ): Promise<LegacyUpgradeResult> {
    // Get tools that had legacy artifacts
    const legacyTools = getToolsFromLegacyArtifacts(detection);

    if (legacyTools.length === 0) {
      return { newlyConfiguredTools: [], workflowOverrides: {} };
    }

    // Get currently configured tools
    const configuredTools = getConfiguredToolsForProfileSync(projectPath);
    const configuredSet = new Set(configuredTools);

    // Filter to tools that aren't already configured
    const unconfiguredLegacyTools = legacyTools.filter((t) => !configuredSet.has(t));

    if (unconfiguredLegacyTools.length === 0) {
      return { newlyConfiguredTools: [], workflowOverrides: {} };
    }

    // Get valid tools (those with skillsDir)
    const validToolIds = new Set(getToolsWithSkillsDir());
    const validUnconfiguredTools = unconfiguredLegacyTools.filter((t) => validToolIds.has(t));

    if (validUnconfiguredTools.length === 0) {
      return { newlyConfiguredTools: [], workflowOverrides: {} };
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
        return { newlyConfiguredTools: [], workflowOverrides: {} };
      }
    }

    const inferredCodexWorkflows = getLegacyWorkflowIdsForTool(detection, 'codex');

    // Create skills/commands for selected tools using effective profile+delivery.
    const newlyConfigured: string[] = [];
    const workflowOverrides: LegacyUpgradeResult['workflowOverrides'] = {};

    for (const toolId of selectedTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool?.skillsDir) continue;

      const spinner = ora(`Setting up ${tool.name}...`).start();

      try {
        const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
        const shouldGenerateSkills = shouldGenerateSkillsForTool(tool.value, delivery);
        const shouldGenerateCommands = shouldGenerateCommandsForTool(tool.value, delivery);
        const toolWorkflows = (
          tool.value === 'codex' && inferredCodexWorkflows.length > 0
            ? inferredCodexWorkflows
            : desiredWorkflows
        );
        if (tool.value === 'codex' && inferredCodexWorkflows.length > 0) {
          workflowOverrides[tool.value] = inferredCodexWorkflows;
        }
        const skillTemplates = getSkillTemplates(toolWorkflows);
        const commandContents = getCommandContents(toolWorkflows);

        // Create skill files when delivery includes skills
        if (shouldGenerateSkills) {
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(skillsDir, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            const transformer = getTransformerForTool(tool.value, delivery);
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
        }

        // Create commands when delivery includes commands
        if (shouldGenerateCommands) {
          const adapter = CommandAdapterRegistry.get(tool.value);
          if (adapter) {
            const generatedCommands = generateCommands(commandContents, adapter);

            for (const cmd of generatedCommands) {
              const commandFile = path.isAbsolute(cmd.path) ? cmd.path : path.join(projectPath, cmd.path);
              await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
            }
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

    return { newlyConfiguredTools: newlyConfigured, workflowOverrides };
  }
}
