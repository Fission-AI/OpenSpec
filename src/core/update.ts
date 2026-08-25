/**
 * 更新命令
 *
 * 为配置的工具刷新 OpenSpec 技能和命令。
 * 支持 profile 感知的更新、交付变更、迁移和智能更新检测。
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
  getToolVersionStatus,
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
  getToolsWithSkillsDir,
  hasGlobalSkillTarget,
  resolveToolSkillsDir,
  toolSupportsSkills,
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
  omitToolLegacyArtifacts,
  pickGlobalLegacyPromptFiles,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import { isInteractive } from '../utils/interactive.js';
import { getGlobalConfig, type Delivery, type Profile } from './global-config.js';
import { getProfileWorkflows, ALL_WORKFLOWS, CORE_WORKFLOWS } from './profiles.js';
import { getOnboardingCommands } from './onboarding-commands.js';
import { getAvailableTools } from './available-tools.js';
import {
  WORKFLOW_TO_SKILL_DIR,
  getConfiguredToolsForProfileSync,
  getToolsNeedingProfileSync,
} from './profile-sync-drift.js';
import {
  scanInstalledWorkflows as scanInstalledWorkflowsShared,
  migrateIfNeeded as migrateIfNeededShared,
  findLegacyToolMigrations,
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
import { writeSharedSkillTarget, sharedSkillRootOwner } from './shared-skill-target.js';
import { includesGitHubCopilot, writeCopilotCloudFiles, removeCopilotCloudFiles, isCopilotCloudEnabled, readCopilotCloudOptIn, findUnmanagedCloudFiles } from './github-copilot/cloud-agent.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

/**
 * 捕获旧版迁移副作用，以便 update 可以刷新新配置的
 * 工具并遵守从旧版 Codex prompt 文件名推断的工作流子集。
 */
type LegacyUpgradeResult = {
  newlyConfiguredTools: string[];
  workflowOverrides: Partial<Record<string, readonly (typeof ALL_WORKFLOWS)[number][]>>;
  deferredGlobalCleanup?: LegacyDetectionResult;
  /**
   * 由于另一个工具已经拥有其共享 skills 根，跳过了其 skill 生成的工具。
   * 它们的仓库本地旧版 artifact 必须免于
   * 立即清理 — 没有写入替代来证明删除它们的合理性。
   */
  skippedSharedSkillTools?: string[];
};

/**
 * update 命令的选项。
 */
export interface UpdateCommandOptions {
  /** 即使工具已是最新版本也强制更新 */
  force?: boolean;
}

