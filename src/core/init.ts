/**
 * Init Command
 *
 * Sets up OpenSpec with Agent Skills and /opsx:* slash commands.
 * This is the unified setup command that replaces both the old init and experimental commands.
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
  formatIdeRestart,
} from './shared/index.js';
import { getGlobalConfig, type Delivery, type Profile } from './global-config.js';
import { getProfileWorkflows, CORE_WORKFLOWS, ALL_WORKFLOWS } from './profiles.js';
import { getAvailableTools } from './available-tools.js';
import {
  resolveSharedSkillWriters,
  sharedSkillRootOwner,
  writeSharedSkillTarget,
} from './shared-skill-target.js';
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
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_SCHEMA = 'spec-driven';

function formatLanguageContext(language: string): string {
  return [
    `Language: ${language}`,
    `All artifacts must be written in ${language}.`,
    'Keep OpenSpec structural headings and SHALL/MUST keywords in English.',
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
// Types
// -----------------------------------------------------------------------------

type InitCommandOptions = {
  tools?: string;
  language?: string;
  force?: boolean;
  interactive?: boolean;
  profile?: string;
  /** Commander's --no-animation flag: false disables the welcome animation. */
  animation?: boolean;
  /**
   * Explicit opt-in/out for GitHub Copilot cloud coding-agent files.
   * `--copilot-cloud` sets true, `--no-copilot-cloud` sets false; undefined
   * leaves the decision to config, migration, or an interactive prompt.
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
  writesSkills: boolean;
};

/**
 * Holds the global Codex prompt matches that must wait until replacement skills
 * are generated before cleanup can continue.
 */
type DeferredLegacyCleanup = {
  detection: LegacyDetectionResult;
};

