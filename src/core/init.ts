/**
 * Init Command
 *
 * Sets up Pscode with Agent Skills and /ps:* slash commands.
 * This is the unified setup command that replaces both the old init and experimental commands.
 */

import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import { createRequire } from 'module';
import { FileSystemUtils } from '../utils/file-system.js';
import { transformToHyphenCommands } from '../utils/command-references.js';
import {
  AI_TOOLS,
  PSCODE_DIR_NAME,
  AIToolOption,
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
  formatDetectionSummary,
  type LegacyDetectionResult,
} from './legacy-cleanup.js';
import {
  detectLegacyToolArtifacts,
  runLegacyToolMigration,
  formatLegacyToolDetectionSummary,
  formatLegacyToolMigrationSummary,
  pscodeDirExists,
  type LegacyToolDetectionResult,
} from './openspec-migration.js';
import { runTrelloInitPrompt } from './trello-init-prompt.js';
import {
  SKILL_NAMES,
  getToolsWithSkillsDir,
  getToolSkillStatus,
  getToolStates,
  getSkillTemplates,
  getCommandContents,
  generateSkillContent,
  type ToolSkillStatus,
} from './shared/index.js';
import { getGlobalConfig, type Delivery } from './global-config.js';
import { getProfileWorkflows, isValidProfile, DEFAULT_PROFILE, type ProfileName, PROFILES, ALL_WORKFLOWS } from './profiles.js';
import { detectDixiStack, getDixiStackFamily, getDixiStackLabel, installDixiExtras } from './presets/dixi.js';
import { stringify as stringifyYaml } from 'yaml';
import { getAvailableTools } from './available-tools.js';
import { migrateIfNeeded } from './migration.js';

const require = createRequire(import.meta.url);
const { version: PSCODE_VERSION } = require('../../package.json');

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const DEFAULT_SCHEMA = 'spec-driven';

const PROGRESS_SPINNER = {
  interval: 80,
  frames: ['░░░', '▒░░', '▒▒░', '▒▒▒', '▓▒▒', '▓▓▒', '▓▓▓', '▒▓▓', '░▒▓'],
};

const WORKFLOW_TO_SKILL_DIR: Record<string, string> = {
  'explore': 'pscode-explore',
  'new': 'pscode-new-change',
  'continue': 'pscode-continue-change',
  'apply': 'pscode-apply-change',
  'ff': 'pscode-ff-change',
  'complete': 'pscode-archive-change',
  'bulk-archive': 'pscode-bulk-archive-change',
  'verify': 'pscode-verify-change',
  'onboard': 'pscode-onboard',
  'propose': 'pscode-propose',
  // Trello-specific workflows
  'trello-setup': 'pscode-trello-setup',
  'draft': 'pscode-trello-draft',
  // Dixi-specific workflows
  'rfc': 'pscode-dixi-rfc',
  'design': 'pscode-dixi-design',
  'tasks': 'pscode-dixi-tasks',
  'arch-check': 'pscode-dixi-arch-check',
  'adr': 'pscode-dixi-adr',
  'jira-sync': 'pscode-dixi-jira-sync',
  'dod': 'pscode-dixi-dod',
};

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

type InitCommandOptions = {
  tools?: string;
  force?: boolean;
  interactive?: boolean;
  profile?: string;
};

// -----------------------------------------------------------------------------
// Init Command Class
// -----------------------------------------------------------------------------

export class InitCommand {
  private readonly toolsArg?: string;
  private readonly force: boolean;
  private readonly interactiveOption?: boolean;
  private readonly profileOverride?: string;