/**
 * 扫描所有配置的工具中已安装的工作流 artifact（skills 和受管命令）。
 * 返回与 ALL_WORKFLOWS 匹配的检测到的工作流 ID 的并集。
 *
 * 围绕共享迁移模块的 scanInstalledWorkflows 的包装器，接受工具 ID。
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
   * 为所有配置的工具刷新 OpenSpec skills 和 commands，
   * 根据有效的 profile 和 delivery 模式重新生成 artifact。
   *
   * @param projectPath - 包含 openspec 目录的项目根路径
   */
  async execute(projectPath: string): Promise<void> {
    const resolvedProjectPath = path.resolve(projectPath);
    const openspecPath = path.join(resolvedProjectPath, OPENSPEC_DIR_NAME);

    // 1. 检查 openspec 目录是否存在
    if (!await FileSystemUtils.directoryExists(openspecPath)) {
      throw new Error(`未找到 OpenSpec 目录。请先运行 'openspec init'。`);
    }

    // 2. 迁移重命名工具目录中遗留的 OpenSpec 管理的 skills
    // （如 .kimi -> .kimi-code），以便它们保持被检测和刷新，
    // 然后在任何旧版升级生成之前执行一次性的 profile 迁移（如需要）。
    for (const migration of migrateLegacyToolDirs(resolvedProjectPath)) {
      if (hasMovableContent(migration)) {
        console.log(chalk.dim(`已迁移 ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
      }
      this.reportKeptInPlace(migration);
    }
    const declinedMigrations = await this.offerConsentedLegacyMigrations(resolvedProjectPath);

    // 使用检测到的工具目录来保留现有的 opsx skills/commands。
    const detectedTools = getAvailableTools(resolvedProjectPath);
    migrateIfNeededShared(resolvedProjectPath, detectedTools);

    // 3. 读取全局配置以获取 profile/delivery
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
    const configuredAndNewTools = [...new Set([...configuredTools, ...newlyConfiguredTools])];

    if (configuredTools.length === 0 && newlyConfiguredTools.length === 0) {
      if (deferredGlobalCleanup) {
        await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
      }
      if (declinedMigrations.length > 0) {
        // Not an unconfigured project — a configured one the user chose to
        // leave in its former directory. Saying "run init" would be wrong.
        for (const migration of declinedMigrations) {
          console.log(
            chalk.yellow(
              `无需要更新的内容：此项目的 OpenSpec 文件仍在 ${migration.from}/ 目录中，` +
                `而 OpenSpec 已不再写入该目录。`
            )
          );
          console.log(
            chalk.dim(`请重新运行 "openspec update" 并接受迁移到 ${migration.to}/ 以恢复更新。`)
          );
        }
        return;
      }
      await this.syncCopilotCloudFiles(resolvedProjectPath, configuredAndNewTools);
      console.log(chalk.yellow('未找到已配置的工具。'));
      console.log(chalk.dim('请运行 "openspec init" 来设置工具。'));
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
    const toolsToUpdateSet = new Set<string>([
      ...toolsNeedingVersionUpdate,
      ...toolsNeedingConfigSync,
    ]);
    const toolsUpToDate = toolStatuses.filter((s) => !toolsToUpdateSet.has(s.toolId));

    if (!this.force && toolsToUpdateSet.size === 0 && newlyConfiguredTools.length === 0) {
      if (deferredGlobalCleanup) {
        await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
      }
      // 所有工具均已是最新版本
      this.displayUpToDateMessage(toolStatuses);
      await this.syncCopilotCloudFiles(resolvedProjectPath, configuredAndNewTools);

      // Still check for new tool directories and extra workflows
      this.detectNewTools(resolvedProjectPath, configuredTools);
      this.displayExtraWorkflowsNote(resolvedProjectPath, configuredTools, desiredWorkflows);
      this.displayMissingCoreWorkflowsNote(profile, desiredWorkflows);
      this.displaySetupNotes(configuredTools);
      return;
    }

    // 8. Display update plan
    if (this.force) {
      console.log(`强制更新 ${configuredTools.length} 个工具：${configuredTools.join(', ')}`);
    } else if (toolsToUpdateSet.size === 0) {
      console.log('旧版迁移后无需额外刷新。');
    } else {
      this.displayUpdatePlan([...toolsToUpdateSet], statusByTool, toolsUpToDate);
    }
    console.log();

    // 9. Determine what to generate based on delivery
    const deliveryIncludesCommands = delivery !== 'skills';
    // 10. Update tools (all if force, otherwise only those needing update)
    const toolsToUpdate = this.force ? configuredTools : [...toolsToUpdateSet];
    const updatedTools: string[] = [];
    const updatedToolIds: string[] = [];
    const failedTools: Array<{ name: string; error: string }> = [];
    const skillsInvocableCommandSkips: string[] = [];
    const zeroArtifactTools: string[] = [];
    let removedCommandCount = 0;
    let removedSkillCount = 0;
    let removedDeselectedCommandCount = 0;
    let removedDeselectedSkillCount = 0;

    for (const toolId of toolsToUpdate) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool || !toolSupportsSkills(tool)) continue;

      const spinner = ora(`正在更新 ${tool.name}...`).start();

      try {
        const skillsDir = resolveToolSkillsDir(resolvedProjectPath, tool);
        const skillsRoot = hasGlobalSkillTarget(tool) ? skillsDir : resolvedProjectPath;
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

            const transformer = getTransformerForTool(
              tool.value,
              delivery,
              resolveCommandSurfaceCapability(tool.value),
              resolveCommandInvocation(tool.value)
            );
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);
            FileSystemUtils.assertPathWithin(skillsRoot, skillFile);
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
          writeSharedSkillTarget(resolvedProjectPath, tool.value);

          removedDeselectedSkillCount += await this.removeUnselectedSkillDirs(
            skillsRoot,
            skillsDir,
            toolWorkflows
          );
        }

        // Delete skill directories if delivery is commands-only
        if (shouldRemoveSkillsForTool(tool.value, delivery) && !hasGlobalSkillTarget(tool)) {
          removedSkillCount += await this.removeSkillDirs(skillsRoot, skillsDir);
          // Persist the selected owner even when commands-only delivery leaves
          // this target with no generated skills.
          writeSharedSkillTarget(resolvedProjectPath, tool.value);
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

        spinner.succeed(`${tool.name} 更新完成`);
        updatedTools.push(tool.name);
        updatedToolIds.push(tool.value);
        for (const migration of migrateLegacyToolDirs(
          resolvedProjectPath,
          [tool.value],
          'after-generation'
        )) {
          if (hasMovableContent(migration)) {
            console.log(chalk.dim(`已迁移 ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
          }
          this.reportKeptInPlace(migration);
        }
      } catch (error) {
        spinner.fail(`${tool.name} 更新失败`);
        failedTools.push({
          name: tool.name,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    if (deferredGlobalCleanup) {
      await this.performDeferredGlobalPromptCleanup(resolvedProjectPath, deferredGlobalCleanup);
    }

    // 11. 汇总
    console.log();
    if (updatedTools.length > 0) {
      console.log(chalk.green(`✓ 已更新：${updatedTools.join(', ')} (v${OPENSPEC_VERSION})`));
    }
    if (failedTools.length > 0) {
      console.log(chalk.red(`✗ 失败：${failedTools.map(f => `${f.name} (${f.error})`).join(', ')}`));
    }
    if (skillsInvocableCommandSkips.length > 0) {
      console.log(chalk.dim(`已跳过命令：${skillsInvocableCommandSkips.join(', ')}（使用 skills）`));
    }
    if (removedCommandCount > 0) {
      console.log(chalk.dim(`已删除：${removedCommandCount} 个命令文件（交付方式：skills）`));
    }
    if (removedSkillCount > 0) {
      console.log(chalk.dim(`已删除：${removedSkillCount} 个 skill 目录（交付方式：commands）`));
    }
    if (zeroArtifactTools.length > 0) {
      const names = zeroArtifactTools.join(', ');
      console.log(
        chalk.yellow(
          `无可用 skills 或 commands：${names} 的交付方式设置为 'commands'，但 ` +
            `${zeroArtifactTools.length === 1 ? '它仅支持' : '它们仅支持'} skills。 ` +
            `请运行 'openspec config set delivery both' 来生成 skills。`
        )
      );
    }
    if (removedDeselectedCommandCount > 0) {
      console.log(chalk.dim(`已删除：${removedDeselectedCommandCount} 个命令文件（取消选择的 workflows）`));
    }
    if (removedDeselectedSkillCount > 0) {
      console.log(chalk.dim(`已删除：${removedDeselectedSkillCount} 个 skill 目录（取消选择的 workflows）`));
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
      console.log();
      if (entries.length > 0) {
        const width = Math.max(...entries.map(([reference]) => reference.length));
        console.log(chalk.bold('快速开始：'));
        for (const [reference, description] of entries) {
          console.log(`  ${reference.padEnd(width)}  ${description}`);
        }
        console.log();
      }
      console.log(`Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec')}`);
    }

    await this.syncCopilotCloudFiles(resolvedProjectPath, configuredAndNewTools);

    // 13. Detect new tool directories not currently configured
    this.detectNewTools(resolvedProjectPath, configuredAndNewTools);

    // 14. Display note about extra workflows not in profile
    this.displayExtraWorkflowsNote(resolvedProjectPath, configuredAndNewTools, desiredWorkflows);
    this.displayMissingCoreWorkflowsNote(profile, desiredWorkflows);
    this.displaySetupNotes(configuredAndNewTools);

    // 15. List affected tools
    if (updatedTools.length > 0) {
      const toolDisplayNames = updatedTools;
      console.log(chalk.dim(`工具：${toolDisplayNames.join(', ')}`));
    }

    console.log();
    const affectedToolIds = [...new Set([...newlyConfiguredTools, ...updatedToolIds])];
    const shouldRestartIde = affectedToolIds.some((toolId) => {
      const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
      return Boolean(
        tool?.requiresIdeRestart &&
        (
          shouldGenerateCommandsForTool(toolId, delivery) ||
          shouldGenerateSkillsForTool(toolId, delivery)
        )
      );
    });
    if (shouldRestartIde) {
      console.log(chalk.dim('重启 IDE 以使更改生效。'));
    }
    if (failedTools.length > 0) {
      throw new Error(`OpenSpec 更新失败：${failedTools.map((tool) => tool.name).join(', ')}`);
    }
  }

  private async syncCopilotCloudFiles(projectPath: string, configuredTools: string[]): Promise<void> {
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
            console.log(
              chalk.dim(
                `保留您已有的 ${collisions.join(' 和 ')} — 请手动添加 OpenSpec ` +
                  `安装步骤，以便 Copilot 云代理可以运行 openspec。`
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
            console.log(
              chalk.dim(`已删除：${removed} 个 Copilot 云代理文件（选择退出云文件）`)
            );
          }
        } else if (isInteractive()) {
          console.log(
            chalk.dim(
              "GitHub Copilot 云编码代理文件可用（选择加入）。使用 'openspec init --copilot-cloud' 启用。"
            )
          );
        }
        return;
      }

      const removed = await removeCopilotCloudFiles(projectPath);
      if (removed > 0) {
        console.log(chalk.dim(`已删除：${removed} 个 Copilot 云代理文件（github-copilot 未配置）`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`警告：同步 Copilot 云代理文件失败：${message}`);
    }
  }

  /**
   * Display message when all tools are up to date.
   */
  private displayUpToDateMessage(toolStatuses: ToolVersionStatus[]): void {
    const toolNames = toolStatuses.map((s) => s.toolId);
    console.log(chalk.green(`✓ 全部 ${toolStatuses.length} 个工具均为最新版本 (v${OPENSPEC_VERSION})`));
    console.log(chalk.dim(`  工具：${toolNames.join(', ')}`));
    console.log();
    console.log(chalk.dim('使用 --force 强制刷新文件。'));
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

    console.log(`正在更新 ${toolsToUpdate.length} 个工具：${updates.join(', ')}`);

    if (upToDate.length > 0) {
      const upToDateNames = upToDate.map((s) => s.toolId);
      console.log(chalk.dim(`已是最新版本：${upToDateNames.join(', ')}`));
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
        console.log(chalk.yellow(`${tool.name} 需要设置：${tool.setupNote}`));
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
          `检测到新的 ${toolNoun}：${newToolNames.join(', ')}。请运行 'openspec init' 来添加 ${pronoun}。`
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
      console.log(chalk.dim(`注意：${extraWorkflows.length} 个额外的 workflows 不在当前 profile 中（使用 \`openspec config profile\` 管理）`));
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
    console.log(chalk.dim(`注意：您的自定义 profile 缺少 ${missing.length} 个核心 ${label}：${missing.join(', ')}`));
    console.log(chalk.dim(`运行 \`openspec config profile\` 来添加 ${pronoun}，或 \`openspec config profile core\` 使用核心集合。`));
  }

  /**
   * Removes skill directories for workflows when delivery changed to commands-only.
   * Returns the number of directories removed.
   */
  private async removeSkillDirs(skillsRoot: string, skillsDir: string): Promise<number> {
    let removed = 0;

    for (const workflow of ALL_WORKFLOWS) {
      const dirName = WORKFLOW_TO_SKILL_DIR[workflow];
      if (!dirName) continue;

      const skillDir = path.join(skillsDir, dirName);
      if (!fs.existsSync(skillDir)) continue;
      FileSystemUtils.assertPathWithin(skillsRoot, skillDir);
      try {
        await fs.promises.rm(skillDir, { recursive: true, force: true });
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
    desiredWorkflows: readonly (typeof ALL_WORKFLOWS)[number][]
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
        await fs.promises.rm(skillDir, { recursive: true, force: true });
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
      const fullPath = FileSystemUtils.resolveProjectArtifactPath(projectPath, cmdPath);

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
    if (notice) console.log(chalk.dim(notice));
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
        console.log();
        continue;
      }

      console.log(chalk.yellow(legacyMigrationNotice(migration)));

      if (!this.force && isInteractive()) {
        const { confirm } = await import('@inquirer/prompts');
        let shouldMigrate: boolean;
        try {
          shouldMigrate = await confirm({
            message: `是否将 ${describeLegacyMigration(migration)} 从 ${migration.from}/ 迁移到 ${migration.to}/？`,
            default: true,
          });
        } catch {
          // 关闭 stdin 不等于同意，也不应中止更新。
          shouldMigrate = false;
        }
        if (!shouldMigrate) {
          // 说明拒绝的代价。OpenSpec 现在写入当前根目录，所以
          // 文件在原地继续工作，但 OpenSpec 不再管理
          // 它们 — 它不再在之前的目录中查找。
          console.log(
            chalk.dim(
              `保留在原地。OpenSpec 现在写入 ${migration.to}/，不再管理 ` +
                `${migration.from}/，所以这些文件保持原样直到您移动它们。 ` +
                `下次运行时将再次询问。`
            )
          );
          console.log();
          declined.push(migration);
          continue;
        }
      }

      for (const applied of migrateLegacyToolDirs(projectPath, [migration.toolId])) {
        if (hasMovableContent(applied)) {
          console.log(chalk.dim(`Migrated ${describeLegacyMigration(applied)}: ${applied.from} → ${applied.to}`));
        }
        this.reportKeptInPlace(applied);
      }
      console.log();
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
      // 非交互模式且没有 --force：警告并继续
      // 与 init 不同，update 不会中止 — 用户可能只想更新 skills
      console.log(chalk.yellow('⚠ 使用 --force 自动清理旧版文件，或在交互模式下运行。'));
      return { newlyConfiguredTools: [], workflowOverrides: {} };
    }

    // 交互模式：提示确认
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: '是否升级并清理旧版文件？',
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
      console.log(chalk.dim('正在跳过旧版清理。继续更新 skills...'));
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
      console.log(chalk.yellow('已保留没有替换 skills 的延迟全局 prompts：'));
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
    const spinner = ora('正在清理旧版文件...').start();

    const result = await cleanupLegacyArtifacts(projectPath, detection);

    spinner.succeed('旧版文件清理完成');

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
    console.log(chalk.bold('从旧版产物中检测到的工具：'));
    for (const toolId of validUnconfiguredTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      console.log(`  • ${tool?.name || toolId}`);
    }
    console.log();

    let selectedTools: string[];

    if (this.force || !canPrompt) {
      // 非交互模式且使用 --force：自动选择检测到的工具
      selectedTools = validUnconfiguredTools;
      console.log(`正在为以下工具设置 skills：${selectedTools.join(', ')}`);
    } else {
      // 交互模式：使用预选中的检测工具提示用户选择
      const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

      const sortedChoices = validUnconfiguredTools.map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        return {
          name: tool?.name || toolId,
          value: toolId,
          configured: false,
          preSelected: true, // 预选所有检测到的旧版工具
        };
      });

      selectedTools = await searchableMultiSelect({
        message: '选择要使用新 skill 系统设置的工具：',
        pageSize: 15,
        choices: sortedChoices,
        validate: (_selected: string[]) => true, // 允许空选择（用户可跳过）
      });

      if (selectedTools.length === 0) {
        console.log(chalk.dim('正在跳过工具设置。'));
        console.log();
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
    const workflowOverrides: LegacyUpgradeResult['workflowOverrides'] = {};

    for (const toolId of selectedTools) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool || !toolSupportsSkills(tool)) continue;

      const spinner = ora(`正在设置 ${tool.name}...`).start();

      try {
        const skillsDir = resolveToolSkillsDir(projectPath, tool);
        const skillsRoot = hasGlobalSkillTarget(tool) ? skillsDir : projectPath;
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

        // A shared skills root (e.g. `.agents`) already owned by another tool
        // must not be overwritten by a tool inferred from legacy artifacts: a
        // Codex install detected only from global `~/.codex/prompts` would
        // otherwise rewrite an existing vendor-neutral `agents` tree with
        // Codex-specific syntax and flip its ownership marker `agents → codex`.
        // Leave the established owner in place. (init applies the same
        // one-writer rule up front when both targets are selected.)
        //
        // Skipping here means the tool is never recorded as configured, so a
        // persistent legacy signal re-offers it on later runs. Because no
        // replacement is written, this tool is also exempted from immediate
        // legacy cleanup (see skippedSharedSkillTools) — otherwise a repo-local
        // `.codex/prompts` would be deleted with nothing put in its place. That
        // repeat is idempotent and harmless — the alternative is the silent
        // hijack this prevents.
        const sharedOwner = shouldGenerateSkills
          ? sharedSkillRootOwner(projectPath, tool.value)
          : undefined;
        if (sharedOwner) {
          const ownerName =
            AI_TOOLS.find((candidate) => candidate.value === sharedOwner)?.name ?? sharedOwner;
          spinner.info(
            `已跳过 ${tool.name}：${tool.skillsDir}/skills 已被其他工具（${ownerName}）管理。`
          );
          skippedSharedSkillTools.push(tool.value);
          continue;
        }

        // Create skill files when delivery includes skills
        if (shouldGenerateSkills) {
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
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
          writeSharedSkillTarget(projectPath, tool.value);
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
              await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
            }
          }
        }

        spinner.succeed(`${tool.name} 设置完成`);
        newlyConfigured.push(toolId);
        for (const migration of migrateLegacyToolDirs(
          projectPath,
          [tool.value],
          'after-generation'
        )) {
          if (hasMovableContent(migration)) {
            console.log(chalk.dim(`已迁移 ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
          }
          this.reportKeptInPlace(migration);
        }
      } catch (error) {
        spinner.fail(`${tool.name} 设置失败`);
        console.log(chalk.red(`  ${error instanceof Error ? error.message : String(error)}`));
      }
    }

    if (newlyConfigured.length > 0) {
      console.log();
    }

    return { newlyConfiguredTools: newlyConfigured, workflowOverrides, skippedSharedSkillTools };
  }
}