// -----------------------------------------------------------------------------
// Init Command Class
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

    // Validation happens silently in the background
    const extendMode = await this.validate(projectPath, openspecPath);

    // Pointer guard (slice 3.2): a config-only openspec/ with a store:
    // declaration is externalized planning, not a root to extend — and a
    // subdirectory of such a repo must not silently grow a nested root.
    // Refuse before legacy cleanup, migration, or prompts touch anything.
    // In extend mode the walk finds projectPath itself; otherwise it
    // finds the nearest ancestor root (so pointer-repo subdirectories
    // refuse exactly where a normal command would resolve the pointer).
    const guardRoot = findRepoPlanningRootSync(projectPath);
    if (guardRoot) {
      const { hasPlanningShape, pointer } = classifyOpenSpecDir(guardRoot);
      if (!hasPlanningShape) {
        if (pointer.malformed) {
          throw new Error(
            `The store declaration in ${pointer.filePath} is invalid (` +
              storePointerProblem(pointer.malformed) +
              `). Fix or remove the store: line before running openspec init.`
          );
        }
        if (pointer.value !== undefined) {
          throw new Error(
            `This repo's planning is externalized to store '${pointer.value}' (${pointer.filePath}). ` +
              `Remove the store: line first to convert this repo to a local OpenSpec root.`
          );
        }
      }
    }

    await this.assertLanguageCanBeApplied(projectPath, openspecPath);

    // Check for legacy artifacts and handle cleanup
    const deferredLegacyCleanup = await this.handleLegacyCleanup(projectPath, extendMode);

    // Migrate OpenSpec-managed skills left in renamed tool directories
    // (e.g. .kimi -> .kimi-code) before detection so they stay recognized.
    migrateLegacyToolDirs(projectPath);

    // Detect available tools in the project (task 7.1)
    const detectedTools = getAvailableTools(projectPath);

    // Migration check: migrate existing projects to profile system (task 7.3)
    if (extendMode) {
      migrateIfNeeded(projectPath, detectedTools);
    }

    // Validate profile override early so invalid values fail before tool setup.
    // The resolved value is consumed later when generation reads effective config.
    // This runs ahead of the welcome screen so an invalid --profile does not make
    // the user press Enter before seeing the error.
    this.resolveProfileOverride();

    // Show animated welcome screen (interactive mode only)
    const canPrompt = this.canPromptInteractively();
    if (canPrompt) {
      const { showWelcomeScreen } = await import('../ui/welcome-screen.js');
      await showWelcomeScreen(this.getActiveWorkflows(), { animate: this.animation });
    }

    // Get tool states before processing
    const toolStates = getToolStates(projectPath);

    // Get tool selection (pass detected tools for pre-selection)
    const selectedToolIds = await this.getSelectedTools(toolStates, extendMode, detectedTools, projectPath);

    // Validate selected tools
    const validatedTools = this.validateTools(selectedToolIds, toolStates, projectPath);

    // Selecting a renamed tool is consent to leave its former directory:
    // init is about to write the current one, and leaving OpenSpec content
    // behind would give the user two installs of the same tool.
    for (const migration of migrateLegacyToolDirs(
      projectPath,
      validatedTools.map((tool) => tool.value)
    )) {
      if (hasMovableContent(migration)) {
        console.log(chalk.dim(`Migrated ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
      }
      const kept = keptInPlaceNotice(migration);
      if (kept) console.log(chalk.dim(kept));
    }

    // Decide whether to generate GitHub Copilot cloud files. This is opt-in
    // (see cloud-agent.ts): selecting the Copilot tool no longer silently
    // writes a GitHub Actions workflow into the user's .github/. The decision
    // is made before generation so the write can be gated, and persisted after
    // config.yaml exists so future non-interactive updates honor it.
    const copilotDecision = await this.resolveCopilotCloudDecision(projectPath, validatedTools);

    // Create directory structure and config
    await this.createDirectoryStructure(openspecPath, extendMode);

    // Generate skills and commands for each tool
    const results = await this.generateSkillsAndCommands(
      projectPath,
      validatedTools,
      copilotDecision.write
    );

    // Legacy cleanup was deferred to avoid interfering with skill/command generation;
    // now that outputs are written, finalize the cleanup (e.g. remove stale files).
    if (deferredLegacyCleanup) {
      await this.finalizeDeferredLegacyCleanup(projectPath, deferredLegacyCleanup);
    }

    // Create config.yaml if needed
    const configStatus = await this.createConfig(openspecPath, extendMode);

    // Persist an explicit Copilot cloud decision so `openspec update` (which
    // never prompts) honors it. Best-effort: a config-write failure must not
    // fail an otherwise-successful init.
    if (copilotDecision.persist !== undefined) {
      try {
        await persistCopilotCloudOptIn(projectPath, copilotDecision.persist);
      } catch {
        // Non-fatal: the files (if any) were still written correctly.
      }
    }

    // An explicit opt-out means "no cloud files here": clean up any that a
    // previous run (or an older OpenSpec) generated. Only OpenSpec-managed
    // files are removed — a user-customized file is preserved.
    let copilotRemoved = 0;
    if (copilotDecision.optedOut) {
      try {
        copilotRemoved = await removeCopilotCloudFiles(projectPath);
      } catch {
        // Non-fatal: removal targets files from a prior run; a failure here
        // just leaves them for the next `openspec update` to clean up.
      }
    }

    // Report the cloud outcome from what is actually on disk after the write,
    // not from the decision alone: writing over a user-owned file is a no-op,
    // and the alternate-agent path can remove a managed file — so list only
    // managed files that exist, and separately flag any left-untouched ones.
    const copilotSucceeded = [...results.createdTools, ...results.refreshedTools].some(
      (tool) => tool.value === 'github-copilot'
    );
    const wroteCloud = copilotDecision.write && copilotSucceeded;
    const copilotPresent = wroteCloud ? await listManagedCloudFiles(projectPath) : [];
    const copilotCollisions = wroteCloud ? await findUnmanagedCloudFiles(projectPath) : [];

    // Display success message
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
  // VALIDATION & SETUP
  // ═══════════════════════════════════════════════════════════

  private async validate(
    projectPath: string,
    openspecPath: string
  ): Promise<boolean> {
    const extendMode = await FileSystemUtils.directoryExists(openspecPath);

    // Check write permissions
    if (!(await FileSystemUtils.ensureWritePermissions(projectPath))) {
      throw new Error(`Insufficient permissions to write to ${projectPath}`);
    }
    return extendMode;
  }

  private canPromptInteractively(): boolean {
    if (this.interactiveOption === false) return false;
    if (this.toolsArg !== undefined) return false;
    return isInteractive({ interactive: this.interactiveOption });
  }

  /**
   * Decide whether to generate GitHub Copilot cloud files, and whether to
   * persist that decision. Precedence:
   *   1. `--copilot-cloud` / `--no-copilot-cloud` flag (explicit this run)
   *   2. persisted opt-in in config.yaml
   *   3. managed files already present (migration for pre-opt-in projects)
   *   4. interactive confirm (default No)
   *   5. non-interactive with no signal: skip, and don't persist a default
   *
   * @returns `write` — generate the files this run; `persist` — value to write
   *   back to config (undefined = leave config untouched); `optedOut` — the user
   *   explicitly declined, so any already-generated managed files should be
   *   removed; `skippedUndecided` — selected but no signal and couldn't ask, so
   *   the caller can hint that the opt-in exists.
   */
  private async resolveCopilotCloudDecision(
    projectPath: string,
    tools: ValidatedInitTool[]
  ): Promise<{ write: boolean; persist?: boolean; optedOut: boolean; skippedUndecided: boolean }> {
    const copilotSelected = tools.some((tool) => tool.value === 'github-copilot');
    if (!copilotSelected) {
      // A flag that can't apply is a likely mistake — say so rather than no-op.
      if (this.copilotCloudOption !== undefined) {
        console.log(
          chalk.yellow(
            '--copilot-cloud/--no-copilot-cloud was ignored because the github-copilot tool was not selected.'
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
          'Set up GitHub Copilot cloud coding-agent files? This is for the GitHub-hosted ' +
          'Copilot coding agent (github.com), not Copilot in your editor. It writes two files: ' +
          '.github/workflows/copilot-setup-steps.yml and .github/agents/openspec.agent.md.',
        default: false,
      });
      return { write: answer, persist: answer, optedOut: !answer, skippedUndecided: false };
    }

    // Non-interactive with no explicit signal: don't write, and leave the
    // decision unpersisted so a later interactive run can still prompt.
    return { write: false, optedOut: false, skippedUndecided: true };
  }

  private resolveProfileOverride(): Profile | undefined {
    if (this.profileOverride === undefined) {
      return undefined;
    }

    if (this.profileOverride === 'core' || this.profileOverride === 'custom') {
      return this.profileOverride;
    }

    throw new Error(`Invalid profile "${this.profileOverride}". Available profiles: core, custom`);
  }

  /**
   * Resolves the workflows the effective profile installs, so onboarding output
   * only mentions commands that will actually exist.
   */
  private getActiveWorkflows(): string[] {
    const globalCfg = getGlobalConfig();
    const activeProfile: Profile = this.resolveProfileOverride() ?? globalCfg.profile ?? 'core';
    return [...getProfileWorkflows(activeProfile, globalCfg.workflows)];
  }

  // ═══════════════════════════════════════════════════════════
  // LEGACY CLEANUP
  // ═══════════════════════════════════════════════════════════

  /**
   * Cleans repo-local legacy artifacts immediately and defers global Codex prompt
   * cleanup until replacement skills have been installed.
   */
  private async handleLegacyCleanup(projectPath: string, extendMode: boolean): Promise<DeferredLegacyCleanup | null> {
    // Detect legacy artifacts
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return null; // No legacy artifacts found
    }

    const immediateDetection = omitGlobalLegacyPromptFiles(detection);

    // Show what was detected
    const immediateSummary = formatDetectionSummary(immediateDetection);
    if (immediateSummary) {
      console.log();
      console.log(immediateSummary);
      console.log();
    }

    // Show which global prompts are deferred — they'll only be removed once
    // the corresponding replacement skills are installed during generation.
    const deferredSummary = formatDeferredGlobalPromptSummary(detection);
    if (deferredSummary) {
      console.log(deferredSummary);
      console.log();
    }

    const canPrompt = this.canPromptInteractively();

    if (this.force || !canPrompt) {
      // --force flag or non-interactive mode: proceed with cleanup automatically.
      // Legacy slash commands are 100% OpenSpec-managed, and config file cleanup
      // only removes markers (never deletes files), so auto-cleanup is safe.
      await this.performImmediateLegacyCleanup(projectPath, detection);
      return detection.globalSlashCommandFiles.length > 0 ? { detection } : null;
    }

    // Interactive mode: prompt for confirmation
    const { confirm } = await import('@inquirer/prompts');
    const shouldCleanup = await confirm({
      message: 'Upgrade and clean up legacy files?',
      default: true,
    });

    if (!shouldCleanup) {
      console.log(chalk.dim('Initialization cancelled.'));
      console.log(chalk.dim('Run with --force to skip this prompt, or manually remove legacy files.'));
      process.exit(0);
    }

    await this.performImmediateLegacyCleanup(projectPath, detection);
    return detection.globalSlashCommandFiles.length > 0 ? { detection } : null;
  }

  /**
   * Applies the safe subset of legacy cleanup that does not depend on newly
   * generated Codex skills.
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
   * Removes only the legacy global Codex prompts whose workflows now have
   * replacement skills in the project.
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
      console.log(chalk.yellow('Preserved deferred global prompts without replacement skills:'));
      for (const prompt of blockedMatches) {
        console.log(chalk.dim(`  - ${prompt.toolId}: ${prompt.path}`));
      }
      console.log();
    }
  }

  /**
   * Reads the currently installed workflow IDs for a single tool from the
   * generated skill layout on disk.
   */
  private async getInstalledWorkflowsForTool(projectPath: string, toolId: string): Promise<Set<string>> {
    const tool = AI_TOOLS.find((candidate) => candidate.value === toolId);
    if (!tool) {
      return new Set<string>();
    }

    return new Set(scanInstalledWorkflowsShared(projectPath, [tool]));
  }

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

  // ═══════════════════════════════════════════════════════════
  // TOOL SELECTION
  // ═══════════════════════════════════════════════════════════

  private async getSelectedTools(
    toolStates: Map<string, ToolSkillStatus>,
    extendMode: boolean,
    detectedTools: AIToolOption[],
    projectPath: string
  ): Promise<string[]> {
    // Check for --tools flag first
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

    // Non-interactive mode: use detected tools as fallback (task 7.8)
    if (!canPrompt) {
      if (detectedToolIds.size > 0) {
        return [...detectedToolIds];
      }
      throw new Error(
        `No tools detected and no --tools flag provided. Valid tools:\n  ${validTools.join('\n  ')}\n\nUse --tools all, --tools none, or --tools claude,cursor,...`
      );
    }

    if (validTools.length === 0) {
      throw new Error(
        `No tools available for skill generation.`
      );
    }

    // Interactive mode: show searchable multi-select
    const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

    // Build choices: pre-select configured tools; keep detected tools visible but unselected.
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
        // Configured tools first, then detected (not configured), then everything else.
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
      console.log(`OpenSpec configured: ${configuredNames.join(', ')} (pre-selected)`);
    }

    const detectedOnlyNames = detectedTools
      .filter((tool) => !configuredToolIds.has(tool.value))
      .map((tool) => tool.name);

    if (detectedOnlyNames.length > 0) {
      const detectionLabel = shouldPreselectDetected
        ? 'pre-selected for first-time setup'
        : 'not pre-selected';
      console.log(`Detected tool directories: ${detectedOnlyNames.join(', ')} (${detectionLabel})`);
    }

    const selectedTools = await searchableMultiSelect({
      message: `Select tools to set up (${validTools.length} available)`,
      pageSize: 15,
      choices: sortedChoices,
      validate: (selected: string[]) => selected.length > 0 || 'Select at least one tool',
    });

    if (selectedTools.length === 0) {
      throw new Error('At least one tool must be selected');
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
        'The --tools option requires a value. Use "all", "none", or a comma-separated list of tool IDs.'
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
        'The --tools option requires at least one tool ID when not using "all" or "none".'
      );
    }

    // Retired ids resolve to their current tool, so a rebrand does not break
    // an existing `--tools windsurf` in someone's setup script.
    const normalizedTokens = tokens.map((token) => resolveToolIdAlias(token.toLowerCase()));

    if (normalizedTokens.some((token) => token === 'all' || token === 'none')) {
      throw new Error('Cannot combine reserved values "all" or "none" with specific tool IDs.');
    }

    const invalidTokens = tokens.filter(
      (_token, index) => !availableSet.has(normalizedTokens[index])
    );

    if (invalidTokens.length > 0) {
      throw new Error(
        `Invalid tool(s): ${invalidTokens.join(', ')}. Available values: ${availableList}`
      );
    }

    // Deduplicate while preserving order
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
    const selectedTools: AIToolOption[] = [];
    for (const toolId of toolIds) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool) {
        const validToolIds = getToolsWithSkillsDir();
        throw new Error(
          `Unknown tool '${toolId}'. Valid tools:\n  ${validToolIds.join('\n  ')}`
        );
      }

      if (!toolSupportsSkills(tool)) {
        const validToolsWithSkills = getToolsWithSkillsDir();
        throw new Error(
          `Tool '${toolId}' does not support skill generation.\nTools with skill generation support:\n  ${validToolsWithSkills.join('\n  ')}`
        );
      }

      selectedTools.push(tool);
    }

    // A selected tool may share its physical skills root with an already
    // configured owner. Include that owner in the refresh without dropping the
    // selected tool: it may still have an independent command surface.
    const generationTools = [...selectedTools];
    const delivery: Delivery = getGlobalConfig().delivery ?? 'both';
    for (const selected of selectedTools) {
      if (!selected.skillsDir) continue;
      const selectedOwner = selected.value === 'codex' ||
        !shouldGenerateSkillsForTool(selected.value, delivery)
        ? undefined
        : sharedSkillRootOwner(projectPath, selected.value);
      for (const candidate of AI_TOOLS) {
        if (
          candidate.skillsDir === selected.skillsDir &&
          toolStates.get(candidate.value)?.configured &&
          candidate.value === selectedOwner &&
          !generationTools.includes(candidate)
        ) {
          generationTools.push(candidate);
        }
      }
    }

    const skillWriters = resolveSharedSkillWriters(projectPath, generationTools);
    const sharedRoots = new Map<string, AIToolOption[]>();
    for (const tool of generationTools) {
      if (!tool.skillsDir) continue;
      const group = sharedRoots.get(tool.skillsDir) ?? [];
      group.push(tool);
      sharedRoots.set(tool.skillsDir, group);
    }
    for (const [root, group] of sharedRoots) {
      if (group.length < 2) continue;
      const owner = group.find((tool) => skillWriters.has(tool.value));
      console.log(chalk.dim(`${group.map((tool) => tool.name).join(', ')} share ${root}/skills; writing one tree for ${owner?.value}.`));
    }

    const validatedTools: ValidatedInitTool[] = [];
    for (const tool of generationTools) {
      if (!toolSupportsSkills(tool)) continue;
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
        writesSkills: !tool.skillsDir || skillWriters.has(tool.value),
      });
    }

    return validatedTools;
  }

  // ═══════════════════════════════════════════════════════════
  // DIRECTORY STRUCTURE
  // ═══════════════════════════════════════════════════════════

  private async createDirectoryStructure(openspecPath: string, extendMode: boolean): Promise<void> {
    if (extendMode) {
      // In extend mode, just ensure directories exist without spinner
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

    const spinner = this.startSpinner('Creating OpenSpec structure...');

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
      text: PALETTE.white('OpenSpec structure created'),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SKILL & COMMAND GENERATION
  // ═══════════════════════════════════════════════════════════

  /**
   * Generates skill files and slash commands for each selected tool,
   * honoring the configured delivery mode (skills, commands, or both).
   *
   * @param projectPath - Absolute path to the project root
   * @param tools - Selected tools with their skill directory metadata
   * @returns Created, refreshed, and failed tools plus removed artifact counts
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

    // Read global config for profile and delivery settings (use --profile override if set)
    const globalConfig = getGlobalConfig();
    const profile: Profile = this.resolveProfileOverride() ?? globalConfig.profile ?? 'core';
    const delivery: Delivery = globalConfig.delivery ?? 'both';
    const workflows = getProfileWorkflows(profile, globalConfig.workflows);

    // Get skill and command templates filtered by profile workflows
    const deliveryIncludesCommands = delivery !== 'skills';
    const skillTemplates = getSkillTemplates(workflows);
    const commandContents = getCommandContents(workflows);

    // Process each tool
    for (const tool of tools) {
      const spinner = ora(`Setting up ${tool.name}...`).start();

      try {
        const shouldGenerateSkills = shouldGenerateSkillsForTool(tool.value, delivery);
        const shouldGenerateCommands = shouldGenerateCommandsForTool(tool.value, delivery);

        // Generate skill files if the selected delivery and tool capability allow skills
        if (shouldGenerateSkills && tool.writesSkills) {
          // Create skill directories and SKILL.md files
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(tool.skillsPath, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            // Generate SKILL.md content with YAML frontmatter including generatedBy
            const transformer = getTransformerForTool(
              tool.value,
              delivery,
              resolveCommandSurfaceCapability(tool.value),
              resolveCommandInvocation(tool.value)
            );
            const skillContent = generateSkillContent(template, OPENSPEC_VERSION, transformer);

            // Write the skill file
            FileSystemUtils.assertPathWithin(tool.skillsRoot, skillFile);
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
          writeSharedSkillTarget(projectPath, tool.value);
        }
        if (
          shouldRemoveSkillsForTool(tool.value, delivery) &&
          tool.writesSkills &&
          !tool.isGlobalSkillTarget
        ) {
          removedSkillCount += await this.removeSkillDirs(tool.skillsRoot, tool.skillsPath);
          // Retain an explicit selection even when this delivery mode produces
          // no skills, so a divergent legacy sibling cannot reclaim ownership.
          writeSharedSkillTarget(projectPath, tool.value);
        }

        // Generate commands if delivery includes commands
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

        spinner.succeed(`Setup complete for ${tool.name}`);

        if (tool.wasConfigured) {
          refreshedTools.push(tool);
        } else {
          createdTools.push(tool);
        }
      } catch (error) {
        spinner.fail(`Failed for ${tool.name}`);
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
          console.log(chalk.dim(`Migrated ${describeLegacyMigration(migration)}: ${migration.from} → ${migration.to}`));
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
  // CONFIG FILE
  // ═══════════════════════════════════════════════════════════

  private normalizeLanguage(language: string | undefined): string | undefined {
    if (language === undefined) return undefined;

    const normalized = language.trim();
    if (!normalized) {
      throw new Error('The --language option requires a non-empty value.');
    }
    if (/\p{Cc}|\p{Bidi_Control}|[\u200B\u2028\u2029\uFEFF]/u.test(normalized)) {
      throw new Error(
        'The --language option must be a single line without control or invisible formatting characters.'
      );
    }
    const serializedContext = `${formatLanguageContext(normalized)}\n`;
    if (Buffer.byteLength(serializedContext, 'utf8') > MAX_CONTEXT_SIZE) {
      throw new Error(
        `The --language option is too long for OpenSpec's ${MAX_CONTEXT_SIZE / 1024}KB project context limit.`
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
        throw new Error(`Cannot create openspec/config.yaml for --language${reason}`);
      }
      if (!(await FileSystemUtils.canWriteFile(configPath))) {
        throw new Error(
          'Cannot create openspec/config.yaml for --language: the destination is not writable.'
        );
      }
      return;
    }

    const existingContext = readProjectConfig(projectPath)?.context;
    if (existingContext?.includes(languageContext)) return;

    throw new Error(
      '--language does not overwrite an existing OpenSpec config. ' +
      'Add the language instruction to its context field instead.'
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
        throw new Error(`Failed to create openspec/config.yaml for --language${reason}`);
      }
      return 'skipped';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI & OUTPUT
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
        results.failedTools.length > 0 ? 'OpenSpec Setup Incomplete' : 'OpenSpec Setup Complete'
      )
    );
    console.log();

    // Show created vs refreshed tools
    if (results.createdTools.length > 0) {
      console.log(`Created: ${results.createdTools.map((t) => t.name).join(', ')}`);
    }
    if (results.refreshedTools.length > 0) {
      console.log(`Refreshed: ${results.refreshedTools.map((t) => t.name).join(', ')}`);
    }

    // Show counts (respecting profile filter)
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
          console.log(`${skillCount} skills and ${commandCount} commands in ${toolDirs}/`);
        } else if (skillCount > 0) {
          console.log(`${skillCount} skills in ${toolDirs}/`);
        } else if (commandCount > 0) {
          console.log(`${commandCount} commands in ${toolDirs}/`);
        }
      } else {
        const skillTools = successfulTools.filter((tool) =>
          shouldGenerateSkillsForTool(tool.value, delivery)
        );
        const skillCount = skillTools.length * getSkillTemplates(workflows).length;
        if (skillCount > 0) {
          const skillDirs = [...new Set(skillTools.map((tool) => tool.skillsPath))];
          console.log(`${skillCount} skills in ${skillDirs.join(', ')}`);
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
          console.log(`${commandCount} commands in ${commandDirs.join(', ')}`);
        }
      }
    }

    // Show failures
    if (results.failedTools.length > 0) {
      console.log(chalk.red(`Failed: ${results.failedTools.map((f) => `${f.name} (${f.error.message})`).join(', ')}`));
    }

    // Show skipped commands
    if (results.commandsSkipped.length > 0) {
      console.log(chalk.dim(`Commands skipped for: ${results.commandsSkipped.join(', ')} (no adapter)`));
    }
    if (results.skillsInvocableCommandSkips.length > 0) {
      console.log(chalk.dim(`Commands skipped for: ${results.skillsInvocableCommandSkips.join(', ')} (uses skills)`));
    }
    if (results.removedCommandCount > 0) {
      console.log(chalk.dim(`Removed: ${results.removedCommandCount} command files (delivery: skills)`));
    }
    if (results.removedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${results.removedSkillCount} skill directories (delivery: commands)`));
    }

    // GitHub Copilot cloud files are opt-in — report what is actually on disk:
    // list the managed files that now exist (never files we didn't write), flag
    // any user-owned file we left untouched, note an opt-out cleanup, or (when
    // skipped for want of a signal) say how to turn them on.
    const copilotSucceeded = successfulTools.some((tool) => tool.value === 'github-copilot');
    if (copilotSucceeded && copilot.write) {
      if (copilot.present.length > 0) {
        console.log(`GitHub Copilot cloud files: ${copilot.present.join(', ')}`);
      }
      if (copilot.collisions.length > 0) {
        console.log(
          chalk.dim(
            `Left your existing ${copilot.collisions.join(' and ')} untouched — add the OpenSpec ` +
              `install step by hand so the Copilot cloud agent can run openspec.`
          )
        );
      }
    } else if (copilotSucceeded && copilot.removed > 0) {
      console.log(
        chalk.dim(`Removed: ${copilot.removed} Copilot cloud agent file(s) (opted out of cloud files)`)
      );
    } else if (copilotSucceeded && copilot.skippedUndecided) {
      console.log(
        chalk.dim("Skipped GitHub Copilot cloud files (opt-in). Enable with 'openspec init --copilot-cloud'.")
      );
    }

    // Show manual setup notes for tools that need extra configuration
    for (const tool of successfulTools) {
      const setupNote = AI_TOOLS.find((t) => t.value === tool.value)?.setupNote;
      if (setupNote) {
        console.log(chalk.yellow(`Setup required for ${tool.name}: ${setupNote}`));
      }
    }

    // Config status
    if (configStatus === 'created') {
      console.log(`Config: openspec/config.yaml (schema: ${DEFAULT_SCHEMA})`);
    } else if (configStatus === 'exists') {
      // Show actual filename (config.yaml or config.yml)
      const configYaml = path.join(projectPath, OPENSPEC_DIR_NAME, 'config.yaml');
      const configYml = path.join(projectPath, OPENSPEC_DIR_NAME, 'config.yml');
      const configName = fs.existsSync(configYaml) ? 'config.yaml' : fs.existsSync(configYml) ? 'config.yml' : 'config.yaml';
      console.log(`Config: openspec/${configName} (exists)`);
    } else {
      console.log(chalk.dim(`Config: skipped (non-interactive mode)`));
    }

    // Getting started (task 7.6: show propose if in profile)
    const activeWorkflows = this.getActiveWorkflows();
    // When no tool got /opsx:* commands, point at the skill instead of a
    // command that does not exist.
    const activeDelivery: Delivery = getGlobalConfig().delivery ?? 'both';
    const commandsGenerated = successfulTools.some((tool) => shouldGenerateCommandsForTool(tool.value, activeDelivery));
    const skillsGenerated = successfulTools.some((tool) => shouldGenerateSkillsForTool(tool.value, activeDelivery));
    // Each hint line must be a usable instruction for the tool it serves.
    // Tools that generated commands are told the command name their files
    // answer to (/opsx:* when namespaced under opsx/, /opsx-* when the
    // filename is the command); tools that only got skills are told their
    // documented skill invocation (Kimi Code: /skill:openspec-*; Codex CLI:
    // $openspec-*; others: /openspec-*). Tools that got no artifacts are
    // covered by the configuration correction instead. When the selection
    // disagrees, print one line per distinct instruction, labeled with the
    // tools it applies to.
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
          hint = `Start your first change: ${transformer ? transformer(command) : command} "your idea"`;
        } else if (shouldGenerateSkillsForTool(tool.value, activeDelivery)) {
          const skillReference = getSkillReferenceTransformer(tool.value)(command);
          // Tools with no slash surface (e.g. Rovo Dev) reference skills as
          // prose ("the openspec-propose skill"); phrase the hint so it reads
          // as an instruction rather than a dead command with an argument.
          hint = usesNaturalLanguageSkillReferences(tool.value)
            ? `Start your first change: ask ${tool.name} to use ${skillReference} with "your idea"`
            : `Start your first change: ${skillReference} "your idea"`;
        } else {
          continue;
        }
        hintToTools.set(hint, [...(hintToTools.get(hint) ?? []), tool.name]);
      }
      if (hintToTools.size === 0) {
        // No successful tools: keep the generic command hint
        return [`Start your first change: ${command} "your idea"`];
      }
      if (hintToTools.size === 1) {
        return [[...hintToTools.keys()][0]];
      }
      return [...hintToTools.entries()].map(([hint, toolNames]) => `${hint} (${toolNames.join(', ')})`);
    };
    const printStartHints = (command: string): void => {
      console.log(chalk.bold('Getting started:'));
      for (const line of startHintLines(command)) {
        console.log(`  ${line}`);
      }
    };
    console.log();
    // delivery=commands with tools that only support skills: those tools get
    // no artifacts at all, so print a per-tool configuration correction
    // rather than leave them with a dead (or missing) instruction — even
    // when other selected tools did get commands or skills.
    const zeroArtifactTools = successfulTools.filter(
      (tool) =>
        !shouldGenerateSkillsForTool(tool.value, activeDelivery) &&
        !shouldGenerateCommandsForTool(tool.value, activeDelivery)
    );
    if (zeroArtifactTools.length > 0) {
      const names = zeroArtifactTools.map((tool) => tool.name).join(', ');
      console.log(
        chalk.yellow(
          `No skills or commands were generated for ${names}: delivery is set to 'commands' but ` +
            `${zeroArtifactTools.length === 1 ? 'it supports' : 'they support'} only skills. ` +
            `Run 'openspec config set delivery both' to generate skills.`
        )
      );
    }
    if (successfulTools.length > 0 && !commandsGenerated && !skillsGenerated) {
      // Nothing was generated for any tool: the correction above is the
      // whole story, so don't advertise an invocation that doesn't exist.
    } else if (activeWorkflows.includes('propose')) {
      printStartHints('/opsx:propose');
    } else if (activeWorkflows.includes('new')) {
      printStartHints('/opsx:new');
    } else {
      console.log("Done. Run 'openspec config profile' to configure your workflows.");
    }

    // Links
    console.log();
    console.log(`Learn more: ${chalk.cyan('https://github.com/Fission-AI/OpenSpec')}`);
    console.log(`Feedback:   ${chalk.cyan('https://github.com/Fission-AI/OpenSpec/issues')}`);

    // Restart instruction for successfully configured IDE/editor-resident tools
    // with a supported surface under the active delivery. The rule and wording live in
    // formatIdeRestart so `update` says the same thing for the same event.
    const restartHint = formatIdeRestart(
      successfulTools.map((tool) => tool.value),
      activeDelivery
    );
    if (restartHint) {
      console.log();
      console.log(chalk.white(restartHint));
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
        // Ignore errors
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
        // Ignore errors
      }
    }

    return removed;
  }
}