  constructor(options: InitCommandOptions = {}) {
    this.toolsArg = options.tools;
    this.force = options.force ?? false;
    this.interactiveOption = options.interactive;
    this.profileOverride = options.profile;
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    const pscodeDir = PSCODE_DIR_NAME;
    const pscodePath = path.join(projectPath, pscodeDir);

    // Validation happens silently in the background
    const extendMode = await this.validate(projectPath, pscodePath);

    // Check for legacy tool migration first (before legacy cleanup)
    await this.handleLegacyToolMigration(projectPath);

    // Check for legacy artifacts and handle cleanup
    await this.handleLegacyCleanup(projectPath, extendMode);

    // Detect available tools in the project (task 7.1)
    const detectedTools = getAvailableTools(projectPath);

    // Migration check: migrate existing projects to profile system (task 7.3)
    if (extendMode) {
      migrateIfNeeded(projectPath, detectedTools);
    }

    // Show animated welcome screen (interactive mode only)
    const canPrompt = this.canPromptInteractively();
    if (canPrompt) {
      const { showWelcomeScreen } = await import('../ui/welcome-screen.js');
      await showWelcomeScreen();
    }

    // Validate profile override early so invalid values fail before tool setup.
    // The resolved value is consumed later when generation reads effective config.
    this.resolveProfileOverride();

    // Get tool states before processing
    const toolStates = getToolStates(projectPath);

    // Get tool selection (pass detected tools for pre-selection)
    const selectedToolIds = await this.getSelectedTools(toolStates, extendMode, detectedTools, projectPath);

    // Validate selected tools
    const validatedTools = this.validateTools(selectedToolIds, toolStates);

    // Create directory structure and config
    await this.createDirectoryStructure(pscodePath, extendMode);

    // Trello integration setup (interactive mode only)
    const trelloConfigured = await this.handleTrelloSetup(pscodePath);

    // Generate skills and commands for each tool
    const results = await this.generateSkillsAndCommands(projectPath, validatedTools);

    // Dixi profile extras: stack detection and .pscode-dixi.yaml
    await this.handleDixiExtras(projectPath);

    // Dixi profile: generate JIRA integration files
    const resolvedProfile = this.resolveProfileOverride() ?? (isValidProfile(getGlobalConfig().profile ?? '') ? getGlobalConfig().profile as ProfileName : DEFAULT_PROFILE);
    if (resolvedProfile === 'dixi') {
      await this.generateJiraFiles(projectPath);
    }

    // Create config.yaml if needed
    const configStatus = await this.createConfig(pscodePath, extendMode);

    // Display success message
    this.displaySuccessMessage(projectPath, validatedTools, results, configStatus, trelloConfigured);
  }

  // ═══════════════════════════════════════════════════════════
  // VALIDATION & SETUP
  // ═══════════════════════════════════════════════════════════

  private async validate(
    projectPath: string,
    pscodePath: string
  ): Promise<boolean> {
    const extendMode = await FileSystemUtils.directoryExists(pscodePath);

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

  private resolveProfileOverride(): ProfileName | undefined {
    if (this.profileOverride === undefined) {
      return undefined;
    }

    if (isValidProfile(this.profileOverride)) {
      return this.profileOverride;
    }

    const available = Object.keys(PROFILES).join(', ');
    throw new Error(`Invalid profile "${this.profileOverride}". Available profiles: ${available}`);
  }

  // ═══════════════════════════════════════════════════════════
  // LEGACY TOOL MIGRATION
  // ═══════════════════════════════════════════════════════════

  private async handleLegacyToolMigration(projectPath: string): Promise<void> {
    const detection = await detectLegacyToolArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return;
    }

    // Determine whether pscode/ already exists so we can show the right summary
    const alreadyExists = await pscodeDirExists(projectPath);

    console.log();
    console.log(formatLegacyToolDetectionSummary(detection, alreadyExists));
    console.log();

    const canPrompt = this.canPromptInteractively();

    if (this.force || !canPrompt) {
      // Non-interactive or --force: migrate automatically
      await this.performLegacyToolMigration(projectPath, detection);
      return;
    }

    const { confirm } = await import('@inquirer/prompts');
    const dirName = detection.legacyDirName;
    const migrateLabel = alreadyExists
      ? `Merge ${dirName}/ into pscode/ and complete the migration?`
      : `Migrate this project from the legacy tool to Pscode?`;

    const shouldMigrate = await confirm({
      message: migrateLabel,
      default: true,
    });

    if (!shouldMigrate) {
      console.log(chalk.dim('Migration cancelled. Re-run with --force to skip this prompt.'));
      process.exit(0);
    }

    await this.performLegacyToolMigration(projectPath, detection);
  }

  private async performLegacyToolMigration(
    projectPath: string,
    detection: LegacyToolDetectionResult
  ): Promise<void> {
    const spinner = ora('Migrating from legacy tool...').start();

    const result = await runLegacyToolMigration(projectPath, detection);

    spinner.succeed('Migration to Pscode complete');

    const summary = formatLegacyToolMigrationSummary(result);
    if (summary) {
      console.log();
      console.log(summary);
    }

    console.log();
  }

