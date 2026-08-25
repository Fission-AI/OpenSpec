/**
 * Init 命令
 *
 * 使用 Agent 技能和 /opsx:* 斜杠命令设置 OpenSpec。
 * 这是统一的设置命令，替代了旧的 init 和 experimental 命令。
 */

import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { createRequire } from 'module';
import { FileSystemUtils } from '../utils/file-system.js';
import {
  classifyOpenSpecDir,
  MAX_CONTEXT_SIZE,
  readProjectConfig,
  storePointerProblem,
} from './project-config.js';
import { findRepoPlanningRootSync } from './planning-home.js';
import { getSkillReferenceTransformer, getTransformerForTool, usesNaturalLanguageSkillReferences } from '../utils/command-references.js';
import {
  AI_TOOLS,
  OPENSPEC_DIR_NAME,
  AIToolOption,
  resolveToolIdAlias,
} from './config.js';
import { PALETTE } from './styles/palette.js';
import { isInteractive } from '../utils/interactive.js';
import { serializeConfig } from './config-prompts.js';
import {
  generateCommands,
  CommandAdapterRegistry,
} from './command-generation/index.js';
import {
  detectLegacyArtifacts,
  cleanupLegacyArtifacts,
  formatCleanupSummary,
  formatDeferredGlobalPromptSummary,
  formatDetectionSummary,
  getLegacyGlobalPromptMatches,
  omitGlobalLegacyPromptFiles,
  pickGlobalLegacyPromptFiles,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import {
  SKILL_NAMES,
  getToolsWithSkillsDir,
  getToolSkillStatus,
  getToolStates,
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
  hasGlobalSkillTarget,
  resolveToolSkillsDir,
  toolSupportsSkills,
  type ToolSkillStatus,
} from './shared/index.js';
import { getGlobalConfig, type Delivery, type Profile } from './global-config.js';
import { getProfileWorkflows, CORE_WORKFLOWS, ALL_WORKFLOWS } from './profiles.js';
import { getAvailableTools } from './available-tools.js';
import { writeSharedSkillTarget } from './shared-skill-target.js';
import { migrateIfNeeded, migrateLegacyToolDirs, describeLegacyMigration, keptInPlaceNotice, hasMovableContent, scanInstalledWorkflows as scanInstalledWorkflowsShared } from './migration.js';
import {
  resolveCommandSurfaceCapability,
  resolveCommandInvocation,
  shouldGenerateCommandsForTool,
  shouldGenerateSkillsForTool,
  shouldReconcileCommandFilesForTool,
  shouldRemoveSkillsForTool,
} from './command-surface.js';
import {
  writeCopilotCloudFiles,
  readCopilotCloudOptIn,
  hasExistingManagedCloudFiles,
  persistCopilotCloudOptIn,
  removeCopilotCloudFiles,
  findUnmanagedCloudFiles,
  listManagedCloudFiles,
} from './github-copilot/cloud-agent.js';

const require = createRequire(import.meta.url);
const { version: OPENSPEC_VERSION } = require('../../package.json');

// -----------------------------------------------------------------------------
// 常量
// -----------------------------------------------------------------------------

const DEFAULT_SCHEMA = 'spec-driven';

function formatLanguageContext(language: string): string {
  return [
    `语言：${language}`,
    `所有制品必须以 ${language} 编写。`,
    '保持 OpenSpec 结构化标题和 SHALL/MUST 关键词为英文。',
  ].join('\n');
}

const PROGRESS_SPINNER = {
  interval: 80,
  frames: ['░░░', '▒░░', '▒▒░', '▒▒▒', '▓▒▒', '▓▓▒', '▓▓▓', '▒▓▓', '░▒▓'],
};

const WORKFLOW_TO_SKILL_DIR: Record<string, string> = {
  'explore': 'openspec-explore',
  'new': 'openspec-new-change',
  'continue': 'openspec-continue-change',
  'apply': 'openspec-apply-change',
  'update': 'openspec-update-change',
  'ff': 'openspec-ff-change',
  'sync': 'openspec-sync-specs',
  'archive': 'openspec-archive-change',
  'bulk-archive': 'openspec-bulk-archive-change',
  'verify': 'openspec-verify-change',
  'onboard': 'openspec-onboard',
  'propose': 'openspec-propose',
};

// -----------------------------------------------------------------------------
// 类型
// -----------------------------------------------------------------------------

type InitCommandOptions = {
  tools?: string;
  language?: string;
  force?: boolean;
  interactive?: boolean;
  profile?: string;
  /** Commander 的 --no-animation 标志：false 禁用欢迎动画。 */
  animation?: boolean;
  /**
   * GitHub Copilot 云编码代理文件的显式选择/排除。
   * `--copilot-cloud` 设置为 true，`--no-copilot-cloud` 设置为 false；
   * undefined 则留给配置、迁移或交互式提示决定。
   */
  copilotCloud?: boolean;
};

type ValidatedInitTool = {
  value: string;
  name: string;
  skillsDir?: string;
  skillsPath: string;
  skillsRoot: string;
  isGlobalSkillTarget: boolean;
  wasConfigured: boolean;
  requiresIdeRestart?: boolean;
};

/**
 * 保存必须等到替换技能生成后才能继续清理的全局 Codex 提示匹配。
 */
type DeferredLegacyCleanup = {
  detection: LegacyDetectionResult;
};

// -----------------------------------------------------------------------------
// Init 命令类
// -----------------------------------------------------------------------------

export class InitCommand {
  private readonly toolsArg?: string;
  private readonly language?: string;
  private readonly force: boolean;
  private readonly interactiveOption?: boolean;
  private readonly profileOverride?: string;
  private readonly animation: boolean;
  private readonly copilotCloudOption?: boolean;

  constructor(options: InitCommandOptions = {}) {
    this.toolsArg = options.tools;
    this.language = this.normalizeLanguage(options.language);
    this.force = options.force ?? false;
    this.interactiveOption = options.interactive;
    this.profileOverride = options.profile;
    this.animation = options.animation ?? true;
    this.copilotCloudOption = options.copilotCloud;
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    const openspecDir = OPENSPEC_DIR_NAME;
    const openspecPath = path.join(projectPath, openspecDir);

    // 验证在后台静默进行
    const extendMode = await this.validate(projectPath, openspecPath);

    // 指针守卫（第 3.2 切片）：带有 store: 声明的纯配置 openspec/
    // 是外部化规划，而非要扩展的根目录——此类仓库的子目录
    // 不得悄悄产生嵌套根目录。
    // 在遗留清理、迁移或提示触碰任何内容之前拒绝。
    // 在扩展模式下，遍历会找到 projectPath 本身；否则它会找到
    // 最近的祖先根目录（因此指针仓库的子目录会在普通命令解析
    // 指针的位置精确地拒绝）。
    const guardRoot = findRepoPlanningRootSync(projectPath);
    if (guardRoot) {
      const { hasPlanningShape, pointer } = classifyOpenSpecDir(guardRoot);
      if (!hasPlanningShape) {
        if (pointer.malformed) {
          throw new Error(
            `${pointer.filePath} 中的存储声明无效（` +
              storePointerProblem(pointer.malformed) +
              `）。请先修复或移除 store: 行，然后再运行 openspec init。`
          );
        }
        if (pointer.value !== undefined) {
          throw new Error(
            `此仓库的规划已外部化到存储 '${pointer.value}'（${pointer.filePath}）。` +
              `请先移除 store: 行，将此仓库转换为本地 OpenSpec 根目录。`
          );
        }
      }
    }

    await this.assertLanguageCanBeApplied(projectPath, openspecPath);

    // 检查遗留制品并处理清理
    const deferredLegacyCleanup = await this.handleLegacyCleanup(projectPath, extendMode);

    // 将 OpenSpec 管理的技能迁移到重命名的工具目录
    // （如 .kimi -> .kimi-code），在检测之前使其保持可识别。
    migrateLegacyToolDirs(projectPath);

    // 检测项目中的可用工具（第 7.1 任务）
    const detectedTools = getAvailableTools(projectPath);

    // 迁移检查：将现有项目迁移到配置文件系统（第 7.3 任务）
    if (extendMode) {
      migrateIfNeeded(projectPath, detectedTools);
    }

    // 提前验证配置文件覆盖，确保无效值在工具设置之前失败。
    // 解析后的值在生成读取有效配置时被使用。
    // 这在欢迎界面之前运行，使无效的 --profile 不会让用户
    // 先按 Enter 再看到错误。
    this.resolveProfileOverride();

    // 显示动画欢迎界面（仅交互模式）
    const canPrompt = this.canPromptInteractively();
    if (canPrompt) {
      const { showWelcomeScreen } = await import('../ui/welcome-screen.js');
      await showWelcomeScreen(this.getActiveWorkflows(), { animate: this.animation });
    }

    // 在处理前获取工具状态
    const toolStates = getToolStates(projectPath);

    // 获取工具选择（传递检测到的工具用于预选）
    const selectedToolIds = await this.getSelectedTools(toolStates, extendMode, detectedTools, projectPath);

    // 验证选定的工具
    const validatedTools = this.validateTools(selectedToolIds, toolStates, projectPath);

    // 选择重命名的工具意味着同意离开其以前的目录：
    // init 即将写入当前目录，而留下 OpenSpec 内容会给用户
    // 同一工具的两次安装。
    for (const migration of migrateLegacyToolDirs(
      projectPath,
      validatedTools.map((tool) => tool.value)
    )) {
      if (hasMovableContent(migration)) {
        console.log(chalk.dim(`已迁移 ${describeLegacyMigration(migration)}：${migration.from} → ${migration.to}`));
      }
      const kept = keptInPlaceNotice(migration);
      if (kept) console.log(chalk.dim(kept));
    }

    // 决定是否生成 GitHub Copilot 云文件。这是选择加入的
    //（参见 cloud-agent.ts）：选择 Copilot 工具不再静默地
    // 将 GitHub Actions 工作流写入用户的 .github/ 目录。该决定
    // 在生成之前做出，以便可以控制写入，在 config.yaml 存在后持久化，
    // 以便未来的非交互式更新也遵循它。
    const copilotDecision = await this.resolveCopilotCloudDecision(projectPath, validatedTools);

    // 创建目录结构和配置
    await this.createDirectoryStructure(openspecPath, extendMode);

    // 为每个工具生成技能和命令
    const results = await this.generateSkillsAndCommands(
      projectPath,
      validatedTools,
      copilotDecision.write
    );

    // 遗留清理被推迟以避免干扰技能/命令生成；
    // 现在输出已写入，完成清理（如移除过时文件）。
    if (deferredLegacyCleanup) {
      await this.finalizeDeferredLegacyCleanup(projectPath, deferredLegacyCleanup);
    }

    // 如需要，创建 config.yaml
    const configStatus = await this.createConfig(openspecPath, extendMode);

    // 持久化显式的 Copilot 云决定，使 `openspec update`（从不提示）
    // 遵循它。尽力而为：配置写入失败不应使本来成功的初始化失败。
    if (copilotDecision.persist !== undefined) {
      try {
        await persistCopilotCloudOptIn(projectPath, copilotDecision.persist);
      } catch {
        // 非致命：文件（如果有）仍已正确写入。
      }
    }

    // 显式选择退出意味着"这里没有云文件"：清理之前运行（或更旧的 OpenSpec）
    // 生成的任何文件。只移除 OpenSpec 管理的文件 — 用户自定义的文件会被保留。
    let copilotRemoved = 0;
    if (copilotDecision.optedOut) {
      try {
        copilotRemoved = await removeCopilotCloudFiles(projectPath);
      } catch {
        // 非致命：移除目标来自之前运行的文件；此处的失败
        // 只是将它们留给下一次 `openspec update` 清理。
      }
    }

    // 写入后报告磁盘上实际的云结果，
    // 而不是仅根据决定：覆盖用户自有文件是空操作，
    // 替代代理路径可能移除托管文件 — 因此仅列出存在的托管文件，
    // 并单独标记任何保持不变的文件。
    const copilotSucceeded = [...results.createdTools, ...results.refreshedTools].some(
      (tool) => tool.value === 'github-copilot'
    );
    const wroteCloud = copilotDecision.write && copilotSucceeded;
    const copilotPresent = wroteCloud ? await listManagedCloudFiles(projectPath) : [];
    const copilotCollisions = wroteCloud ? await findUnmanagedCloudFiles(projectPath) : [];

    // 显示成功消息
    this.displaySuccessMessage(projectPath, validatedTools, results, configStatus, {
      write: copilotDecision.write,
      skippedUndecided: copilotDecision.skippedUndecided,
      present: copilotPresent,
      collisions: copilotCollisions,
      removed: copilotRemoved,
    });
    if (results.failedTools.length > 0) {
      throw new Error(
        `OpenSpec setup failed for: ${results.failedTools.map((tool) => tool.name).join(', ')}`
      );
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 验证与设置
  // ═══════════════════════════════════════════════════════════

  private async validate(
    projectPath: string,
    openspecPath: string
  ): Promise<boolean> {
    const extendMode = await FileSystemUtils.directoryExists(openspecPath);

    // 检查写入权限
    if (!(await FileSystemUtils.ensureWritePermissions(projectPath))) {
      throw new Error(`没有写入 ${projectPath} 的权限`);
    }
    return extendMode;
  }

  private canPromptInteractively(): boolean {
    if (this.interactiveOption === false) return false;
    if (this.toolsArg !== undefined) return false;
    return isInteractive({ interactive: this.interactiveOption });
  }

  /**
   * 决定是否生成 GitHub Copilot 云代理文件，以及是否持久化该决定。
   * 优先级：
   *   1. `--copilot-cloud` / `--no-copilot-cloud` 标志（本次显式设置）
   *   2. config.yaml 中持久化的选择加入
   *   3. 已存在的托管文件（为预选择加入的项目迁移）
   *   4. 交互式确认（默认否）
   *   5. 非交互模式且无信号：跳过，且不持久化默认值
   *
   * @returns `write` — 本次生成文件；`persist` — 写回配置的值
   *   （undefined = 保持配置不变）；`optedOut` — 用户明确拒绝，
   *   已生成的托管文件应被移除；`skippedUndecided` — 已选择但无信号
   *   且无法询问，调用方可提示存在选择加入。
   */
  private async resolveCopilotCloudDecision(
    projectPath: string,
    tools: ValidatedInitTool[]
  ): Promise<{ write: boolean; persist?: boolean; optedOut: boolean; skippedUndecided: boolean }> {
    const copilotSelected = tools.some((tool) => tool.value === 'github-copilot');
    if (!copilotSelected) {
      // 不适用的标志可能是个错误 — 说明原因而不是静默执行
      if (this.copilotCloudOption !== undefined) {
        console.log(
          chalk.yellow(
            '已忽略 --copilot-cloud/--no-copilot-cloud，因为未选择 github-copilot 工具。'
          )
        );
      }
      return { write: false, optedOut: false, skippedUndecided: false };
    }

    if (this.copilotCloudOption !== undefined) {
      return {
        write: this.copilotCloudOption,
        persist: this.copilotCloudOption,
        optedOut: !this.copilotCloudOption,
        skippedUndecided: false,
      };
    }

    const persistedOptIn = readCopilotCloudOptIn(projectPath);
    if (typeof persistedOptIn === 'boolean') {
      return { write: persistedOptIn, optedOut: !persistedOptIn, skippedUndecided: false };
    }

    if (await hasExistingManagedCloudFiles(projectPath)) {
      return { write: true, optedOut: false, skippedUndecided: false };
    }

    if (this.canPromptInteractively()) {
      const { confirm } = await import('@inquirer/prompts');
      const answer = await confirm({
        message:
          '是否设置 GitHub Copilot 云编码代理文件？这是为 GitHub 托管的 ' +
          'Copilot 编码代理（github.com），而非编辑器中的 Copilot。将写入两个文件：' +
          '.github/workflows/copilot-setup-steps.yml 和 .github/agents/openspec.agent.md.',
        default: false,
      });
      return { write: answer, persist: answer, optedOut: !answer, skippedUndecided: false };
    }

    // 非交互模式且无显式信号：不写入，且不持久化该决定，
    // 以便后续交互式运行仍可提示。
    return { write: false, optedOut: false, skippedUndecided: true };
  }

  private resolveProfileOverride(): Profile | undefined {
    if (this.profileOverride === undefined) {
      return undefined;
    }

    if (this.profileOverride === 'core' || this.profileOverride === 'custom') {
      return this.profileOverride;
    }

    throw new Error(`无效的 profile "${this.profileOverride}"。可用的 profile：core, custom`);
  }

  /**
   * 解析有效 profile 安装的 workflows，使初始化输出
   * 仅提及实际存在的命令。
   */
  private getActiveWorkflows(): string[] {
    const globalCfg = getGlobalConfig();
    const activeProfile: Profile = this.resolveProfileOverride() ?? globalCfg.profile ?? 'core';
    return [...getProfileWorkflows(activeProfile, globalCfg.workflows)];
  }

  // ═══════════════════════════════════════════════════════════
  // 遗留清理
  // ═══════════════════════════════════════════════════════════

  /**
   * 立即清理仓库本地的遗留制品，并将全局 Codex 提示清理
   * 推迟到替换技能安装完成之后。
   */
  private async handleLegacyCleanup(projectPath: string, extendMode: boolean): Promise<DeferredLegacyCleanup | null> {
    // 检测遗留制品
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return null; // 未发现遗留制品
    }

    const immediateDetection = omitGlobalLegacyPromptFiles(detection);

    // 显示检测到的内容
    const immediateSummary = formatDetectionSummary(immediateDetection);
    if (immediateSummary) {
      console.log();
      console.log(immediateSummary);
      console.log();
    }

    // 显示哪些全局提示被推迟 — 它们仅在对应替换技能
    // 生成时才会被移除。
    const deferredSummary = formatDeferredGlobalPromptSummary(detection);
    if (deferredSummary) {
      console.log(deferredSummary);
      console.log();
    }

    const canPrompt = this.canPromptInteractively();

    if (this.force || !canPrompt) {
      // --force 标志或非交互模式：自动进行清理。
      // 遗留斜杠命令 100% 由 OpenSpec 管理，配置文件清理
      // 仅移除标记（永不删除文件），因此自动清理是安全的。
      await this.performImmediateLegacyCleanup(projectPath, detection);
      return detection.globalSlashCommandFiles.length > 0 ? { detection } : null;
    }

    // 交互模式：提示确认
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: '是否升级并清理遗留文件？',
      default: true,
    });

    if (!shouldCleanup) {
      console.log(chalk.dim('初始化已取消。'));
      console.log(chalk.dim('使用 --force 跳过此提示，或手动删除遗留文件。'));
      process.exit(0);
    }

    await this.performImmediateLegacyCleanup(projectPath, detection);
    return detection.globalSlashCommandFiles.length > 0 ? { detection } : null;
  }

  /**
   * 应用不依赖新生成 Codex 技能的安全遗留清理子集。
   */
  private async performImmediateLegacyCleanup(
    projectPath: string,
    detection: LegacyDetectionResult
  ): Promise<void> {
    const immediateDetection = omitGlobalLegacyPromptFiles(detection);
    if (!immediateDetection.hasLegacyArtifacts) {
      return;
    }

    await this.performLegacyCleanup(projectPath, immediateDetection);
  }

  /**
   * 仅移除那些 workflows 已有替换技能的遗留全局 Codex 提示。
   */
  private async finalizeDeferredLegacyCleanup(
    projectPath: string,
    deferredCleanup: DeferredLegacyCleanup
  ): Promise<void> {
    const availableCodexWorkflows = await this.getInstalledWorkflowsForTool(projectPath, 'codex');
    const removableMatches = getLegacyGlobalPromptMatches(deferredCleanup.detection)
      .filter((prompt) => prompt.workflowIds.every((workflowId) => availableCodexWorkflows.has(workflowId)));

    if (removableMatches.length > 0) {
      await this.performLegacyCleanup(
        projectPath,
        pickGlobalLegacyPromptFiles(
          deferredCleanup.detection,
          removableMatches.map((prompt) => prompt.path)
        )
      );
    }

    const blockedMatches = getLegacyGlobalPromptMatches(deferredCleanup.detection)
      .filter((prompt) => !removableMatches.some((match) => match.path === prompt.path));

    if (blockedMatches.length > 0) {
      console.log(chalk.yellow('保留无替换技能的推迟全局提示：'));
      for (const prompt of blockedMatches) {
        console.log(chalk.dim(`  - ${prompt.toolId}: ${prompt.path}`));
      }
      console.log();
    }
  }

  /**
   * 从磁盘上生成的技能布局中读取单个工具当前安装的 workflow ID。
   */
  private async getInstalledWorkflowsForTool(projectPath: string, toolId: string): Promise<Set<string>> {
    const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
    if (!tool) {
      return new Set<string>();
    }

    return new Set(scanInstalledWorkflowsShared(projectPath, [tool]));
  }

  private async performLegacyCleanup(projectPath: string, detection: LegacyDetectionResult): Promise<void> {
    const spinner = ora('正在清理遗留文件...').start();

    const result = await cleanupLegacyArtifacts(projectPath, detection);

    spinner.succeed('遗留文件清理完成');

    const summary = formatCleanupSummary(result);
    if (summary) {
      console.log();
      console.log(summary);
    }

    console.log();
  }

  // ═══════════════════════════════════════════════════════════
  // 工具选择
  // ═══════════════════════════════════════════════════════════

  private async getSelectedTools(
    toolStates: Map<string, ToolSkillStatus>,
    extendMode: boolean,
    detectedTools: AIToolOption[],
    projectPath: string
  ): Promise<string[]> {
    // 首先检查 --tools 标志
    const nonInteractiveSelection = this.resolveToolsArg();
    if (nonInteractiveSelection !== null) {
      return nonInteractiveSelection;
    }

    const validTools = getToolsWithSkillsDir();
    const detectedToolIds = new Set(detectedTools.map((t) => t.value));
    const configuredToolIds = new Set(
      [...toolStates.entries()]
        .filter(([, status]) => status.configured)
        .map(([toolId]) => toolId)
    );
    const shouldPreselectDetected = !extendMode && configuredToolIds.size === 0;
    const canPrompt = this.canPromptInteractively();

    // 非交互模式：使用检测到的工具作为备选（任务 7.8）
    if (!canPrompt) {
      if (detectedToolIds.size > 0) {
        return [...detectedToolIds];
      }
      throw new Error(
        `未检测到工具且未提供 --tools 标志。可用工具：\n  ${validTools.join('\n  ')}\n\n使用 --tools all、--tools none 或 --tools claude,cursor,...`
      );
    }

    if (validTools.length === 0) {
      throw new Error(
        `没有可用于生成技能的工具。`
      );
    }

    // 交互模式：显示可搜索的多选框
    const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

    // 构建选项：预选已配置的工具；保持检测到的工具可见但未选中。
    const sortedChoices = validTools
      .map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        const status = toolStates.get(toolId);
        const configured = status?.configured ?? false;
        const detected = detectedToolIds.has(toolId);

        return {
          name: tool?.name || toolId,
          value: toolId,
          configured,
          detected: detected && !configured,
          preSelected: configured || (shouldPreselectDetected && detected && !configured),
        };
      })
      .sort((a, b) => {
        // 已配置的工具优先，然后是检测到的（未配置），最后是其他。
        if (a.configured && !b.configured) return -1;
        if (!a.configured && b.configured) return 1;
        if (a.detected && !b.detected) return -1;
        if (!a.detected && b.detected) return 1;
        return 0;
      });

    const configuredNames = validTools
      .filter((toolId) => configuredToolIds.has(toolId))
      .map((toolId) => AI_TOOLS.find((t) => t.value === toolId)?.name || toolId);

    if (configuredNames.length > 0) {
      console.log(`OpenSpec 已配置：${configuredNames.join(', ')}（已预选）`);
    }

    const detectedOnlyNames = detectedTools
      .filter((tool) => !configuredToolIds.has(tool.value))
      .map((tool) => tool.name);

    if (detectedOnlyNames.length > 0) {
      const detectionLabel = shouldPreselectDetected
        ? '已预选用于首次设置'
        : '未预选';
      console.log(`检测到的工具目录：${detectedOnlyNames.join(', ')}（${detectionLabel}）`);
    }

    const selectedTools = await searchableMultiSelect({
      message: `选择要设置的工具（共 ${validTools.length} 个可用）`,
      pageSize: 15,
      choices: sortedChoices,
      validate: (selected: string[]) => selected.length > 0 || '至少选择一个工具',
    });

    if (selectedTools.length === 0) {
      throw new Error('必须至少选择一个工具');
    }

    return selectedTools;
  }

  private resolveToolsArg(): string[] | null {
    if (typeof this.toolsArg === 'undefined') {
      return null;
    }

    const raw = this.toolsArg.trim();
    if (raw.length === 0) {
      throw new Error(
        '--tools 选项需要一个值。使用 "all"、"none" 或逗号分隔的工具 ID 列表。'
      );
    }

    const availableTools = getToolsWithSkillsDir();
    const availableSet = new Set(availableTools);
    const availableList = ['all', 'none', ...availableTools].join(', ');

    const lowerRaw = raw.toLowerCase();
    if (lowerRaw === 'all') {
      return availableTools;
    }

    if (lowerRaw === 'none') {
      return [];
    }

    const tokens = raw
      .split(',')
      .map((token) => token.trim())
      .filter((token) => token.length > 0);

    if (tokens.length === 0) {
      throw new Error(
        '--tools 选项在未使用 "all" 或 "none" 时至少需要一个工具 ID。'
      );
    }

    // 已废弃的 ID 解析到其当前工具，因此品牌重命名不会破坏
    // 现有设置脚本中的 `--tools windsurf`。
    const normalizedTokens = tokens.map((token) => resolveToolIdAlias(token.toLowerCase()));

    if (normalizedTokens.some((token) => token === 'all' || token === 'none')) {
      throw new Error('不能将保留值 "all" 或 "none" 与特定工具 ID 组合使用。');
    }

    const invalidTokens = tokens.filter(
      (_token, index) => !availableSet.has(normalizedTokens[index])
    );

    if (invalidTokens.length > 0) {
      throw new Error(
        `无效的工具：${invalidTokens.join(', ')}。可用值：${availableList}`
      );
    }

    // 去重的同时保持顺序
    const deduped: string[] = [];
    for (const token of normalizedTokens) {
      if (!deduped.includes(token)) {
        deduped.push(token);
      }
    }

    return deduped;
  }

  private validateTools(
    toolIds: string[],
    toolStates: Map<string, ToolSkillStatus>,
    projectPath: string
  ): ValidatedInitTool[] {
    const validatedTools: ValidatedInitTool[] = [];

    const sharedAgentsTargets = ['codex', 'zed', 'agents'];
    const selectedSharedTargets = sharedAgentsTargets.filter((toolId) => toolIds.includes(toolId));
    // Codex 渲染的树已经服务于 Zed。当 Zed 稍后被添加时保留它，
    // 以便 Codex 用户不会丢失他们需要的 `$openspec-*` 引用。
    const preserveConfiguredCodex = selectedSharedTargets.includes('zed') &&
      toolStates.get('codex')?.configured;
    const sharedTargetCandidates = preserveConfiguredCodex
      ? [...new Set([...selectedSharedTargets, 'codex'])]
      : selectedSharedTargets;
    const sharedTargetOwner = sharedTargetCandidates.includes('codex')
      ? 'codex'
      : selectedSharedTargets.includes('zed')
        ? 'zed'
        : selectedSharedTargets[0];
    const firstSharedIndex = toolIds.findIndex((id) => sharedAgentsTargets.includes(id));
    const reconciledToolIds = sharedTargetCandidates.length > 1
      ? toolIds.flatMap((toolId, index) => {
          if (!sharedAgentsTargets.includes(toolId)) return [toolId];
          return index === firstSharedIndex && sharedTargetOwner ? [sharedTargetOwner] : [];
        })
      : toolIds;
    if (
      reconciledToolIds.length !== toolIds.length ||
      reconciledToolIds.some((toolId, index) => toolId !== toolIds[index])
    ) {
      console.log(
        chalk.dim(
          `Codex、Zed 和 agents 共享 .agents/skills；为 ${sharedTargetOwner} 生成一个目录。`
        )
      );
    }

    for (const toolId of reconciledToolIds) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool) {
        const validToolIds = getToolsWithSkillsDir();
        throw new Error(
          `未知工具 '${toolId}'。可用工具：\n  ${validToolIds.join('\n  ')}`
        );
      }

      if (!toolSupportsSkills(tool)) {
        const validToolsWithSkills = getToolsWithSkillsDir();
        throw new Error(
          `工具 '${toolId}' 不支持技能生成。\n支持技能生成的工具：\n  ${validToolsWithSkills.join('\n  ')}`
        );
      }

      const preState = toolStates.get(tool.value);
      const skillsPath = resolveToolSkillsDir(projectPath, tool);
      const isGlobalSkillTarget = hasGlobalSkillTarget(tool);
      validatedTools.push({
        value: tool.value,
        name: tool.name,
        skillsDir: tool.skillsDir,
        skillsPath,
        skillsRoot: isGlobalSkillTarget ? skillsPath : projectPath,
        isGlobalSkillTarget,
        wasConfigured: preState?.configured ?? false,
        requiresIdeRestart: tool.requiresIdeRestart,
      });
    }

    return validatedTools;
  }

  // ═══════════════════════════════════════════════════════════
  // 目录结构
  // ═══════════════════════════════════════════════════════════

  private async createDirectoryStructure(openspecPath: string, extendMode: boolean): Promise<void> {
    if (extendMode) {
      // 在扩展模式下，仅确保目录存在，不显示加载动画
      const directories = [
        openspecPath,
        path.join(openspecPath, 'specs'),
        path.join(openspecPath, 'changes'),
        path.join(openspecPath, 'changes', 'archive'),
      ];

      for (const dir of directories) {
        FileSystemUtils.assertProjectArtifactPath(path.dirname(openspecPath), dir);
        await FileSystemUtils.createDirectory(dir);
      }
      return;
    }

    const spinner = this.startSpinner('正在创建 OpenSpec 结构...');

    const directories = [
      openspecPath,
      path.join(openspecPath, 'specs'),
      path.join(openspecPath, 'changes'),
      path.join(openspecPath, 'changes', 'archive'),
    ];

    for (const dir of directories) {
      FileSystemUtils.assertProjectArtifactPath(path.dirname(openspecPath), dir);
      await FileSystemUtils.createDirectory(dir);
    }

    spinner.stopAndPersist({
      symbol: PALETTE.white('▌'),
      text: PALETTE.white('OpenSpec 结构已创建'),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 技能与命令生成
  // ═══════════════════════════════════════════════════════════

  /**
   * 为每个选定的工具生成技能文件和斜杠命令，
   * 遵循配置的交付模式（技能、命令或两者）。
   *
   * @param projectPath - 项目根目录的绝对路径
   * @param tools - 选定的工具及其技能目录元数据
   * @returns 已创建、已刷新和失败的工具及已移除的制品数量
   */
  private async generateSkillsAndCommands(
    projectPath: string,
    tools: ValidatedInitTool[],
    writeCopilotCloud: boolean
  ): Promise<{
    createdTools: typeof tools;
    refreshedTools: typeof tools;
    failedTools: Array<{ name: string; error: Error }>;
    commandsSkipped: string[];
    skillsInvocableCommandSkips: string[];
    removedCommandCount: number;
    removedSkillCount: number;
  }> {
    const createdTools: typeof tools = [];
    const refreshedTools: typeof tools = [];
    const failedTools: Array<{ name: string; error: Error }> = [];
    const commandsSkipped: string[] = [];
    const skillsInvocableCommandSkips: string[] = [];
    let removedCommandCount = 0;
    let removedSkillCount = 0;

    // 读取全局配置获取 profile 和交付设置（如有 --profile 覆盖则使用）
    const globalConfig = getGlobalConfig();
    const profile: Profile = this.resolveProfileOverride() ?? globalConfig.profile ?? 'core';
    const delivery: Delivery = globalConfig.delivery ?? 'both';
    const workflows = getProfileWorkflows(profile, globalConfig.workflows);

    // 按 profile workflow 过滤获取技能和命令模板
    const deliveryIncludesCommands = delivery !== 'skills';
    const skillTemplates = getSkillTemplates(workflows);
    const commandContents = getCommandContents(workflows);

    // 处理每个工具
    for (const tool of tools) {
      const spinner = ora(`正在设置 ${tool.name}...`).start();

      try {
        const shouldGenerateSkills = shouldGenerateSkillsForTool(tool.value, delivery);
        const shouldGenerateCommands = shouldGenerateCommandsForTool(tool.value, delivery);

        // 如果选定的交付模式和工具能力允许技能，则生成技能文件
        if (shouldGenerateSkills) {
          // 创建技能目录和 SKILL.md 文件
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(tool.skillsPath, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            // 使用包含 generatedBy 的 YAML frontmatter 生成 SKILL.md 内容
            const transformer = getTransformerForTool(
              tool.value,
              delivery,
              resolveCommandSurfaceCapability(tool.value),
              resolveCommandInvocation(tool.value)
            );
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);

            // 写入技能文件
            FileSystemUtils.assertPathWithin(tool.skillsRoot, skillFile);
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
          writeSharedSkillTarget(projectPath, tool.value);
        }
        if (shouldRemoveSkillsForTool(tool.value, delivery) && !tool.isGlobalSkillTarget) {
          removedSkillCount += await this.removeSkillDirs(tool.skillsRoot, tool.skillsPath);
          // 保留显式选择，即使此交付模式不产生技能，
          // 以防不同的遗留兄弟抢占所有权。
          writeSharedSkillTarget(projectPath, tool.value);
        }

        // 如果交付模式包含命令，则生成命令
        if (shouldGenerateCommands) {
          const adapter = CommandAdapterRegistry.get(tool.value);
          if (adapter) {
            const generatedCommands = generateCommands(commandContents, adapter);

            for (const cmd of generatedCommands) {
              const commandFile = FileSystemUtils.resolveProjectArtifactPath(projectPath, cmd.path);
              await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
            }
          }
        } else if (deliveryIncludesCommands) {
          if (resolveCommandSurfaceCapability(tool.value) === 'skills-invocable') {
            skillsInvocableCommandSkips.push(tool.value);
          } else {
            commandsSkipped.push(tool.value);
          }
        }
        if (shouldReconcileCommandFilesForTool(tool.value, delivery)) {
          removedCommandCount += await this.removeCommandFiles(projectPath, tool.value);
        }
        if (tool.value === 'github-copilot' && writeCopilotCloud) {
          await writeCopilotCloudFiles(projectPath);
        }

        spinner.succeed(`${tool.name} 设置完成`);

        if (tool.wasConfigured) {
          refreshedTools.push(tool);
        } else {
          createdTools.push(tool);
        }
      } catch (error) {
        spinner.fail(`${tool.name} 设置失败`);
        failedTools.push({ name: tool.name, error: error as Error });
      }
    }

    for (const tool of [...createdTools, ...refreshedTools]) {
      for (const migration of migrateLegacyToolDirs(
        projectPath,
        [tool.value],
        'after-generation'
      )) {
        if (hasMovableContent(migration)) {
          console.log(chalk.dim(`已迁移 ${describeLegacyMigration(migration)}：${migration.from} → ${migration.to}`));
        }
        const kept = keptInPlaceNotice(migration);
        if (kept) console.log(chalk.dim(kept));
      }
    }

    return {
      createdTools,
      refreshedTools,
      failedTools,
      commandsSkipped,
      skillsInvocableCommandSkips,
      removedCommandCount,
      removedSkillCount,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 配置文件
  // ═══════════════════════════════════════════════════════════

  private normalizeLanguage(language: string | undefined): string | undefined {
    if (language === undefined) return undefined;

    const normalized = language.trim();
    if (!normalized) {
      throw new Error('--language 选项需要一个非空值。');
    }
    if (/\p{Cc}|\p{Bidi_Control}|[\u200B\u2028\u2029\uFEFF]/u.test(normalized)) {
      throw new Error(
        '--language 选项必须是单行文本，不能包含控制字符或不可见的格式化字符。'
      );
    }
    const serializedContext = `${formatLanguageContext(normalized)}\n`;
    if (Buffer.byteLength(serializedContext, 'utf8') > MAX_CONTEXT_SIZE) {
      throw new Error(
        `--language 选项对于 OpenSpec 的 ${MAX_CONTEXT_SIZE / 1024}KB 项目上下文限制来说太长。`
      );
    }
    return normalized;
  }

  private languageContext(): string | undefined {
    if (!this.language) return undefined;
    return formatLanguageContext(this.language);
  }

  private async assertLanguageCanBeApplied(
    projectPath: string,
    openspecPath: string
  ): Promise<void> {
    const languageContext = this.languageContext();
    if (!languageContext) return;

    const configPath = path.join(openspecPath, 'config.yaml');
    const hasConfig = fs.existsSync(configPath) ||
      fs.existsSync(path.join(openspecPath, 'config.yml'));
    if (!hasConfig) {
      try {
        FileSystemUtils.assertProjectArtifactPath(projectPath, configPath);
      } catch (error) {
        const reason = error instanceof Error ? `: ${error.message}` : '';
        throw new Error(`无法为 --language 创建 openspec/config.yaml${reason}`);
      }
      if (!(await FileSystemUtils.canWriteFile(configPath))) {
        throw new Error(
          '无法为 --language 创建 openspec/config.yaml：目标位置不可写。'
        );
      }
      return;
    }

    const existingContext = readProjectConfig(projectPath)?.context;
    if (existingContext?.includes(languageContext)) return;

    throw new Error(
      '--language 不会覆盖已存在的 OpenSpec 配置。' +
      '请改为将语言指令添加到其 context 字段中。'
    );
  }

  private async createConfig(openspecPath: string, extendMode: boolean): Promise<'created' | 'exists' | 'skipped'> {
    const configPath = path.join(openspecPath, 'config.yaml');
    const configYmlPath = path.join(openspecPath, 'config.yml');
    const configYamlExists = fs.existsSync(configPath);
    const configYmlExists = fs.existsSync(configYmlPath);

    if (configYamlExists || configYmlExists) {
      return 'exists';
    }


    try {
      const yamlContent = serializeConfig({
        schema: DEFAULT_SCHEMA,
        context: this.languageContext(),
      });
      FileSystemUtils.assertProjectArtifactPath(path.dirname(openspecPath), configPath);
      await FileSystemUtils.writeFile(configPath, yamlContent);
      return 'created';
    } catch (error) {
      if (this.language) {
        const reason = error instanceof Error ? `: ${error.message}` : '';
        throw new Error(`为 --language 创建 openspec/config.yaml 失败${reason}`);
      }
      return 'skipped';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 界面与输出
  // ═══════════════════════════════════════════════════════════

  private displaySuccessMessage(
    projectPath: string,
    tools: ValidatedInitTool[],
    results: {
      createdTools: typeof tools;
      refreshedTools: typeof tools;
      failedTools: Array<{ name: string; error: Error }>;
      commandsSkipped: string[];
      skillsInvocableCommandSkips: string[];
      removedCommandCount: number;
      removedSkillCount: number;
    },
    configStatus: 'created' | 'exists' | 'skipped',
    copilot: {
      write: boolean;
      skippedUndecided: boolean;
      present: string[];
      collisions: string[];
      removed: number;
    }
  ): void {
    console.log();
    console.log(
      chalk.bold(
        results.failedTools.length > 0 ? 'OpenSpec 设置未完成' : 'OpenSpec 设置完成'
      )
    );
    console.log();

    // 显示已创建 vs 已刷新的工具
    if (results.createdTools.length > 0) {
      console.log(`已创建：${results.createdTools.map((t) => t.name).join(', ')}`);
    }
    if (results.refreshedTools.length > 0) {
      console.log(`已刷新：${results.refreshedTools.map((t) => t.name).join(', ')}`);
    }

    // 显示计数（遵循 profile 过滤器）
    const successfulTools = [...results.createdTools, ...results.refreshedTools];
    if (successfulTools.length > 0) {
      const globalConfig = getGlobalConfig();
      const profile: Profile = (this.profileOverride as Profile) ?? globalConfig.profile ?? 'core';
      const delivery: Delivery = globalConfig.delivery ?? 'both';
      const workflows = getProfileWorkflows(profile, globalConfig.workflows);
      const usesGlobalSkillTarget = successfulTools.some((tool) => tool.isGlobalSkillTarget);

      if (!usesGlobalSkillTarget) {
        const toolDirs = [
          ...new Set(
            successfulTools
              .map((tool) => tool.skillsDir)
              .filter((skillsDir): skillsDir is string => Boolean(skillsDir))
          ),
        ].join(', ');
        const skillCount = successfulTools.some((tool) =>
          shouldGenerateSkillsForTool(tool.value, delivery)
        )
          ? getSkillTemplates(workflows).length
          : 0;
        const commandCount = successfulTools.some((tool) =>
          shouldGenerateCommandsForTool(tool.value, delivery)
        )
          ? getCommandContents(workflows).length
          : 0;
        if (skillCount > 0 && commandCount > 0) {
          console.log(`${skillCount} 个技能和 ${commandCount} 个命令在 ${toolDirs}/`);
        } else if (skillCount > 0) {
          console.log(`${skillCount} 个技能在 ${toolDirs}/`);
        } else if (commandCount > 0) {
          console.log(`${commandCount} 个命令在 ${toolDirs}/`);
        }
      } else {
        const skillTools = successfulTools.filter((tool) =>
          shouldGenerateSkillsForTool(tool.value, delivery)
        );
        const skillCount = skillTools.length * getSkillTemplates(workflows).length;
        if (skillCount > 0) {
          const skillDirs = [...new Set(skillTools.map((tool) => tool.skillsPath))];
          console.log(`${skillCount} 个技能在 ${skillDirs.join(', ')}`);
        }

        const commandContents = getCommandContents(workflows);
        const commandTools = successfulTools.filter((tool) =>
          shouldGenerateCommandsForTool(tool.value, delivery)
        );
        const commandCount = commandTools.length * commandContents.length;
        if (commandCount > 0) {
          const commandDirs = [
            ...new Set(
              commandTools.flatMap((tool) => {
                const adapter = CommandAdapterRegistry.get(tool.value);
                if (!adapter) return [];
                return commandContents.map((command) => {
                  const commandPath = adapter.getFilePath(command.id);
                  const absolutePath = path.isAbsolute(commandPath)
                    ? commandPath
                    : path.join(projectPath, commandPath);
                  return path.dirname(absolutePath);
                });
              })
            ),
          ];
          console.log(`${commandCount} 个命令在 ${commandDirs.join(', ')}`);
        }
      }
    }

    // 显示失败项
    if (results.failedTools.length > 0) {
      console.log(chalk.red(`失败：${results.failedTools.map((f) => `${f.name} (${f.error.message})`).join(', ')}`));
    }

    // 显示跳过的命令
    if (results.commandsSkipped.length > 0) {
      console.log(chalk.dim(`为以下工具跳过命令：${results.commandsSkipped.join(', ')}（无适配器）`));
    }
    if (results.skillsInvocableCommandSkips.length > 0) {
      console.log(chalk.dim(`为以下工具跳过命令：${results.skillsInvocableCommandSkips.join(', ')}（使用技能）`));
    }
    if (results.removedCommandCount > 0) {
      console.log(chalk.dim(`已移除：${results.removedCommandCount} 个命令文件（交付：技能）`));
    }
    if (results.removedSkillCount > 0) {
      console.log(chalk.dim(`已移除：${results.removedSkillCount} 个技能目录（交付：命令）`));
    }

    // GitHub Copilot 云文件是选择加入的 — 报告磁盘上实际的内容：
    // 列出现在存在的托管文件（从不报告我们未写入的文件），标记
    // 我们保持不变的用户自有文件，说明选择退出的清理，或（当
    // 因缺少信号而跳过时）说明如何启用。
    const copilotSucceeded = successfulTools.some((tool) => tool.value === 'github-copilot');
    if (copilotSucceeded && copilot.write) {
      if (copilot.present.length > 0) {
        console.log(`GitHub Copilot 云文件：${copilot.present.join(', ')}`);
      }
      if (copilot.collisions.length > 0) {
        console.log(
          chalk.dim(
            `保留了您现有的 ${copilot.collisions.join(' 和 ')} 不变 — 请手动添加 OpenSpec ` +
              `安装步骤，以便 Copilot 云代理可以运行 openspec。`
          )
        );
      }
    } else if (copilotSucceeded && copilot.removed > 0) {
      console.log(
        chalk.dim(`已移除：${copilot.removed} 个 Copilot 云代理文件（选择退出云文件）`)
      );
    } else if (copilotSucceeded && copilot.skippedUndecided) {
      console.log(
        chalk.dim("已跳过 GitHub Copilot 云文件（选择加入）。使用 'openspec init --copilot-cloud' 启用。")
      );
    }

    // 显示需要额外配置的工具的手动设置说明
    for (const tool of successfulTools) {
      const setupNote = AI_TOOLS.find((t) => t.value === tool.value)?.setupNote;
      if (setupNote) {
        console.log(chalk.yellow(`需要为 ${tool.name} 进行设置：${setupNote}`));
      }
    }

    // 配置状态
    if (configStatus === 'created') {
      console.log(`配置：openspec/config.yaml（schema：${DEFAULT_SCHEMA}）`);
    } else if (configStatus === 'exists') {
      // 显示实际文件名（config.yaml 或 config.yml）
      const configYaml = path.join(projectPath, OPENSPEC_DIR_NAME, 'config.yaml');
      const configYml = path.join(projectPath, OPENSPEC_DIR_NAME, 'config.yml');
      const configName = fs.existsSync(configYaml) ? 'config.yaml' : fs.existsSync(configYml) ? 'config.yml' : 'config.yaml';
      console.log(`配置：openspec/${configName}（已存在）`);
    } else {
      console.log(chalk.dim(`配置：已跳过（非交互模式）`));
    }

    // 入门指南（任务 7.6：如果在 profile 中则显示 propose）
    const activeWorkflows = this.getActiveWorkflows();
    // 当没有工具获得 /opsx:* 命令时，指向技能而不是不存在的命令。
    const activeDelivery: Delivery = getGlobalConfig().delivery ?? 'both';
    const commandsGenerated = successfulTools.some((tool) => shouldGenerateCommandsForTool(tool.value, activeDelivery));
    const skillsGenerated = successfulTools.some((tool) => shouldGenerateSkillsForTool(tool.value, activeDelivery));
    // 每个提示行必须是其服务工具可用的指令。
    // 生成了命令的工具会被告知其文件对应的命令名
    //（在 opsx/ 下命名空间时为 /opsx:*，文件名是命令时为 /opsx-*）；
    // 只获得技能的工具会被告知其文档化的技能调用方式
    //（Kimi Code: /skill:openspec-*；Codex CLI: $openspec-*；其他：/openspec-*）。
    // 没有获得制品的工具则通过配置更正来处理。当选择不一致时，
    // 为每个适用工具打印一行独立的指令。
    const startHintLines = (command: string): string[] => {
      const hintToTools = new Map<string, string[]>();
      for (const tool of successfulTools) {
        let hint: string;
        if (shouldGenerateCommandsForTool(tool.value, activeDelivery)) {
          const transformer = getTransformerForTool(
            tool.value,
            activeDelivery,
            resolveCommandSurfaceCapability(tool.value),
            resolveCommandInvocation(tool.value)
          );
          hint = `开始你的第一个 change：${transformer ? transformer(command) : command} "你的想法"`;
        } else if (shouldGenerateSkillsForTool(tool.value, activeDelivery)) {
          const skillReference = getSkillReferenceTransformer(tool.value)(command);
          // 没有斜杠表面的工具（如 Rovo Dev）通过自然语言引用技能
          //（"openspec-propose 技能"）；措辞要使其读起来像指令
          // 而不是带有参数的死命令。
          hint = usesNaturalLanguageSkillReferences(tool.value)
            ? `开始你的第一个 change：让 ${tool.name} 使用 ${skillReference} 并输入 "你的想法"`
            : `开始你的第一个 change：${skillReference} "你的想法"`;
        } else {
          continue;
        }
        hintToTools.set(hint, [...(hintToTools.get(hint) ?? []), tool.name]);
      }
      if (hintToTools.size === 0) {
        // 没有成功的工具：保留通用命令提示
        return [`开始你的第一个 change：${command} "你的想法"`];
      }
      if (hintToTools.size === 1) {
        return [[...hintToTools.keys()][0]];
      }
      return [...hintToTools.entries()].map(([hint, toolNames]) => `${hint} (${toolNames.join(', ')})`);
    };
    const printStartHints = (command: string): void => {
      console.log(chalk.bold('入门指南：'));
      for (const line of startHintLines(command)) {
        console.log(`  ${line}`);
      }
    };
    console.log();
    // delivery=commands 但工具只支持技能：这些工具根本得不到制品，
    // 因此打印每个工具的配置更正，而不是给它们留下死的（或缺失的）指令——
    // 即使其他选定工具确实获得了命令或技能。
    const zeroArtifactTools = successfulTools.filter(
      (tool) =>
        !shouldGenerateSkillsForTool(tool.value, activeDelivery) &&
        !shouldGenerateCommandsForTool(tool.value, activeDelivery)
    );
    if (zeroArtifactTools.length > 0) {
      const names = zeroArtifactTools.map((tool) => tool.name).join(', ');
      console.log(
        chalk.yellow(
          `没有为 ${names} 生成技能或命令：交付模式设置为 'commands' 但` +
            `${zeroArtifactTools.length === 1 ? '它支持' : '它们支持'} 仅技能。` +
            `运行 'openspec config set delivery both' 来生成技能。`
        )
      );
    }
    if (successfulTools.length > 0 && !commandsGenerated && !skillsGenerated) {
      // 没有为任何工具生成内容：上面的更正就是全部内容，
      // 因此不要宣传一个不存在的调用方式。
    } else if (activeWorkflows.includes('propose')) {
      printStartHints('/opsx:propose');
    } else if (activeWorkflows.includes('new')) {
      printStartHints('/opsx:new');
    } else {
      console.log("完成。运行 'openspec config profile' 来配置你的 workflows。");
    }

    // 链接
    console.log();
    console.log(`了解更多：${chalk.cyan('https://github.com/Fission-AI/OpenSpec')}`);
    console.log(`反馈：   ${chalk.cyan('https://github.com/Fission-AI/OpenSpec/issues')}`);

    // 仅当至少一个 IDE/编辑器内置工具实际接收到生成的表面时，
    // 才显示重启说明。两个条件，与同一个工具耦合：
    //（1）其命令/技能由长时间运行的编辑器进程加载
    //（CLI 工具会立即获取文件，因此重启提示对它们来说是错误的 — 见 #1067）；
    //（2）该表面确实为活动交付生成了（一个什么都没生成的 IDE 工具
    // 不会有重启能获取的内容，即使一个配套配置的 CLI 工具确实生成了）。
    // 措辞遵循 IDE 工具本身生成的内容，而不是全局汇总：
    // 当 IDE 工具只获得了技能时，绝不能说"命令"。
    // 也不能说"斜杠命令"：Amazon Q 生成的文件是通过 @ 调用的提示库条目，
    // 因此承诺斜杠命令的重启提示对它来说是错误的。
    const restartCommandsGenerated = successfulTools.some(
      (tool) =>
        tool.requiresIdeRestart &&
        shouldGenerateCommandsForTool(tool.value, activeDelivery)
    );
    const restartSkillsGenerated = successfulTools.some(
      (tool) =>
        tool.requiresIdeRestart &&
        shouldGenerateSkillsForTool(tool.value, activeDelivery)
    );
    if (restartCommandsGenerated || restartSkillsGenerated) {
      console.log();
      console.log(
        chalk.white(
          restartCommandsGenerated
            ? '重启你的 IDE 以使新命令生效。'
            : '重启你的 IDE 以使新技能生效。'
        )
      );
    }

    console.log();
  }

  private startSpinner(text: string) {
    return ora({
      text,
      stream: process.stdout,
      color: 'gray',
      spinner: PROGRESS_SPINNER,
    }).start();
  }

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
        // 忽略错误
      }
    }

    return removed;
  }

  private async removeCommandFiles(projectPath: string, toolId: string): Promise<number> {
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
        // 忽略错误
      }
    }

    return removed;
  }
}
