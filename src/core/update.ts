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
import { getSkillReferenceTransformer, getTransformerForTool, transformToSkillReferences } from '../utils/command-references.js';
import { AI_TOOLS, OPENSPEC_DIR_NAME } from './config.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from './command-generation/index.js';
import {
  getToolSkillStatus,
  getToolVersionStatus,
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
  getToolsWithSkillsDir,
  hasGlobalSkillTarget,
  resolveToolSkillsDir,
  toolSupportsSkills,
  type ToolVersionStatus,
  formatIdeRestart,
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
  omitToolLegacyArtifacts,
  pickGlobalLegacyPromptFiles,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import { isInteractive } from '../utils/interactive.js';
import { getGlobalConfig, getGlobalConfigPath, serializeGlobalConfig, type Delivery, type Profile } from './global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS, CORE_WORKFLOWS } from './profiles.js';
import { formatOptionalWorkflowsNote, getOnboardingCommands } from './onboarding-commands.js';
import { getAvailableTools } from './available-tools.js';
import {
  WORKFLOW_TO_SKILL_DIR,
  getConfiguredToolsForProfileSync,
  getToolsNeedingProfileSync,
} from './profile-sync-drift.js';
import {
  scanInstalledWorkflows as scanInstalledWorkflowsShared,
  migrateIfNeeded as migrateIfNeededShared,
  computeProfileMigration,
  applyProfileMigration,
  findLegacyToolMigrations,
  planLegacyToolMigrations,
  migrateLegacyToolDirs,
  describeLegacyMigration,
  legacyMigrationNotice,
  keptInPlaceNotice,
  hasMovableContent,
  type LegacyToolMigration,
} from './migration.js';
import {
  resolveCommandSurfaceCapability,
  resolveCommandInvocation,
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
  shouldReconcileCommandFilesForTool,
  shouldRemoveSkillsForTool,
} from './command-surface.js';
import {
  resolveSharedSkillWriters,
  sharedSkillTargetMarkerPath,
} from './shared-skill-target.js';
import {
  realFileOps,
  UpdatePlanRecorder,
  type UpdateFileOps,
  type UpdatePlan,
} from './update-plan.js';
import { COPILOT_CLOUD_FILES, includesGitHubCopilot, writeCopilotCloudFiles, removeCopilotCloudFiles, isCopilotCloudEnabled, readCopilotCloudOptIn, findUnmanagedCloudFiles } from './github-copilot/cloud-agent.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

/**
 * Captures legacy migration side effects so update can refresh newly configured
 * tools and honor workflow subsets inferred from legacy Codex prompt filenames.
 */
type LegacyUpgradeResult = {
  newlyConfiguredTools: string[];
  workflowOverrides: Partial<Record<string, readonly (typeof ALL_WORKFLOWS)[number][]>>;
  failedTools?: ToolFailure[];
  deferredGlobalCleanup?: LegacyDetectionResult;
  /**
   * Tools whose skill generation was skipped because another tool already owns
   * their shared skills root. Their repo-local legacy artifacts must be exempt
   * from immediate cleanup — no replacement was written to justify deleting them.
   */
  skippedSharedSkillTools?: string[];
};

type ToolFailure = { name: string; error: string };

function throwIfUpdateFailed(failedTools: readonly ToolFailure[]): void {
  if (failedTools.length > 0) {
    throw new Error(`OpenSpec update failed for: ${failedTools.map((tool) => tool.name).join(', ')}`);
  }
}

/**
 * Checkout artifacts that are not real content drift: a UTF-8 BOM and the CRLF
 * line endings a Windows clone with `core.autocrlf` reintroduces on every
 * checkout of committed generated files.
 */
function normalizeGeneratedFile(content: string): string {
  return content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
}

/**
 * Options for the update command.
 */
export interface UpdateCommandOptions {
  /** Force update even when tools are up to date */
  force?: boolean;
  /**
   * Record what the update would change and write nothing. Set by `plan()`;
   * callers use that instead of passing this directly.
   */
  dryRun?: boolean;
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
  private readonly dryRun: boolean;
  private recorder: UpdatePlanRecorder | null = null;
  private ops: UpdateFileOps = realFileOps;

  constructor(options: UpdateCommandOptions = {}) {
    this.force = options.force ?? false;
    this.dryRun = options.dryRun ?? false;
  }

  /**
   * Reports what `execute` would add, change or delete, writing nothing.
   *
   * Same code path as the real update: the plan is recorded by the write seam
   * the generation loop already goes through, so it cannot drift from it.
   */
  async plan(projectPath: string): Promise<UpdatePlan> {
    if (!this.dryRun) {
      throw new Error('plan() requires the update command to be constructed with dryRun: true');
    }
    await this.execute(projectPath);
    return this.recorder?.getPlan() ?? { changes: [], notes: [], failures: [] };
  }

  /** Prints progress on a real run, stays quiet while planning. */
  private log(...args: unknown[]): void {
    if (this.dryRun) return;
    console.log(...args);
  }

  /** A spinner on a real run, a no-op while planning. */
  private startSpinner(text: string): {
    succeed(text: string): void;
    fail(text: string): void;
    info(text: string): void;
  } {
    if (this.dryRun) {
      return { succeed: () => {}, fail: () => {}, info: () => {} };
    }
    return ora(text).start();
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

    if (this.dryRun) {
      this.recorder = new UpdatePlanRecorder(resolvedProjectPath);
      this.ops = this.recorder;
    }

    // 1. Check openspec directory exists
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`No OpenSpec directory found. Run 'openspec init' first.`);
    }

    // 2. Migrate OpenSpec-managed skills left in renamed tool directories
    // (e.g. .kimi -> .kimi-code) so they stay detected and get refreshed,
    // then perform the one-time profile migration if needed before any
    // legacy upgrade generation.
    if (!this.dryRun) {
      for (const migration of migrateLegacyToolDirs(resolvedProjectPath)) {
        if (hasMovableContent(migration)) {
          this.log(chalk.dim(`Migrated ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
        }
        this.reportKeptInPlace(migration);
      }
    }
    // A dry run plans the same moves. They change what is installed where, so
    // every later step reads the recorder's view of the moved tree, and a tool
    // that only had files in its former root is refreshed like any other.
    const movedInTools = this.dryRun
      ? await this.planLegacyToolMoves(resolvedProjectPath, 'before-generation')
      : new Set<string>();
    const declinedMigrations = this.dryRun
      ? []
      : await this.offerConsentedLegacyMigrations(resolvedProjectPath);

    // Use detected tool directories to preserve existing opsx skills/commands.
    const detectedTools = getAvailableTools(resolvedProjectPath);
    if (!this.dryRun) {
      migrateIfNeededShared(resolvedProjectPath, detectedTools);
    }

    // 3. Read global config for profile/delivery. A dry run plans the one-time
    //    profile migration's save instead of making it, and resolves against
    //    the config that save would leave — otherwise the preview would plan
    //    for a different profile than the real update acts on.
    let globalConfig = getGlobalConfig();
    if (this.recorder) {
      const migration = computeProfileMigration(
        resolvedProjectPath,
        detectedTools,
        this.recorder.view.exists
      );
      if (migration) {
        globalConfig = applyProfileMigration(migration);
        await this.recorder.writeFile(
          getGlobalConfigPath(),
          serializeGlobalConfig(globalConfig),
          'openspec'
        );
      }
    }
    const profile = globalConfig.profile ?? 'core';
    const delivery: Delivery = globalConfig.delivery ?? 'both';
    const profileWorkflows = getProfileWorkflows(profile, globalConfig.workflows);
    const desiredWorkflows = profileWorkflows.filter((workflow): workflow is (typeof ALL_WORKFLOWS)[number] =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
    );

    // 4. Detect and handle legacy artifacts + upgrade legacy tools using effective config
    const legacyUpgrade = this.dryRun
      ? await this.noteSkippedLegacyCleanup(resolvedProjectPath)
      : await this.handleLegacyCleanup(resolvedProjectPath, desiredWorkflows, delivery);
    const {
      newlyConfiguredTools,
      workflowOverrides: legacyWorkflowOverrides,
      deferredGlobalCleanup,
      failedTools: legacyUpgradeFailures = [],
    } = legacyUpgrade;

    // 5. Find configured tools
    const configuredTools = [
      ...new Set([...getConfiguredToolsForProfileSync(resolvedProjectPath), ...movedInTools]),
    ];
    const configuredAndNewTools = [...new Set([...configuredTools, ...newlyConfiguredTools])];

    if (configuredTools.length === 0 && newlyConfiguredTools.length === 0) {
      if (deferredGlobalCleanup) {
        await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
      }
      throwIfUpdateFailed(legacyUpgradeFailures);
      if (declinedMigrations.length > 0) {
        // Not an unconfigured project — a configured one the user chose to
        // leave in its former directory. Saying "run init" would be wrong.
        for (const migration of declinedMigrations) {
          this.log(
            chalk.yellow(
              `Nothing to update: this project's OpenSpec files are still in ${migration.from}/, ` +
                `which OpenSpec no longer writes.`
            )
          );
          this.log(
            chalk.dim(`Re-run "openspec update" and accept the move to ${migration.to}/ to resume updates.`)
          );
        }
        return;
      }
      await this.syncCopilotCloudFiles(resolvedProjectPath, configuredAndNewTools);
      this.log(chalk.yellow('No configured tools found.'));
      this.log(chalk.dim('Run "openspec init" to set up tools.'));
      return;
    }

    // 6. Check version status for all configured tools, against the same workflow set
    //    the generation loop below writes — otherwise a legacy-upgraded tool would be
    //    fingerprinted against commands it was never given.
    const toolStatuses = configuredTools.map((toolId) =>
      getToolVersionStatus(resolvedProjectPath, toolId, OPENSPEC_VERSION, {
        workflows: legacyWorkflowOverrides[toolId] ?? desiredWorkflows,
      })
    );
    const statusByTool = new Map(toolStatuses.map((status) => [status.toolId, status] as const));

    // 7. Smart update detection
    const toolsNeedingVersionUpdate = toolStatuses
      .filter((s) => {
        if (!s.needsUpdate || delivery !== 'commands') {
          return s.needsUpdate;
        }

        const tool = AI_TOOLS.find((candidate) => candidate.value === s.toolId);
        return !tool || !hasGlobalSkillTarget(tool);
      })
      .map((s) => s.toolId);
    const toolsNeedingConfigSync = getToolsNeedingProfileSync(
      resolvedProjectPath,
      desiredWorkflows,
      delivery,
      configuredTools
    );
    const toolsWithDriftedSkills = this.findToolsWithDriftedSkills(
      resolvedProjectPath,
      configuredTools,
      delivery,
      (toolId) => legacyWorkflowOverrides[toolId] ?? desiredWorkflows
    );
    const toolsToUpdateSet = new Set<string>([
      ...toolsNeedingVersionUpdate,
      ...toolsNeedingConfigSync,
      ...toolsWithDriftedSkills,
      // Status checks read the disk, where a planned move has not happened.
      // After the real move these tools hold every file they need refreshed
      // or kept; regenerating them yields the same set of paths.
      ...movedInTools,
    ]);
    const toolsUpToDate = toolStatuses.filter((s) => !toolsToUpdateSet.has(s.toolId));

    if (!this.force && toolsToUpdateSet.size === 0 && newlyConfiguredTools.length === 0) {
      if (deferredGlobalCleanup) {
        await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
      }
      // All tools are up to date
      this.displayUpToDateMessage(toolStatuses);
      await this.syncCopilotCloudFiles(resolvedProjectPath, configuredAndNewTools);

      // Still check for new tool directories and extra workflows
      this.detectNewTools(resolvedProjectPath, configuredTools);
      this.displayProfileNotes(resolvedProjectPath, configuredTools, desiredWorkflows, profile, delivery);
      this.displaySetupNotes(configuredTools);
      throwIfUpdateFailed(legacyUpgradeFailures);
      return;
    }

    // 8. Display update plan
    if (this.force) {
      this.log(`Force updating ${configuredTools.length} tool(s): ${configuredTools.join(', ')}`);
    } else if (toolsToUpdateSet.size === 0) {
      this.log('No additional refresh needed after legacy migration.');
    } else {
      this.displayUpdatePlan(
        [...toolsToUpdateSet],
        statusByTool,
        toolsUpToDate,
        new Set(toolsWithDriftedSkills)
      );
    }
    this.log();

    // 9. Determine what to generate based on delivery
    const deliveryIncludesCommands = delivery !== 'skills';
    // 10. Update tools (all if force, otherwise only those needing update)
    const toolsToUpdate = this.force ? configuredTools : [...toolsToUpdateSet];
    const sharedSkillWriters = resolveSharedSkillWriters(
      resolvedProjectPath,
      configuredAndNewTools
        .map((toolId) => AI_TOOLS.find((tool) => tool.value === toolId))
        .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined)
    );
    const updatedTools: string[] = [];
    const updatedToolIds: string[] = [];
    const failedTools: ToolFailure[] = [...legacyUpgradeFailures];
    const skillsInvocableCommandSkips: string[] = [];
    const zeroArtifactTools: string[] = [];
    let removedCommandCount = 0;
    let removedSkillCount = 0;
    let removedDeselectedCommandCount = 0;
    let removedDeselectedSkillCount = 0;

    for (const toolId of toolsToUpdate) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool || !toolSupportsSkills(tool)) continue;

      const spinner = this.startSpinner(`Updating ${tool.name}...`);

      try {
        const skillsDir = resolveToolSkillsDir(resolvedProjectPath, tool);
        const skillsRoot = hasGlobalSkillTarget(tool) ? skillsDir : resolvedProjectPath;
        const shouldGenerateSkills = shouldGenerateSkillsForTool(tool.value, delivery);
        const shouldGenerateCommands = shouldGenerateCommandsForTool(tool.value, delivery);
        const writesSkills = !tool.skillsDir || sharedSkillWriters.has(tool.value);
        const toolWorkflows = legacyWorkflowOverrides[tool.value] ?? desiredWorkflows;
        const skillTemplates = getSkillTemplates(toolWorkflows);
        const commandContents = getCommandContents(toolWorkflows);

        // Generate skill files if delivery includes skills
        if (shouldGenerateSkills && writesSkills) {
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(skillsDir, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            const transformer = getTransformerForTool(
              tool.value,
              delivery,
              resolveCommandSurfaceCapability(tool.value),
              resolveCommandInvocation(tool.value)
            );
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
            FileSystemUtils.assertPathWithin(skillsRoot, skillFile);
            await this.ops.writeFile(skillFile, skillContent, tool.value);
          }
          await this.writeSharedSkillTarget(resolvedProjectPath, tool.value);

          removedDeselectedSkillCount += await this.removeUnselectedSkillDirs(
            skillsRoot,
            skillsDir,
            toolWorkflows,
            tool.value
          );
        }

        // Delete skill directories if delivery is commands-only
        if (
          shouldRemoveSkillsForTool(tool.value, delivery) &&
          writesSkills &&
          !hasGlobalSkillTarget(tool)
        ) {
          removedSkillCount += await this.removeSkillDirs(skillsRoot, skillsDir, tool.value);
          // Persist the selected owner even when commands-only delivery leaves
          // this target with no generated skills.
          await this.writeSharedSkillTarget(resolvedProjectPath, tool.value);
          // A tool with no command adapter now has zero OpenSpec artifacts;
          // say so like init does, rather than deleting its skills silently
          // and letting tool detection re-suggest an init that would also
          // generate nothing under this delivery setting.
          if (!shouldGenerateCommandsForTool(tool.value, delivery)) {
            zeroArtifactTools.push(tool.name);
          }
        }

        // Generate commands if delivery includes commands
        if (shouldGenerateCommands) {
          const adapter = CommandAdapterRegistry.get(tool.value);
          if (adapter) {
            const generatedCommands = generateCommands(commandContents, adapter);

            for (const cmd of generatedCommands) {
              const commandFile = FileSystemUtils.resolveProjectArtifactPath(
                resolvedProjectPath,
                cmd.path
              );
              await this.ops.writeFile(commandFile, cmd.fileContent, tool.value);
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
        updatedToolIds.push(tool.value);
        if (!this.dryRun) {
          for (const migration of migrateLegacyToolDirs(
            resolvedProjectPath,
            [tool.value],
            'after-generation'
          )) {
            if (hasMovableContent(migration)) {
              this.log(chalk.dim(`Migrated ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
            }
            this.reportKeptInPlace(migration);
          }
        } else {
          await this.planLegacyToolMoves(resolvedProjectPath, 'after-generation', [tool.value]);
        }
      } catch (error) {
        spinner.fail(`Failed to update ${tool.name}`);
        const message = error instanceof Error ? error.message : String(error);
        failedTools.push({ name: tool.name, error: message });
        // A dry run reports the failure in the plan rather than throwing it:
        // one broken tool must not cost the caller the other tools' changes.
        this.recorder?.addFailure(tool.value, message);
      }
    }

    if (deferredGlobalCleanup) {
      await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
    }

    // 11. Summary
    this.log();
    if (updatedTools.length > 0) {
      this.log(chalk.green(`✓ Updated: ${updatedTools.join(', ')} (v${OPENSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      this.log(chalk.red(`✗ Failed: ${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }
    if (skillsInvocableCommandSkips.length > 0) {
      this.log(chalk.dim(`Commands skipped for: ${skillsInvocableCommandSkips.join(', ')} (uses skills)`));
    }
    if (removedCommandCount > 0) {
      this.log(chalk.dim(`Removed: ${removedCommandCount} command files (delivery: skills)`));
    }
    if (removedSkillCount > 0) {
      this.log(chalk.dim(`Removed: ${removedSkillCount} skill directories (delivery: commands)`));
    }
    if (zeroArtifactTools.length > 0) {
      const names = zeroArtifactTools.join(', ');
      this.log(
        chalk.yellow(
          `No skills or commands remain for ${names}: delivery is set to 'commands' but ` +
            `${zeroArtifactTools.length === 1 ? 'it supports' : 'they support'} only skills. ` +
            `Run 'openspec config set delivery both' to generate skills.`
        )
      );
    }
    if (removedDeselectedCommandCount > 0) {
      this.log(chalk.dim(`Removed: ${removedDeselectedCommandCount} command files (deselected workflows)`));
    }
    if (removedDeselectedSkillCount > 0) {
      this.log(chalk.dim(`Removed: ${removedDeselectedSkillCount} skill directories (deselected workflows)`));
    }

    // 12. Show onboarding message for newly configured tools from legacy upgrade.
    // Command tools get the command name their files answer to, skill-only
    // tools their documented skill invocation, and disagreements fall back to
    // naming the skill.
    if (newlyConfiguredTools.length > 0) {
      const referenceFor = (command: string): string => {
        const neutralForm = `the ${transformToSkillReferences(command).slice(1)} skill`;
        const forms = new Set(
          newlyConfiguredTools.map((toolId) => {
            if (shouldGenerateCommandsForTool(toolId, delivery)) {
              // Name the command the tool's files actually answer to:
              // /opsx-<id> where the filename is the command name.
              const transformer = getTransformerForTool(
                toolId,
                delivery,
                resolveCommandSurfaceCapability(toolId),
                resolveCommandInvocation(toolId)
              );
              return transformer ? transformer(command) : command;
            }
            return getSkillReferenceTransformer(toolId)(command);
          })
        );
        return forms.size === 1 ? [...forms][0] : neutralForm;
      };
      // Only hint at workflows these tools actually received. A legacy upgrade
      // can install a narrower set than the profile (inferred Codex prompts).
      const installedWorkflows = [
        ...new Set(
          newlyConfiguredTools.flatMap(
            (toolId) => legacyWorkflowOverrides[toolId] ?? desiredWorkflows
          )
        ),
      ];
      const entries: Array<[string, string]> = getOnboardingCommands(installedWorkflows).map(
        ({ command, description }) => [referenceFor(command), description]
      );
      this.log();
      if (entries.length > 0) {
        const width = Math.max(...entries.map(([reference]) => reference.length));
        this.log(chalk.bold('Getting started:'));
        for (const [reference, description] of entries) {
          this.log(`  ${reference.padEnd(width)}  ${description}`);
        }
        this.log();
      }
      this.log(`Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec')}`);
    }

    await this.syncCopilotCloudFiles(resolvedProjectPath, configuredAndNewTools);

    // 13. Detect new tool directories not currently configured
    this.detectNewTools(resolvedProjectPath, configuredAndNewTools);

    // 14. Display the profile notes
    this.displayProfileNotes(resolvedProjectPath, configuredAndNewTools, desiredWorkflows, profile, delivery);
    this.displaySetupNotes(configuredAndNewTools);

    // 15. List affected tools
    if (updatedTools.length > 0) {
      const toolDisplayNames = updatedTools;
      this.log(chalk.dim(`Tools: ${toolDisplayNames.join(', ')}`));
    }

    this.log();
    const affectedToolIds = [...new Set([...newlyConfiguredTools, ...updatedToolIds])];
    const restartHint = formatIdeRestart(affectedToolIds, delivery);
    if (restartHint) {
      this.log(chalk.dim(restartHint));
    }
    if (!this.dryRun) {
      throwIfUpdateFailed(failedTools);
    }
  }

  /**
   * Records the shared-skills-root owner through the write seam, so a dry run
   * lists the marker file a real update would write.
   */
  private async writeSharedSkillTarget(projectPath: string, toolId: string): Promise<void> {
    const marker = sharedSkillTargetMarkerPath(projectPath, toolId);
    if (!marker) return;
    FileSystemUtils.assertProjectArtifactPath(projectPath, marker);
    await this.ops.writeFile(marker, `${toolId}\n`, toolId);
  }

  /**
   * Legacy cleanup prompts and moves files outside the write seam, so a dry run
   * skips it and says so rather than previewing half of it.
   */
  /**
   * Plans the moves out of former tool roots that a non-interactive update
   * makes, against the tree as planned so far. Returns the tools that gain
   * files from a move.
   */
  private async planLegacyToolMoves(
    projectPath: string,
    timing: 'before-generation' | 'after-generation',
    toolIds?: string[]
  ): Promise<Set<string>> {
    const recorder = this.recorder;
    const movedInTools = new Set<string>();
    if (!recorder) return movedInTools;

    for (const op of planLegacyToolMigrations(projectPath, timing, toolIds, recorder.view)) {
      if (op.disposition === 'move') {
        await recorder.moveFile(op.source, op.destination, op.toolId);
        movedInTools.add(op.toolId);
      } else {
        await recorder.removeFile(op.source, op.toolId);
      }
      if (op.needsConsent) {
        recorder.addNote(
          'legacy-tool-directories',
          'Moves out of a renamed tool directory are listed as a non-interactive update makes them. At a terminal, update asks first, and declining leaves those files where they are.'
        );
      }
    }
    return movedInTools;
  }

  private async noteSkippedLegacyCleanup(projectPath: string): Promise<LegacyUpgradeResult> {
    const detection = await detectLegacyArtifacts(projectPath);
    if (detection.hasLegacyArtifacts) {
      // Without --force a non-interactive update leaves legacy artifacts alone,
      // so the plan is complete; it only says they are there. With --force the
      // cleanup runs and its changes are not planned.
      this.recorder?.addNote(
        'legacy-artifacts',
        this.force
          ? 'A real update with --force would also clean up legacy OpenSpec artifacts; those changes are not listed here.'
          : 'Legacy OpenSpec artifacts were found. Update cleans them up only with --force or when you confirm at a terminal, so this plan leaves them alone.'
      );
    }
    return { newlyConfiguredTools: [], workflowOverrides: {} };
  }

  private async syncCopilotCloudFiles(projectPath: string, configuredTools: string[]): Promise<void> {
    if (this.dryRun) {
      // The real run writes these files when cloud mode is on and removes them
      // when it is off, so either direction is a change the preview omits.
      const cloudFilesPresent = Object.values(COPILOT_CLOUD_FILES).some((file) =>
        fs.existsSync(path.join(projectPath, file))
      );
      const wouldWrite =
        includesGitHubCopilot(configuredTools) && (await isCopilotCloudEnabled(projectPath));
      if (cloudFilesPresent || wouldWrite) {
        this.recorder?.addNote(
          'copilot-cloud-files',
          'A real update would also sync the GitHub Copilot cloud agent files; those changes are not listed here.'
        );
      }
      return;
    }
    try {
      if (includesGitHubCopilot(configuredTools)) {
        // Cloud files are opt-in (see cloud-agent.ts). `update` never prompts,
        // so it only refreshes files the user has already opted into (via
        // `openspec init` or a `githubCopilot.cloudAgent: true` config), or that
        // a pre-opt-in project already has. Opting in is a deliberate init/config
        // step, never a silent side effect of running update.
        if (await isCopilotCloudEnabled(projectPath)) {
          await writeCopilotCloudFiles(projectPath);
          const collisions = await findUnmanagedCloudFiles(projectPath);
          if (collisions.length > 0) {
            this.log(
              chalk.dim(
                `Left your existing ${collisions.join(' and ')} untouched — add the OpenSpec ` +
                  `install step by hand so the Copilot cloud agent can run openspec.`
              )
            );
          }
          return;
        }

        // Explicit opt-out (githubCopilot.cloudAgent: false) means "not here":
        // remove any managed files a prior opt-in left behind (customized files
        // are preserved). If the user simply never decided, stay quiet unless
        // we're at an interactive terminal, where a one-line hint aids discovery.
        if (readCopilotCloudOptIn(projectPath) === false) {
          const removed = await removeCopilotCloudFiles(projectPath);
          if (removed > 0) {
            this.log(
              chalk.dim(`Removed: ${removed} Copilot cloud agent file(s) (opted out of cloud files)`)
            );
          }
        } else if (isInteractive()) {
          this.log(
            chalk.dim(
              "GitHub Copilot cloud coding-agent files are available (opt-in). Enable with 'openspec init --copilot-cloud'."
            )
          );
        }
        return;
      }

      const removed = await removeCopilotCloudFiles(projectPath);
      if (removed > 0) {
        this.log(chalk.dim(`Removed: ${removed} Copilot cloud agent file(s) (github-copilot not configured)`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Warning: failed to sync Copilot cloud agent files: ${message}`);
    }
  }

  /**
   * Tools whose SKILL.md bodies no longer match what this CLI generates.
   *
   * Skill freshness was decided solely by the `generatedBy:` line, so a body
   * edited after generation — a "helpful" PR touching `.claude/skills/**`, a
   * dotfile sync, another agent — left `update` reporting the install healthy.
   * Command files never had that gap: `areCommandFilesUpToDate` content-
   * compares them, and the same comparison belongs on the higher-authority
   * surface. A missing skill file is left to the profile-sync check, which
   * already knows what a partial install means.
   */
  private findToolsWithDriftedSkills(
    projectPath: string,
    toolIds: string[],
    delivery: Delivery,
    workflowsForTool: (toolId: string) => readonly (typeof ALL_WORKFLOWS)[number][]
  ): string[] {
    return toolIds.filter((toolId) => {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool || !toolSupportsSkills(tool)) return false;
      if (!shouldGenerateSkillsForTool(tool.value, delivery)) return false;
      // A shared skills root is generated with its owner's transformer, so
      // only the owner may compare it. getToolSkillStatus settles ownership.
      if (!getToolSkillStatus(projectPath, tool.value).configured) return false;

      const skillsDir = resolveToolSkillsDir(projectPath, tool);
      const transformer = getTransformerForTool(
        tool.value,
        delivery,
        resolveCommandSurfaceCapability(tool.value),
        resolveCommandInvocation(tool.value)
      );

      return getSkillTemplates(workflowsForTool(toolId)).some(({ template, dirName }) => {
        const skillFile = path.join(skillsDir, dirName, 'SKILL.md');
        if (!fs.existsSync(skillFile)) return false;
        try {
          const existing = fs.readFileSync(skillFile, 'utf-8');
          const generated = generateSkillContent(template, OPENSPEC_VERSION, transformer);
          return normalizeGeneratedFile(existing) !== normalizeGeneratedFile(generated);
        } catch {
          return true;
        }
      });
    });
  }

  /**
   * Display message when all tools are up to date.
   */
  private displayUpToDateMessage(toolStatuses: ToolVersionStatus[]): void {
    const toolNames = toolStatuses.map((s) => s.toolId);
    this.log(chalk.green(`✓ All ${toolStatuses.length} tool(s) up to date (v${OPENSPEC_VERSION})`));
    this.log(chalk.dim(`  Tools: ${toolNames.join(', ')}`));
    this.log();
    this.log(chalk.dim('Use --force to refresh files anyway.'));
  }

  /**
   * Display the update plan showing which tools need updating.
   */
  private displayUpdatePlan(
    toolsToUpdate: string[],
    statusByTool: Map<string, ToolVersionStatus>,
    upToDate: ToolVersionStatus[],
    driftedSkills: ReadonlySet<string> = new Set()
  ): void {
    const updates = toolsToUpdate.map((toolId) => {
      const status = statusByTool.get(toolId);
      if (status?.needsUpdate) {
        const fromVersion = status.generatedByVersion ?? 'unknown';
        return `${status.toolId} (${fromVersion} → ${OPENSPEC_VERSION})`;
      }
      // Say why: a user who edited a SKILL.md on purpose is owed the reason
      // their edit is about to be overwritten.
      if (driftedSkills.has(toolId)) {
        return `${toolId} (skill files differ from the generated content)`;
      }
      return `${toolId} (config sync)`;
    });

    this.log(`Updating ${toolsToUpdate.length} tool(s): ${updates.join(', ')}`);

    if (upToDate.length > 0) {
      const upToDateNames = upToDate.map((s) => s.toolId);
      this.log(chalk.dim(`Already up to date: ${upToDateNames.join(', ')}`));
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
        this.log(chalk.yellow(`Setup required for ${tool.name}: ${tool.setupNote}`));
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
      this.log();
      this.log(
        chalk.yellow(
          `Detected new ${toolNoun}: ${newToolNames.join(', ')}. Run 'openspec init' to add ${pronoun}.`
        )
      );
    }
  }

  /**
   * Prints the profile notes, in order, with one pointer at
   * `openspec config profile` rather than three.
   *
   * Every note is evaluated: reading them as one short-circuited `||` chain
   * would swallow whichever ran second.
   */
  private displayProfileNotes(
    projectPath: string,
    configuredTools: string[],
    desiredWorkflows: readonly string[] | undefined,
    profile: Profile,
    delivery: Delivery
  ): void {
    const printedExtraNote = this.displayExtraWorkflowsNote(
      projectPath,
      configuredTools,
      desiredWorkflows ?? []
    );
    const printedMissingCoreNote = this.displayMissingCoreWorkflowsNote(profile, desiredWorkflows);
    this.displayOptionalWorkflowsNote(
      configuredTools,
      desiredWorkflows,
      delivery,
      printedExtraNote || printedMissingCoreNote
    );
  }

  /**
   * Displays a note about extra workflows installed that aren't in the current profile.
   */
  private displayExtraWorkflowsNote(
    projectPath: string,
    configuredTools: string[],
    profileWorkflows: readonly string[]
  ): boolean {
    const installedWorkflows = scanInstalledWorkflows(projectPath, configuredTools);
    const profileSet = new Set(profileWorkflows);
    const extraWorkflows = installedWorkflows.filter((w) => !profileSet.has(w));

    if (extraWorkflows.length > 0) {
      this.log(chalk.dim(`Note: ${extraWorkflows.length} extra workflows not in profile (use \`openspec config profile\` to manage)`));
      return true;
    }
    return false;
  }

  /**
   * Point out core workflows a custom profile is missing, so releases that
   * grow CORE_WORKFLOWS stay discoverable. Keep custom profiles user-owned;
   * do not mutate them.
   */
  private displayMissingCoreWorkflowsNote(profile: Profile, workflows?: readonly string[]): boolean {
    if (profile !== 'custom' || !workflows) {
      return false;
    }

    const workflowSet = new Set(workflows);
    const missing = CORE_WORKFLOWS.filter((workflow) => !workflowSet.has(workflow));

    if (missing.length === 0) {
      return false;
    }

    const label = missing.length === 1 ? 'workflow' : 'workflows';
    const pronoun = missing.length === 1 ? 'it' : 'them';
    this.log(chalk.dim(`Note: Your custom profile is missing ${missing.length} core ${label}: ${missing.join(', ')}`));
    this.log(chalk.dim(`Run \`openspec config profile\` to add ${pronoun}, or \`openspec config profile core\` to use the core set.`));
    return true;
  }

  /**
   * Fallback pointer to the workflows the profile leaves out.
   *
   * `update` already points at `openspec config profile` when files drift from
   * the profile, and when a custom profile is missing core workflows. Neither
   * fires for the default `core` profile, so the user `update` is most likely
   * to be helping — the one who ran it because a command they read about never
   * appeared — learns nothing (#1076). This covers that gap.
   *
   * Silent when another note already pointed at the same command, and when no
   * configured tool can receive a workflow surface under the active delivery:
   * adding workflows would write nothing there.
   */
  private displayOptionalWorkflowsNote(
    configuredTools: string[],
    workflows: readonly string[] | undefined,
    delivery: Delivery,
    alreadyPointedAtProfileConfig: boolean
  ): void {
    if (alreadyPointedAtProfileConfig || !workflows) {
      return;
    }

    const anyToolHasASurface = configuredTools.some(
      (toolId) =>
        shouldGenerateSkillsForTool(toolId, delivery) ||
        shouldGenerateCommandsForTool(toolId, delivery)
    );
    if (!anyToolHasASurface) {
      return;
    }

    const note = formatOptionalWorkflowsNote(workflows);
    if (!note) {
      return;
    }
    for (const line of note) {
      this.log(chalk.dim(line));
    }
  }

  /**
   * Removes skill directories for workflows when delivery changed to commands-only.
   * Returns the number of directories removed.
   */
  private async removeSkillDirs(skillsRoot: string, skillsDir: string, toolId: string): Promise<number> {
    let removed = 0;

    for (const workflow of ALL_WORKFLOWS) {
      const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
      if (!dirName) continue;

      const skillDir = path.join(skillsDir, dirName);
      if (!fs.existsSync(skillDir)) continue;
      FileSystemUtils.assertPathWithin(skillsRoot, skillDir);
      try {
        await this.ops.removeDirectory(skillDir, toolId);
        removed++;
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
    skillsRoot: string,
    skillsDir: string,
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][],
    toolId: string
  ): Promise<number> {
    const desiredSet = new Set(desiredWorkflows);
    let removed = 0;

    for (const workflow of ALL_WORKFLOWS) {
      if (desiredSet.has(workflow)) continue;
      const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
      if (!dirName) continue;

      const skillDir = path.join(skillsDir, dirName);
      if (!fs.existsSync(skillDir)) continue;
      FileSystemUtils.assertPathWithin(skillsRoot, skillDir);
      try {
        await this.ops.removeDirectory(skillDir, toolId);
        removed++;
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
      const fullPath = FileSystemUtils.resolveProjectArtifactPath(projectPath, cmdPath);

      try {
        if (fs.existsSync(fullPath)) {
          await this.ops.removeFile(fullPath, toolId);
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
      const fullPath = FileSystemUtils.resolveProjectArtifactPath(projectPath, cmdPath);

      try {
        if (fs.existsSync(fullPath)) {
          await this.ops.removeFile(fullPath, toolId);
          removed++;
        }
      } catch {
        // Ignore errors
      }
    }

    return removed;
  }

  /**
   * Offers to move OpenSpec content out of a renamed tool's former directory
   * when the old location might still be the live one — today, Windsurf's
   * `.windsurf/` after the Devin Desktop rebrand.
   *
   * Interactive runs are asked, because nothing on disk distinguishes a user
   * who took the rebrand from one still on a pre-rebrand Windsurf build that
   * reads only `.windsurf/`. `--force` and non-interactive runs migrate, which
   * is what an unattended upgrade wants.
   */
  /** Surfaces files the move left behind rather than overwriting. */
  private reportKeptInPlace(migration: LegacyToolMigration): void {
    const notice = keptInPlaceNotice(migration);
    if (notice) this.log(chalk.dim(notice));
  }

  private async offerConsentedLegacyMigrations(
    projectPath: string
  ): Promise<LegacyToolMigration[]> {
    const pending = findLegacyToolMigrations(projectPath).filter((m) => m.needsConsent);
    const declined: LegacyToolMigration[] = [];
    if (pending.length === 0) return declined;

    for (const migration of pending) {
      // Nothing movable: every legacy file differs from its counterpart, so
      // there is no move to offer. Still say so — silence would leave two
      // divergent copies the user never hears about.
      if (!hasMovableContent(migration)) {
        this.reportKeptInPlace(migration);
        this.log();
        continue;
      }

      this.log(chalk.yellow(legacyMigrationNotice(migration)));

      if (!this.force && isInteractive()) {
        const { confirm } = await import('@inquirer/prompts');
        let shouldMigrate: boolean;
        try {
          shouldMigrate = await confirm({
            message: `Move ${describeLegacyMigration(migration)} from ${migration.from}/ to ${migration.to}/?`,
            default: true,
          });
        } catch {
          // Closed stdin is not consent, and it must not abort the update.
          shouldMigrate = false;
        }
        if (!shouldMigrate) {
          // Say what declining costs. OpenSpec writes the current root now, so
          // the files keep working where they are, but OpenSpec stops managing
          // them — it no longer looks in the former directory.
          this.log(
            chalk.dim(
              `Left in place. OpenSpec writes ${migration.to}/ now and will not manage ` +
                `${migration.from}/, so those files stay as they are until you move them. ` +
                `You will be asked again next run.`
            )
          );
          this.log();
          declined.push(migration);
          continue;
        }
      }

      for (const applied of migrateLegacyToolDirs(projectPath, [migration.toolId])) {
        if (hasMovableContent(applied)) {
          this.log(chalk.dim(`Migrated ${describeLegacyMigration(applied)}: ${applied.from} → ${applied.to}`));
        }
        this.reportKeptInPlace(applied);
      }
      this.log();
    }

    return declined;
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
      this.log();
      if (immediateSummary) {
        this.log(immediateSummary);
        this.log();
      }
      if (deferredSummary) {
        this.log(deferredSummary);
        this.log();
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
      await this.performImmediateLegacyCleanup(
        projectPath,
        detection,
        legacyUpgrade.skippedSharedSkillTools
      );
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
      this.log(chalk.yellow('⚠ Run with --force to auto-cleanup legacy files, or run interactively.'));
      this.log();
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
      await this.performImmediateLegacyCleanup(
        projectPath,
        detection,
        legacyUpgrade.skippedSharedSkillTools
      );
      return {
        ...legacyUpgrade,
        deferredGlobalCleanup: pickGlobalLegacyPromptFiles(
          detection,
          detection.globalSlashCommandFiles
        ),
      };
    } else {
      this.log(chalk.dim('Skipping legacy cleanup. Continuing with skill update...'));
      this.log();
      return { newlyConfiguredTools: [], workflowOverrides: {} };
    }
  }

  /**
   * Cleans approved repo-local legacy artifacts before configured tools refresh.
   */
  private async performImmediateLegacyCleanup(
    projectPath: string,
    detection: LegacyDetectionResult,
    skippedSharedSkillTools: readonly string[] = []
  ): Promise<void> {
    // Tools whose upgrade was skipped (shared root owned by another) had no
    // replacement written, so their repo-local legacy files must be preserved.
    const immediateDetection = omitToolLegacyArtifacts(
      omitGlobalLegacyPromptFiles(detection),
      skippedSharedSkillTools
    );
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
      this.log(chalk.yellow('Preserved deferred global prompts without replacement skills:'));
      for (const prompt of blockedMatches) {
        this.log(chalk.dim(`  - ${prompt.toolId}: ${prompt.path}`));
      }
      this.log();
    }
  }

  /**
   * Perform cleanup of legacy artifacts.
   */
  private async performLegacyCleanup(projectPath: string, detection: LegacyDetectionResult): Promise<void> {
    const spinner = this.startSpinner('Cleaning up legacy files...');

    const result = await cleanupLegacyArtifacts(projectPath, detection);

    spinner.succeed('Legacy files cleaned up');

    const summary = formatCleanupSummary(result);
    if (summary) {
      this.log();
      this.log(summary);
    }

    this.log();
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
    this.log(chalk.bold('Tools detected from legacy artifacts:'));
    for (const toolId of validUnconfiguredTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      this.log(`  • ${tool?.name || toolId}`);
    }
    this.log();

    let selectedTools: string[];

    if (this.force || !canPrompt) {
      // Non-interactive with --force: auto-select detected tools
      selectedTools = validUnconfiguredTools;
      this.log(`Setting up skills for: ${selectedTools.join(', ')}`);
    } else {
      // Interactive mode: prompt for tool selection with detected tools pre-selected
      const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

      const sortedChoices = validUnconfiguredTools.map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        return {
          name: tool?.name || toolId,
          value: toolId,
          searchAliases: tool?.searchAliases,
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
        this.log(chalk.dim('Skipping tool setup.'));
        this.log();
        return { newlyConfiguredTools: [], workflowOverrides: {} };
      }
    }

    const inferredCodexWorkflows = getProfileWorkflows(
      'custom',
      getLegacyWorkflowIdsForTool(detection, 'codex')
    ).filter((workflow): workflow is (typeof ALL_WORKFLOWS)[number] =>
      (ALL_WORKFLOWS as readonly string[]).includes(workflow)
    );

    // Create skills/commands for selected tools using effective profile+delivery.
    const newlyConfigured: string[] = [];
    const skippedSharedSkillTools: string[] = [];
    const failedTools: ToolFailure[] = [];
    const workflowOverrides: LegacyUpgradeResult['workflowOverrides'] = {};
    const arbitrationTools = [...new Set([...configuredTools, ...selectedTools])]
      .map((toolId) => AI_TOOLS.find((tool) => tool.value === toolId))
      .filter((tool): tool is NonNullable<typeof tool> => tool !== undefined);
    const sharedSkillWriters = resolveSharedSkillWriters(projectPath, arbitrationTools);

    for (const toolId of selectedTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool || !toolSupportsSkills(tool)) continue;

      const spinner = this.startSpinner(`Setting up ${tool.name}...`);

      try {
        const skillsDir = resolveToolSkillsDir(projectPath, tool);
        const skillsRoot = hasGlobalSkillTarget(tool) ? skillsDir : projectPath;
        const shouldGenerateSkills = shouldGenerateSkillsForTool(tool.value, delivery);
        const shouldGenerateCommands = shouldGenerateCommandsForTool(tool.value, delivery);
        const writesSkills = !tool.skillsDir || sharedSkillWriters.has(tool.value);
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

        // Never overwrite a shared skills root owned by another tool. A tool
        // with its own command surface can still install those commands: this
        // is how a legacy Antigravity install gains `.agents/workflows` beside
        // Codex-owned `.agents/skills`. A skills-only tool has no safe artifact
        // to install, so preserve its legacy files and re-offer it later.
        const sharedOwner = shouldGenerateSkills && !writesSkills
          ? arbitrationTools.find(
              (candidate) =>
                candidate.skillsDir === tool.skillsDir &&
                sharedSkillWriters.has(candidate.value)
            )?.value
          : undefined;
        if (sharedOwner && !shouldGenerateCommands) {
          const ownerName =
            AI_TOOLS.find((candidate) => candidate.value === sharedOwner)?.name ?? sharedOwner;
          spinner.info(
            `Skipped ${tool.name}: ${tool.skillsDir}/skills is already managed by another tool (${ownerName}).`
          );
          skippedSharedSkillTools.push(tool.value);
          continue;
        }

        // Create skill files when delivery includes skills
        if (shouldGenerateSkills && writesSkills) {
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(skillsDir, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            const transformer = getTransformerForTool(
              tool.value,
              delivery,
              resolveCommandSurfaceCapability(tool.value),
              resolveCommandInvocation(tool.value)
            );
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
            FileSystemUtils.assertPathWithin(skillsRoot, skillFile);
            await this.ops.writeFile(skillFile, skillContent, tool.value);
          }
          await this.writeSharedSkillTarget(projectPath, tool.value);
        }

        // Create commands when delivery includes commands
        if (shouldGenerateCommands) {
          const adapter = CommandAdapterRegistry.get(tool.value);
          if (adapter) {
            const generatedCommands = generateCommands(commandContents, adapter);

            for (const cmd of generatedCommands) {
              const commandFile = FileSystemUtils.resolveProjectArtifactPath(
                projectPath,
                cmd.path
              );
              await this.ops.writeFile(commandFile, cmd.fileContent, tool.value);
            }
          }
        }

        spinner.succeed(`Setup complete for ${tool.name}`);
        newlyConfigured.push(toolId);
        for (const migration of migrateLegacyToolDirs(
          projectPath,
          [tool.value],
          'after-generation'
        )) {
          if (hasMovableContent(migration)) {
            this.log(chalk.dim(`Migrated ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
          }
          this.reportKeptInPlace(migration);
        }
      } catch (error) {
        spinner.fail(`Failed to set up ${tool.name}`);
        const message = error instanceof Error ? error.message : String(error);
        this.log(chalk.red(`  ${message}`));
        failedTools.push({ name: tool.name, error: message });
      }
    }

    if (newlyConfigured.length > 0) {
      this.log();
    }

    return {
      newlyConfiguredTools: newlyConfigured,
      workflowOverrides,
      skippedSharedSkillTools,
      failedTools,
    };
  }
}