  // ═══════════════════════════════════════════════════════════
  // LEGACY CLEANUP
  // ═══════════════════════════════════════════════════════════

  private async handleLegacyCleanup(projectPath: string, extendMode: boolean): Promise<void> {
    // Detect legacy artifacts
    const detection = await detectLegacyArtifacts(projectPath);

    if (!detection.hasLegacyArtifacts) {
      return; // No legacy artifacts found
    }

    // Show what was detected
    console.log();
    console.log(formatDetectionSummary(detection));
    console.log();

    const canPrompt = this.canPromptInteractively();

    if (this.force || !canPrompt) {
      // --force flag or non-interactive mode: proceed with cleanup automatically.
      // Legacy slash commands are 100% Pscode-managed, and config file cleanup
      // only removes markers (never deletes files), so auto-cleanup is safe.
      await this.performLegacyCleanup(projectPath, detection);
      return;
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

    await this.performLegacyCleanup(projectPath, detection);
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

    // Non-interactive mode: use detected tools, fallback to Claude if nothing detected
    if (!canPrompt) {
      if (detectedToolIds.size > 0) {
        return [...detectedToolIds];
      }
      // Default to Claude Code when no tools detected and no --tools flag
      return ['claude'];
    }

    if (validTools.length === 0) {
      throw new Error(
        `No tools available for skill generation.`
      );
    }

    // Interactive mode: show searchable multi-select
    const { searchableMultiSelect } = await import('../prompts/searchable-multi-select.js');

    // Claude is pre-selected by default when nothing is configured or detected yet
    const shouldPreselectClaude = !extendMode && configuredToolIds.size === 0 && detectedToolIds.size === 0;

    // Build choices: pre-select configured tools; keep detected tools visible but unselected.
    const sortedChoices = validTools
      .map((toolId) => {
        const tool = AI_TOOLS.find((t) => t.value === toolId);
        const status = toolStates.get(toolId);
        const configured = status?.configured ?? false;
        const detected = detectedToolIds.has(toolId);
        const isClaudeDefault = toolId === 'claude' && shouldPreselectClaude;

        return {
          name: tool?.name || toolId,
          value: toolId,
          configured,
          detected: detected && !configured,
          preSelected: configured || (shouldPreselectDetected && detected && !configured) || isClaudeDefault,
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
      console.log(`Pscode configured: ${configuredNames.join(', ')} (pre-selected)`);
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

    const normalizedTokens = tokens.map((token) => token.toLowerCase());

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
    toolStates: Map<string, ToolSkillStatus>
  ): Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> {
    const validatedTools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }> = [];

    for (const toolId of toolIds) {
      const tool = AI_TOOLS.find((t) => t.value === toolId);
      if (!tool) {
        const validToolIds = getToolsWithSkillsDir();
        throw new Error(
          `Unknown tool '${toolId}'. Valid tools:\n  ${validToolIds.join('\n  ')}`
        );
      }

      if (!tool.skillsDir) {
        const validToolsWithSkills = getToolsWithSkillsDir();
        throw new Error(
          `Tool '${toolId}' does not support skill generation.\nTools with skill generation support:\n  ${validToolsWithSkills.join('\n  ')}`
        );
      }

      const preState = toolStates.get(tool.value);
      validatedTools.push({
        value: tool.value,
        name: tool.name,
        skillsDir: tool.skillsDir,
        wasConfigured: preState?.configured ?? false,
      });
    }

    return validatedTools;
  }

  // ═══════════════════════════════════════════════════════════
  // TRELLO SETUP
  // ═══════════════════════════════════════════════════════════

  private async handleTrelloSetup(pscodePath: string): Promise<boolean> {
    if (!this.canPromptInteractively()) {
      return false;
    }

    try {
      return await runTrelloInitPrompt(pscodePath);
    } catch {
      // Non-fatal — Trello setup is optional
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // DIRECTORY STRUCTURE
  // ═══════════════════════════════════════════════════════════

  private async createDirectoryStructure(pscodePath: string, extendMode: boolean): Promise<void> {
    if (extendMode) {
      // In extend mode, just ensure directories exist without spinner
      const directories = [
        pscodePath,
        path.join(pscodePath, 'specs'),
        path.join(pscodePath, 'changes'),
        path.join(pscodePath, 'changes', 'archive'),
      ];

      for (const dir of directories) {
        await FileSystemUtils.createDirectory(dir);
      }
      return;
    }

    const spinner = this.startSpinner('Creating Pscode structure...');

    const directories = [
      pscodePath,
      path.join(pscodePath, 'specs'),
      path.join(pscodePath, 'changes'),
      path.join(pscodePath, 'changes', 'archive'),
    ];

    for (const dir of directories) {
      await FileSystemUtils.createDirectory(dir);
    }

    spinner.stopAndPersist({
      symbol: PALETTE.white('▌'),
      text: PALETTE.white('Pscode structure created'),
    });
  }

  // ═══════════════════════════════════════════════════════════
  // SKILL & COMMAND GENERATION
  // ═══════════════════════════════════════════════════════════

  private async generateSkillsAndCommands(
    projectPath: string,
    tools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }>
  ): Promise<{
    createdTools: typeof tools;
    refreshedTools: typeof tools;
    failedTools: Array<{ name: string; error: Error }>;
    commandsSkipped: string[];
    removedCommandCount: number;
    removedSkillCount: number;
  }> {
    const createdTools: typeof tools = [];
    const refreshedTools: typeof tools = [];
    const failedTools: Array<{ name: string; error: Error }> = [];
    const commandsSkipped: string[] = [];
    let removedCommandCount = 0;
    let removedSkillCount = 0;

    // Read global config for profile and delivery settings (use --profile override if set)
    const globalConfig = getGlobalConfig();
    const profile: ProfileName = this.resolveProfileOverride() ?? (isValidProfile(globalConfig.profile ?? '') ? globalConfig.profile as ProfileName : DEFAULT_PROFILE);
    const delivery: Delivery = globalConfig.delivery ?? 'both';
    const workflows = [...getProfileWorkflows(profile)];

    // Get skill and command templates filtered by profile workflows
    const shouldGenerateSkills = delivery !== 'commands';
    const shouldGenerateCommands = delivery !== 'skills';
    const skillTemplates = shouldGenerateSkills ? getSkillTemplates(workflows) : [];
    const commandContents = shouldGenerateCommands ? getCommandContents(workflows) : [];

    // Process each tool
    for (const tool of tools) {
      const spinner = ora(`Setting up ${tool.name}...`).start();

      try {
        // Generate skill files if delivery includes skills
        if (shouldGenerateSkills) {
          // Use tool-specific skillsDir
          const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');

          // Create skill directories and SKILL.md files
          for (const { template, dirName } of skillTemplates) {
            const skillDir = path.join(skillsDir, dirName);
            const skillFile = path.join(skillDir, 'SKILL.md');

            // Generate SKILL.md content with YAML frontmatter including generatedBy
            // Use hyphen-based command references for tools where filename = command name
            const transformer = (tool.value === 'opencode' || tool.value === 'pi') ? transformToHyphenCommands : undefined;
            const skillContent = generateSkillContent(template, PSCODE_VERSION, transformer);

            // Write the skill file
            await FileSystemUtils.writeFile(skillFile, skillContent);
          }
        }
        if (!shouldGenerateSkills) {
          const skillsDir = path.join(projectPath, tool.skillsDir, 'skills');
          removedSkillCount += await this.removeSkillDirs(skillsDir);
        }

        // Generate commands if delivery includes commands
        if (shouldGenerateCommands) {
          const adapter = CommandAdapterRegistry.get(tool.value);
          if (adapter) {
            const generatedCommands = generateCommands(commandContents, adapter);

            for (const cmd of generatedCommands) {
              const commandFile = path.isAbsolute(cmd.path) ? cmd.path : path.join(projectPath, cmd.path);
              await FileSystemUtils.writeFile(commandFile, cmd.fileContent);
            }
          } else {
            commandsSkipped.push(tool.value);
          }
        }
        if (!shouldGenerateCommands) {
          removedCommandCount += await this.removeCommandFiles(projectPath, tool.value);
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

    return {
      createdTools,
      refreshedTools,
      failedTools,
      commandsSkipped,
      removedCommandCount,
      removedSkillCount,
    };
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIG FILE
  // ═══════════════════════════════════════════════════════════

  private async createConfig(pscodePath: string, extendMode: boolean): Promise<'created' | 'exists' | 'skipped'> {
    const configPath = path.join(pscodePath, 'config.yaml');
    const configYmlPath = path.join(pscodePath, 'config.yml');
    const configYamlExists = fs.existsSync(configPath);
    const configYmlExists = fs.existsSync(configYmlPath);

    if (configYamlExists || configYmlExists) {
      return 'exists';
    }

    try {
      const yamlContent = serializeConfig({ schema: DEFAULT_SCHEMA });
      await FileSystemUtils.writeFile(configPath, yamlContent);
      return 'created';
    } catch {
      return 'skipped';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // UI & OUTPUT
  // ═══════════════════════════════════════════════════════════

  private displaySuccessMessage(
    projectPath: string,
    tools: Array<{ value: string; name: string; skillsDir: string; wasConfigured: boolean }>,
    results: {
      createdTools: typeof tools;
      refreshedTools: typeof tools;
      failedTools: Array<{ name: string; error: Error }>;
      commandsSkipped: string[];
      removedCommandCount: number;
      removedSkillCount: number;
    },
    configStatus: 'created' | 'exists' | 'skipped',
    trelloConfigured = false
  ): void {
    console.log();
    console.log(chalk.bold('Pscode Setup Complete'));
    console.log();

    // Show created vs refreshed tools
    if (results.createdTools.length > 0) {
      console.log(`Created: ${results.createdTools.map((t) => t.name).join(', ')}`);
    }
    if (results.refreshedTools.length > 0) {
      console.log(`Refreshed: ${results.refreshedTools.map((t) => t.name).join(', ')}`);
    }

    // Show counts
    const successfulTools = [...results.createdTools, ...results.refreshedTools];
    if (successfulTools.length > 0) {
      const globalConfig = getGlobalConfig();
      const profile: ProfileName = this.resolveProfileOverride() ?? (isValidProfile(globalConfig.profile ?? '') ? globalConfig.profile as ProfileName : DEFAULT_PROFILE);
      const delivery: Delivery = globalConfig.delivery ?? 'both';
      const workflows = [...getProfileWorkflows(profile)];
      const toolDirs = [...new Set(successfulTools.map((t) => t.skillsDir))].join(', ');
      const skillCount = delivery !== 'commands' ? getSkillTemplates(workflows).length : 0;
      const commandCount = delivery !== 'skills' ? getCommandContents(workflows).length : 0;
      if (skillCount > 0 && commandCount > 0) {
        console.log(`${skillCount} skills and ${commandCount} commands in ${toolDirs}/`);
      } else if (skillCount > 0) {
        console.log(`${skillCount} skills in ${toolDirs}/`);
      } else if (commandCount > 0) {
        console.log(`${commandCount} commands in ${toolDirs}/`);
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
    if (results.removedCommandCount > 0) {
      console.log(chalk.dim(`Removed: ${results.removedCommandCount} command files (delivery: skills)`));
    }
    if (results.removedSkillCount > 0) {
      console.log(chalk.dim(`Removed: ${results.removedSkillCount} skill directories (delivery: commands)`));
    }

    // Config status
    if (configStatus === 'created') {
      console.log(`Config: pscode/config.yaml (schema: ${DEFAULT_SCHEMA})`);
    } else if (configStatus === 'exists') {
      // Show actual filename (config.yaml or config.yml)
      const configYaml = path.join(projectPath, PSCODE_DIR_NAME, 'config.yaml');
      const configYml = path.join(projectPath, PSCODE_DIR_NAME, 'config.yml');
      const configName = fs.existsSync(configYaml) ? 'config.yaml' : fs.existsSync(configYml) ? 'config.yml' : 'config.yaml';
      console.log(`Config: pscode/${configName} (exists)`);
    } else {
      console.log(chalk.dim(`Config: skipped (non-interactive mode)`));
    }

    // Getting started
    const globalCfg = getGlobalConfig();
    const activeProfile: ProfileName = this.resolveProfileOverride() ?? (isValidProfile(globalCfg.profile ?? '') ? globalCfg.profile as ProfileName : DEFAULT_PROFILE);
    const activeWorkflows = [...getProfileWorkflows(activeProfile)];
    console.log();
    if (activeWorkflows.includes('propose')) {
      console.log(chalk.bold('Getting started:'));
      console.log('  Start your first change: /ps:propose "your idea"');
    } else if (activeWorkflows.includes('new')) {
      console.log(chalk.bold('Getting started:'));
      console.log('  Start your first change: /ps:new "your idea"');
    } else {
      console.log("Done. Run 'pscode config profile' to switch profiles.");
    }

    // Trello status
    if (trelloConfigured) {
      console.log();
      console.log(chalk.bold('Trello Integration'));
      console.log(`  Preferences saved to ${chalk.cyan('pscode/trello.yaml')}`);
      console.log(`  Run ${chalk.cyan('/ps:trello-setup')} in Claude Code to connect your Trello lists.`);
    }

    // Links
    console.log();
    console.log(`Learn more: ${chalk.cyan('https://github.com/thiagodiogo/Pscode')}`);
    console.log(`Feedback:   ${chalk.cyan('https://github.com/thiagodiogo/Pscode/issues')}`);

    // Restart instruction if any tools were configured
    if (results.createdTools.length > 0 || results.refreshedTools.length > 0) {
      console.log();
      console.log(chalk.white('Restart your IDE for slash commands to take effect.'));
    }

    console.log();
  }

  private async generateJiraFiles(projectPath: string): Promise<void> {
    const pastelsddPath = path.join(projectPath, 'pastelsdd');
    await FileSystemUtils.createDirectory(pastelsddPath);

    const jiraYamlPath = path.join(pastelsddPath, 'jira.yaml');
    if (!fs.existsSync(jiraYamlPath)) {
      const content = `project_key: ""\nboard_url: ""\nconfigured: false\ntransitions:\n  done: ""\n`;
      await FileSystemUtils.writeFile(jiraYamlPath, content);
    }

    const mcpJsonPath = path.join(projectPath, '.mcp.json');
    let mcpConfig: Record<string, unknown> = {};

    if (fs.existsSync(mcpJsonPath)) {
      try {
        const raw = fs.readFileSync(mcpJsonPath, 'utf-8');
        mcpConfig = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        console.log('Aviso: .mcp.json inválido — recriando com entrada Atlassian.');
        mcpConfig = {};
      }
    }

    const mcpServers = (mcpConfig.mcpServers ?? {}) as Record<string, unknown>;
    if (!mcpServers['atlassian']) {
      mcpServers['atlassian'] = {
        command: 'npx',
        args: ['-y', 'mcp-remote', 'https://mcp.atlassian.com/v1/sse'],
      };
      mcpConfig.mcpServers = mcpServers;
      await FileSystemUtils.writeFile(mcpJsonPath, JSON.stringify(mcpConfig, null, 2) + '\n');
    }

    console.log('JIRA: edite pastelsdd/jira.yaml com project_key e board_url, depois use /pstld:jira-sync para testar a conexão.');
  }

  private async handleDixiExtras(projectPath: string): Promise<void> {
    const globalConfig = getGlobalConfig();
    const profile: ProfileName = this.resolveProfileOverride() ?? (isValidProfile(globalConfig.profile ?? '') ? globalConfig.profile as ProfileName : DEFAULT_PROFILE);

    if (profile !== 'dixi') return;

    const stack = detectDixiStack(projectPath);
    const label = getDixiStackLabel(stack);

    if (stack) {
      console.log(`Dixi: stack detectada — ${label}`);
    } else {
      console.log('Dixi: stack não detectada, usando configuração genérica');
    }

    installDixiExtras(projectPath, stack);

    const family = getDixiStackFamily(stack);
    const yamlContent = stringifyYaml({ stack, family, detectedAt: new Date().toISOString() });
    const dixiYamlPath = path.join(projectPath, '.pscode-dixi.yaml');
    await FileSystemUtils.writeFile(dixiYamlPath, yamlContent);
  }

  private startSpinner(text: string) {
    return ora({
      text,
      stream: process.stdout,
      color: 'gray',
      spinner: PROGRESS_SPINNER,
    }).start();
  }

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

  private async removeCommandFiles(projectPath: string, toolId: string): Promise<number> {
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
}
