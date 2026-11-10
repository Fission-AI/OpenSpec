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
import { resolveOpenSpecRoot } from './root-selection.js';
import { ANCHORED_OPENSPEC_DIRS, ensureDirectoryAnchor } from './openspec-root.js';
import { getSkillReferenceTransformer, getTransformerForTool, transformToSkillReferences, usesNaturalLanguageSkillReferences } from '../utils/command-references.js';
import {
  AI_TOOLS,
  SKILL_LINKED_TOOL_IDS,
  getUniversalTool,
  universalToolFallbackHint,
  OPENSPEC_DIR_NAME,
  AIToolOption,
  resolveToolIdAlias,
} from './config.js';
import { PALETTE } from './styles/palette.js';
import { isInteractive } from '../utils/interactive.js';
import { serializeConfig } from './config-prompts.js';
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
  getConfiguredTools,
  getToolStates,
  getSkillTemplates,
  generateSkillContent,
  hasGlobalSkillTarget,
  resolveToolSkillsDir,
  toolSupportsSkills,
  type ToolSkillStatus,
  formatIdeRestart,
} from './shared/index.js';
import { reconcileCommandFiles, formatKeptCommandFiles } from './shared/command-reconcile.js';
import {
  cleanUpRetiredTools,
  findRetiredTool,
  formatRetiredToolCleanup,
  formatRetiredToolError,
} from './retired-tools.js';
import { pruneEmptyParents } from './released-output-sweep.js';
import { getGlobalConfig, type Delivery, type Profile } from './global-config.js';
import { getProfileWorkflows, CORE_WORKFLOWS } from './profiles.js';
import { getAvailableTools } from './available-tools.js';
import { formatOptionalWorkflowsNote } from './onboarding-commands.js';
import { usesSharedSkills } from './shared/skill-paths.js';
import { formatKeptSkills, installSharedSkills } from './shared/shared-skill-install.js';
import { realFileOps } from './update-plan.js';
import { DISK_VIEW } from './file-view.js';
import { classifyOwnSkill } from './shared/own-skill-texts.js';
import { migrateIfNeeded, migrateLegacyToolDirs, describeLegacyMigration, keptInPlaceNotice, hasMovableContent, scanInstalledWorkflows as scanInstalledWorkflowsShared } from './migration.js';
import {
  resolveCommandSurfaceCapability,
  resolveCommandInvocation,
  shouldReconcileCommandFilesForTool,
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
    const projectPath = FileSystemUtils.canonicalizeExistingPath(targetPath);
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
    let integrationsOnly = false;
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
          if (path.resolve(guardRoot) !== projectPath) {
            throw new Error(
              `This repo's planning is externalized to store '${pointer.value}' (${pointer.filePath}). ` +
                'Run openspec init from the pointer repo root to install integrations.'
            );
          }

          // A valid pointer repo already has its planning root in the declared
          // store. Init should still be able to install agent integrations in
          // the code repo, without creating a second local planning root.
          await resolveOpenSpecRoot({ startPath: projectPath });
          integrationsOnly = true;
        }
      }
    }

    if (!integrationsOnly) {
      await this.assertLanguageCanBeApplied(projectPath, openspecPath);
    } else if (this.language) {
      throw new Error(
        '--language cannot update an external store through a pointer repo. ' +
        'Run init in the store root, or edit the store config directly.'
      );
    }

    // Pointer repos keep their local planning files untouched. Normal init may
    // still remove OpenSpec-managed artifacts from older layouts.
    const deferredLegacyCleanup = integrationsOnly
      ? null
      : await this.handleLegacyCleanup(projectPath, extendMode);

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

    // Pointer repos only receive integrations. Their planning structure and
    // config stay in the declared store.
    if (!integrationsOnly) {
      await this.createDirectoryStructure(openspecPath, extendMode);
    }

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

    // Create config.yaml if needed. A pointer repo already has the config that
    // declares its store, so preserve it byte-for-byte.
    const configStatus = integrationsOnly
      ? 'exists' as const
      : await this.createConfig(openspecPath, extendMode);

    // Persist an explicit Copilot cloud decision so `openspec update` (which
    // never prompts) honors it. Best-effort: a config-write failure must not
    // fail an otherwise-successful init.
    if (!integrationsOnly && copilotDecision.persist !== undefined) {
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
      const fallbackHint = universalToolFallbackHint(validTools);
      throw new Error(
        `No tools detected and no --tools flag provided. Valid tools:\n  ${validTools.join('\n  ')}\n\nUse --tools all, --tools none, or --tools claude,cursor,...${fallbackHint ? `\n${fallbackHint}` : ''}`
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
          searchAliases: tool?.searchAliases,
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

    // A search that matches nothing is where someone whose assistant is not on
    // the list gives up (#653), so name the vendor-neutral entry right there.
    const universalTool = getUniversalTool();
    const universalHint =
      universalTool && validTools.includes(universalTool.value)
        ? `Tool not listed? Clear the search and pick "${universalTool.name}".`
        : undefined;

    const selectedTools = await searchableMultiSelect({
      message: `Select tools to set up (${validTools.length} available)`,
      pageSize: 15,
      choices: sortedChoices,
      emptyHint: universalHint,
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

    // A tool OpenSpec no longer supports gets its own reason and successor,
    // not the generic list.
    const retired = normalizedTokens.map(findRetiredTool).find((tool) => tool !== undefined);
    if (retired) {
      throw new Error(formatRetiredToolError(retired));
    }

    const invalidTokens = tokens.filter(
      (_token, index) => !availableSet.has(normalizedTokens[index])
    );

    if (invalidTokens.length > 0) {
      const fallbackHint = universalToolFallbackHint([...availableSet]);
      throw new Error(
        `Invalid tool(s): ${invalidTokens.join(', ')}. Available values: ${availableList}${fallbackHint ? `\n${fallbackHint}` : ''}`
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

    const generationTools = [...selectedTools];

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
        // Shared-folder skills are written once for every tool, not per tool.
        writesSkills: !usesSharedSkills(tool),
      });
    }

    return validatedTools;
  }

  // ═══════════════════════════════════════════════════════════
  // DIRECTORY STRUCTURE
  // ═══════════════════════════════════════════════════════════

  private async createDirectoryStructure(openspecPath: string, extendMode: boolean): Promise<void> {
    const directories = [
      openspecPath,
      path.join(openspecPath, 'specs'),
      path.join(openspecPath, 'changes'),
      path.join(openspecPath, 'changes', 'archive'),
    ];

    if (extendMode) {
      // In extend mode, just ensure directories exist without spinner
      for (const dir of directories) {
        FileSystemUtils.assertProjectArtifactPath(path.dirname(openspecPath), dir);
        await FileSystemUtils.createDirectory(dir);
      }
      await this.writeGitkeepFiles(openspecPath);
      return;
    }

    const spinner = this.startSpinner('Creating OpenSpec structure...');

    for (const dir of directories) {
      FileSystemUtils.assertProjectArtifactPath(path.dirname(openspecPath), dir);
      await FileSystemUtils.createDirectory(dir);
    }

    await this.writeGitkeepFiles(openspecPath);

    spinner.stopAndPersist({
      symbol: PALETTE.white('▌'),
      text: PALETTE.white('OpenSpec structure created'),
    });
  }

  private async writeGitkeepFiles(openspecPath: string): Promise<void> {
    for (const relativeDir of ANCHORED_OPENSPEC_DIRS) {
      await ensureDirectoryAnchor(path.dirname(openspecPath), relativeDir);
    }
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
    removedCommandCount: number;
    leftCommandFiles: { kept: string[]; unchecked: string[] };
    removedSkillCount: number;
  }> {
    const createdTools: typeof tools = [];
    const refreshedTools: typeof tools = [];
    const failedTools: Array<{ name: string; error: Error }> = [];
    let removedCommandCount = 0;
    const leftCommandFiles = { kept: [] as string[], unchecked: [] as string[] };
    let removedSkillCount = 0;

    // Read global config for profile and delivery settings (use --profile override if set)
    const globalConfig = getGlobalConfig();
    const profile: Profile = this.resolveProfileOverride() ?? globalConfig.profile ?? 'core';
    const delivery: Delivery = globalConfig.delivery ?? 'both';
    const workflows = getProfileWorkflows(profile, globalConfig.workflows);

    // Get skill templates filtered by profile workflows
    const skillTemplates = getSkillTemplates(workflows);

    // Every tool's project skills are one shared copy in `.agents/skills/`,
    // written once for the selected tools and every tool already set up here
    // (so re-running init for one tool keeps the others listed).
    const sharedToolIds = [
      ...new Set([...tools.map((tool) => tool.value), ...getConfiguredTools(projectPath)]),
    ];
    let ownFolderErrors = new Map<string, Error>();
    try {
      const shared = await installSharedSkills({
        projectPath,
        tools: AI_TOOLS.filter((tool) => sharedToolIds.includes(tool.value)),
        version: OPENSPEC_VERSION,
        workflowsFor: () => workflows,
        ops: realFileOps,
        view: DISK_VIEW,
        writesToDisk: true,
      });
      if (shared.writtenSkillCount === 0) removedSkillCount += shared.removedSkillCount;
      ownFolderErrors = shared.toolFailures;
      for (const line of formatKeptSkills(shared.kept)) console.log(chalk.yellow(line));
    } catch (error) {
      // Every tool sharing the folder fails with this.
      const message = error instanceof Error ? error.message : String(error);
      const failure = new Error(`the shared skills in .agents/skills could not be written: ${message}`);
      ownFolderErrors = new Map(
        AI_TOOLS.filter((tool) => sharedToolIds.includes(tool.value) && usesSharedSkills(tool))
          .map((tool) => [tool.value, failure])
      );
    }

    // Tools OpenSpec no longer supports: remove what earlier releases
    // generated for them, keep what the user edited, and say so.
    for (const retired of await cleanUpRetiredTools(projectPath, {
      view: DISK_VIEW,
      remove: (fullPath) => fs.promises.unlink(fullPath),
      prune: true,
    })) {
      const [headline, ...detail] = formatRetiredToolCleanup(retired);
      console.log(chalk.yellow(headline));
      for (const line of detail) console.log(chalk.dim(line));
    }

    const keptOwnSkills: string[] = [];
    const savedOwnSkills: string[] = [];
    // Process each tool
    for (const tool of tools) {
      const spinner = ora(`Setting up ${tool.name}...`).start();

      try {
        const ownFolderError = ownFolderErrors.get(tool.value);
        if (ownFolderError) throw ownFolderError;
        // Generate skill files if the tool writes its own skills
        if (tool.writesSkills) {
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

            if (fs.existsSync(skillDir) || DISK_VIEW.linkTarget?.(skillDir) !== undefined) {
              const spot = classifyOwnSkill(skillDir, tool.value, dirName, DISK_VIEW, OPENSPEC_VERSION);
              // Never written through: the user's link, or their file where
              // the folder goes.
              if (spot === 'link' || (spot === 'user' && !DISK_VIEW.isDirectory(skillDir))) {
                keptOwnSkills.push(skillDir);
                continue;
              }
              // Refreshed in place, but an edited SKILL.md is saved beside it first.
              if (spot === 'user') {
                let backup = `${skillFile}.bak`;
                for (let n = 1; fs.existsSync(backup); n += 1) backup = `${skillFile}.bak${n}`;
                FileSystemUtils.assertPathWithin(tool.skillsRoot, backup);
                await FileSystemUtils.writeFile(backup, fs.readFileSync(skillFile, 'utf-8'));
                savedOwnSkills.push(backup);
              }
            }

            // Write the skill file
            FileSystemUtils.assertPathWithin(tool.skillsRoot, skillFile);
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
        }
        if (shouldReconcileCommandFilesForTool(tool.value)) {
          const reconciled = await reconcileCommandFiles(projectPath, tool.value, workflows);
          removedCommandCount += reconciled.removed.length;
          leftCommandFiles.kept.push(...reconciled.kept);
          leftCommandFiles.unchecked.push(...reconciled.unchecked);
          // The folders those files sat in, once nothing else is left in them.
          await pruneEmptyParents(projectPath, reconciled.removed.map((rel) => FileSystemUtils.toPosixPath(rel)));
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
    if (keptOwnSkills.length > 0) {
      console.log(
        chalk.yellow(
          `Kept ${keptOwnSkills.length} skill folder${keptOwnSkills.length === 1 ? '' : 's'} that ` +
            `${keptOwnSkills.length === 1 ? 'is' : 'are'} yours (a link, or a file): ${keptOwnSkills.join(', ')}. ` +
            'Nothing was written there.'
        )
      );
    }
    if (savedOwnSkills.length > 0) {
      console.log(
        chalk.yellow(
          `Refreshed ${savedOwnSkills.length} skill${savedOwnSkills.length === 1 ? '' : 's'} you had edited; ` +
            `your ${savedOwnSkills.length === 1 ? 'copy is' : 'copies are'} saved as ${savedOwnSkills.join(', ')}.`
        )
      );
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
      removedCommandCount,
      leftCommandFiles,
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
      removedCommandCount: number;
      leftCommandFiles: { kept: string[]; unchecked: string[] };
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
      const workflows = getProfileWorkflows(profile, globalConfig.workflows);

      // Skills sit in one shared folder, linked into the tools that need it.
      // MiniMax Code reads its own folder in the home directory instead. Each
      // folder holds one copy of every skill, so the count is per folder.
      const toolOption = (id: string) => AI_TOOLS.find((candidate) => candidate.value === id);
      const skillDirs = [...new Set(successfulTools.map((tool) => {
        const option = toolOption(tool.value);
        if (tool.isGlobalSkillTarget && option?.globalSkillsDir) {
          return `~/${option.globalSkillsDir}/skills/`;
        }
        return option && usesSharedSkills(option) ? '.agents/skills/' : `${tool.skillsDir}/skills/`;
      }))];
      const linkedFrom = [...new Set(successfulTools.flatMap((tool) => {
        const option = toolOption(tool.value);
        return option && SKILL_LINKED_TOOL_IDS.has(option.value) ? [`${option.skillsDir}/skills/`] : [];
      }))];
      const links = linkedFrom.length > 0 ? ` (linked from ${linkedFrom.join(', ')})` : '';
      console.log(`${getSkillTemplates(workflows).length} skills in ${skillDirs.join(', ')}${links}`);
    }

    // Show failures
    if (results.failedTools.length > 0) {
      console.log(chalk.red(`Failed: ${results.failedTools.map((f) => `${f.name} (${f.error.message})`).join(', ')}`));
    }

    // Show skipped commands
    if (results.removedCommandCount > 0) {
      console.log(chalk.dim(`Removed: ${results.removedCommandCount} command ${results.removedCommandCount === 1 ? 'file' : 'files'} (OpenSpec 2.0 installs skills only)`));
    }
    for (const [headline, ...detail] of formatKeptCommandFiles(results.leftCommandFiles)) {
      console.log(chalk.yellow(headline));
      for (const line of detail) {
        console.log(chalk.dim(line));
      }
    }
    if (results.removedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${results.removedSkillCount} skill directories`));
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
    // Each hint line must be a usable instruction for the tool it serves:
    // its documented skill invocation (Kimi Code: /skill:openspec-*; Codex
    // CLI: $openspec-*; others: /openspec-*). When the selection disagrees,
    // print one line per distinct instruction, labeled with the tools it
    // applies to.
    const startHintLines = (command: string): string[] => {
      const hintToTools = new Map<string, string[]>();
      for (const tool of successfulTools) {
        let hint: string;
        const skillReference = getSkillReferenceTransformer(tool.value)(command);
        // Tools with no slash surface (e.g. Rovo Dev) reference skills as
        // prose ("the openspec-propose skill"); phrase the hint so it reads
        // as an instruction rather than a dead command with an argument.
        if (usesNaturalLanguageSkillReferences(tool.value)) {
          hint = `Start your first change: ask ${tool.name} to use ${skillReference} with "your idea"`;
        } else if (tool.value === 'codex') {
          hint = `Start your first change: ${skillReference} "your idea" (Codex CLI or IDE); in the Codex desktop app, select ${skillReference.slice(1)} from Skills in the sidebar`;
        } else {
          hint = `Start your first change: ${skillReference} "your idea"`;
        }
        hintToTools.set(hint, [...(hintToTools.get(hint) ?? []), tool.name]);
      }
      if (hintToTools.size === 0) {
        // No successful tools: name the skill in its default spelling.
        return [`Start your first change: ${transformToSkillReferences(command)} "your idea"`];
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
    let advertisedAnInvocation = true;
    if (activeWorkflows.includes('propose')) {
      printStartHints('/opsx:propose');
    } else if (activeWorkflows.includes('new')) {
      printStartHints('/opsx:new');
    } else {
      console.log("Done. Run 'openspec config profile' to configure your workflows.");
      advertisedAnInvocation = false;
    }

    // Workflows the active profile left out. Setup is the only moment a user
    // is told what exists, so name them here rather than let a missing
    // command read as a broken install (#1076). Skipped when the branch above
    // already pointed at `openspec config profile`, and when no tool received
    // a workflow surface at all (no tools selected, or none that could take
    // one) — there, adding workflows writes nothing, so naming them would
    // point at the wrong problem.
    if (advertisedAnInvocation && successfulTools.length > 0) {
      const optionalWorkflowsNote = formatOptionalWorkflowsNote(activeWorkflows);
      if (optionalWorkflowsNote) {
        console.log();
        for (const line of optionalWorkflowsNote) {
          console.log(chalk.dim(line));
        }
      }
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

}
