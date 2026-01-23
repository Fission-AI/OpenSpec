import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { FileSystemUtils } from '../utils/file-system.js';
import { TemplateManager, ProjectContext } from './templates/index.js';
import { ToolRegistry } from './configurators/registry.js';
import { SlashCommandRegistry } from './configurators/slash/registry.js';
import {
  OpenSpecConfig,
  AI_TOOLS,
  OPENSPEC_DIR_NAME,
  AIToolOption,
  OPENSPEC_MARKERS,
} from './config.js';
import { PALETTE } from './styles/palette.js';
import {
  LETTER_MAP,
  ROOT_STUB_CHOICE_VALUE,
  OTHER_TOOLS_HEADING_VALUE,
  LIST_SPACER_VALUE,
  ToolWizardChoice,
  ToolSelectionPrompt,
  toolSelectionWizard,
  parseToolLabel,
} from './init/wizard.js';

const PROGRESS_SPINNER = {
  interval: 80,
  frames: ['░░░', '▒░░', '▒▒░', '▒▒▒', '▓▒▒', '▓▓▒', '▓▓▓', '▒▓▓', '░▒▓'],
};

type RootStubStatus = 'created' | 'updated' | 'skipped';

type InitCommandOptions = {
  prompt?: ToolSelectionPrompt;
  tools?: string;
};

export class InitCommand {
  private readonly prompt: ToolSelectionPrompt;
  private readonly toolsArg?: string;

  // ═══════════════════════════════════════════════════════════
  // CONSTRUCTOR & MAIN ENTRY
  // ═══════════════════════════════════════════════════════════

  constructor(options: InitCommandOptions = {}) {
    this.prompt = options.prompt ?? ((config) => toolSelectionWizard(config));
    this.toolsArg = options.tools;
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    const openspecDir = OPENSPEC_DIR_NAME;
    const openspecPath = path.join(projectPath, openspecDir);

    // Validation happens silently in the background
    const extendMode = await this.validate(projectPath, openspecPath);
    const existingToolStates = await this.getExistingToolStates(projectPath, extendMode);

    this.renderBanner(extendMode);

    // Get configuration (after validation to avoid prompts if validation fails)
    const config = await this.getConfiguration(existingToolStates, extendMode);

    const availableTools = AI_TOOLS.filter((tool) => tool.available);
    const selectedIds = new Set(config.aiTools);
    const selectedTools = availableTools.filter((tool) =>
      selectedIds.has(tool.value)
    );
    const created = selectedTools.filter(
      (tool) => !existingToolStates[tool.value]
    );
    const refreshed = selectedTools.filter(
      (tool) => existingToolStates[tool.value]
    );
    const skippedExisting = availableTools.filter(
      (tool) => !selectedIds.has(tool.value) && existingToolStates[tool.value]
    );
    const skipped = availableTools.filter(
      (tool) => !selectedIds.has(tool.value) && !existingToolStates[tool.value]
    );

    // Step 1: Create directory structure
    if (!extendMode) {
      const structureSpinner = this.startSpinner(
        'Creating OpenSpec structure...'
      );
      await this.createDirectoryStructure(openspecPath);
      await this.generateFiles(openspecPath, config);
      structureSpinner.stopAndPersist({
        symbol: PALETTE.white('▌'),
        text: PALETTE.white('OpenSpec structure created'),
      });
    } else {
      ora({ stream: process.stdout }).info(
        PALETTE.midGray(
          'ℹ OpenSpec already initialized. Checking for missing files...'
        )
      );
      await this.createDirectoryStructure(openspecPath);
      await this.ensureTemplateFiles(openspecPath, config);
    }

    // Step 2: Configure AI tools
    const toolSpinner = this.startSpinner('Configuring AI tools...');
    const rootStubStatus = await this.configureAITools(
      projectPath,
      openspecDir,
      config.aiTools
    );
    toolSpinner.stopAndPersist({
      symbol: PALETTE.white('▌'),
      text: PALETTE.white('AI tools configured'),
    });

    // Success message
    this.displaySuccessMessage(
      selectedTools,
      created,
      refreshed,
      skippedExisting,
      skipped,
      extendMode,
      rootStubStatus
    );
  }

  // ═══════════════════════════════════════════════════════════
  // VALIDATION & SETUP
  // ═══════════════════════════════════════════════════════════

  private async validate(
    projectPath: string,
    _openspecPath: string
  ): Promise<boolean> {
    const extendMode = await FileSystemUtils.directoryExists(_openspecPath);

    // Check write permissions
    if (!(await FileSystemUtils.ensureWritePermissions(projectPath))) {
      throw new Error(`Insufficient permissions to write to ${projectPath}`);
    }
    return extendMode;
  }

  private async getExistingToolStates(
    projectPath: string,
    extendMode: boolean
  ): Promise<Record<string, boolean>> {
    // Fresh initialization - no tools configured yet
    if (!extendMode) {
      return Object.fromEntries(AI_TOOLS.map(t => [t.value, false]));
    }

    // Extend mode - check all tools in parallel for better performance
    const entries = await Promise.all(
      AI_TOOLS.map(async (t) => [t.value, await this.isToolConfigured(projectPath, t.value)] as const)
    );
    return Object.fromEntries(entries);
  }

  private async isToolConfigured(
    projectPath: string,
    toolId: string
  ): Promise<boolean> {
    // A tool is only considered "configured by OpenSpec" if its files contain OpenSpec markers.
    // For tools with both config files and slash commands, BOTH must have markers.
    // For slash commands, at least one file with markers is sufficient (not all required).

    // Helper to check if a file exists and contains OpenSpec markers
    const fileHasMarkers = async (absolutePath: string): Promise<boolean> => {
      try {
        const content = await FileSystemUtils.readFile(absolutePath);
        return content.includes(OPENSPEC_MARKERS.start) && content.includes(OPENSPEC_MARKERS.end);
      } catch {
        return false;
      }
    };

    let hasConfigFile = false;
    let hasSlashCommands = false;

    // Check if the tool has a config file with OpenSpec markers
    const configFile = ToolRegistry.get(toolId)?.configFileName;
    if (configFile) {
      const configPath = path.join(projectPath, configFile);
      hasConfigFile = (await FileSystemUtils.fileExists(configPath)) && (await fileHasMarkers(configPath));
    }

    // Check if any slash command file exists with OpenSpec markers
    const slashConfigurator = SlashCommandRegistry.get(toolId);
    if (slashConfigurator) {
      for (const target of slashConfigurator.getTargets()) {
        const absolute = slashConfigurator.resolveAbsolutePath(projectPath, target.id);
        if ((await FileSystemUtils.fileExists(absolute)) && (await fileHasMarkers(absolute))) {
          hasSlashCommands = true;
          break; // At least one file with markers is sufficient
        }
      }
    }

    // Tool is only configured if BOTH exist with markers
    // OR if the tool has no config file requirement (slash commands only)
    // OR if the tool has no slash commands requirement (config file only)
    const hasConfigFileRequirement = configFile !== undefined;
    const hasSlashCommandRequirement = slashConfigurator !== undefined;

    if (hasConfigFileRequirement && hasSlashCommandRequirement) {
      // Both are required - both must be present with markers
      return hasConfigFile && hasSlashCommands;
    } else if (hasConfigFileRequirement) {
      // Only config file required
      return hasConfigFile;
    } else if (hasSlashCommandRequirement) {
      // Only slash commands required
      return hasSlashCommands;
    }

    return false;
  }

  // ═══════════════════════════════════════════════════════════
  // CONFIGURATION & TOOL SELECTION
  // ═══════════════════════════════════════════════════════════

  private async getConfiguration(
    existingTools: Record<string, boolean>,
    extendMode: boolean
  ): Promise<OpenSpecConfig> {
    const selectedTools = await this.getSelectedTools(existingTools, extendMode);
    return { aiTools: selectedTools };
  }

  private async getSelectedTools(
    existingTools: Record<string, boolean>,
    extendMode: boolean
  ): Promise<string[]> {
    const nonInteractiveSelection = this.resolveToolsArg();
    if (nonInteractiveSelection !== null) {
      return nonInteractiveSelection;
    }

    // Fall back to interactive mode
    return this.promptForAITools(existingTools, extendMode);
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

    const availableTools = AI_TOOLS.filter((tool) => tool.available);
    const availableValues = availableTools.map((tool) => tool.value);
    const availableSet = new Set(availableValues);
    const availableList = ['all', 'none', ...availableValues].join(', ');

    const lowerRaw = raw.toLowerCase();
    if (lowerRaw === 'all') {
      return availableValues;
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

    const deduped: string[] = [];
    for (const token of normalizedTokens) {
      if (!deduped.includes(token)) {
        deduped.push(token);
      }
    }

    return deduped;
  }

  private async promptForAITools(
    existingTools: Record<string, boolean>,
    extendMode: boolean
  ): Promise<string[]> {
    const availableTools = AI_TOOLS.filter((tool) => tool.available);

    const baseMessage = extendMode
      ? 'Which natively supported AI tools would you like to add or refresh?'
      : 'Which natively supported AI tools do you use?';
    const initialNativeSelection = extendMode
      ? availableTools
          .filter((tool) => existingTools[tool.value])
          .map((tool) => tool.value)
      : [];

    const initialSelected = Array.from(new Set(initialNativeSelection));

    const choices: ToolWizardChoice[] = [
      {
        kind: 'heading',
        value: '__heading-native__',
        label: {
          primary:
            'Natively supported providers (✔ OpenSpec custom slash commands available)',
        },
        selectable: false,
      },
      ...availableTools.map<ToolWizardChoice>((tool) => ({
        kind: 'option',
        value: tool.value,
        label: parseToolLabel(tool.name),
        configured: Boolean(existingTools[tool.value]),
        selectable: true,
      })),
      ...(availableTools.length
        ? ([
            {
              kind: 'info' as const,
              value: LIST_SPACER_VALUE,
              label: { primary: '' },
              selectable: false,
            },
          ] as ToolWizardChoice[])
        : []),
      {
        kind: 'heading',
        value: OTHER_TOOLS_HEADING_VALUE,
        label: {
          primary:
            'Other tools (use Universal AGENTS.md for Amp, VS Code, GitHub Copilot, …)',
        },
        selectable: false,
      },
      {
        kind: 'option',
        value: ROOT_STUB_CHOICE_VALUE,
        label: {
          primary: 'Universal AGENTS.md',
          annotation: 'always available',
        },
        configured: extendMode,
        selectable: true,
      },
    ];

    return this.prompt({
      extendMode,
      baseMessage,
      choices,
      initialSelected,
    });
  }

  // ═══════════════════════════════════════════════════════════
  // FILE SYSTEM OPERATIONS
  // ═══════════════════════════════════════════════════════════

  private async createDirectoryStructure(openspecPath: string): Promise<void> {
    const directories = [
      openspecPath,
      path.join(openspecPath, 'specs'),
      path.join(openspecPath, 'changes'),
      path.join(openspecPath, 'changes', 'archive'),
    ];

    for (const dir of directories) {
      await FileSystemUtils.createDirectory(dir);
    }
  }

  private async generateFiles(
    openspecPath: string,
    config: OpenSpecConfig
  ): Promise<void> {
    await this.writeTemplateFiles(openspecPath, config, false);
  }

  private async ensureTemplateFiles(
    openspecPath: string,
    config: OpenSpecConfig
  ): Promise<void> {
    await this.writeTemplateFiles(openspecPath, config, true);
  }

  private async writeTemplateFiles(
    openspecPath: string,
    config: OpenSpecConfig,
    skipExisting: boolean
  ): Promise<void> {
    const context: ProjectContext = {
      // Could be enhanced with prompts for project details
    };

    const templates = TemplateManager.getTemplates(context);

    for (const template of templates) {
      const filePath = path.join(openspecPath, template.path);

      // Skip if file exists and we're in skipExisting mode
      if (skipExisting && (await FileSystemUtils.fileExists(filePath))) {
        continue;
      }

      const content =
        typeof template.content === 'function'
          ? template.content(context)
          : template.content;

      await FileSystemUtils.writeFile(filePath, content);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // TOOL CONFIGURATION
  // ═══════════════════════════════════════════════════════════

  private async configureAITools(
    projectPath: string,
    openspecDir: string,
    toolIds: string[]
  ): Promise<RootStubStatus> {
    const rootStubStatus = await this.configureRootAgentsStub(
      projectPath,
      openspecDir
    );

    for (const toolId of toolIds) {
      const configurator = ToolRegistry.get(toolId);
      if (configurator && configurator.isAvailable) {
        await configurator.configure(projectPath, openspecDir);
      }

      const slashConfigurator = SlashCommandRegistry.get(toolId);
      if (slashConfigurator && slashConfigurator.isAvailable) {
        await slashConfigurator.generateAll(projectPath, openspecDir);
      }
    }

    return rootStubStatus;
  }

  private async configureRootAgentsStub(
    projectPath: string,
    openspecDir: string
  ): Promise<RootStubStatus> {
    const configurator = ToolRegistry.get('agents');
    if (!configurator || !configurator.isAvailable) {
      return 'skipped';
    }

    const stubPath = path.join(projectPath, configurator.configFileName);
    const existed = await FileSystemUtils.fileExists(stubPath);

    await configurator.configure(projectPath, openspecDir);

    return existed ? 'updated' : 'created';
  }

  // ═══════════════════════════════════════════════════════════
  // UI & OUTPUT
  // ═══════════════════════════════════════════════════════════

  private displaySuccessMessage(
    selectedTools: AIToolOption[],
    created: AIToolOption[],
    refreshed: AIToolOption[],
    skippedExisting: AIToolOption[],
    skipped: AIToolOption[],
    extendMode: boolean,
    rootStubStatus: RootStubStatus
  ): void {
    console.log(); // Empty line for spacing
    const successHeadline = extendMode
      ? 'OpenSpec tool configuration updated!'
      : 'OpenSpec initialized successfully!';
    ora().succeed(PALETTE.white(successHeadline));

    console.log();
    console.log(PALETTE.lightGray('Tool summary:'));
    const summaryLines = [
      rootStubStatus === 'created'
        ? `${PALETTE.white('▌')} ${PALETTE.white(
            'Root AGENTS.md stub created for other assistants'
          )}`
        : null,
      rootStubStatus === 'updated'
        ? `${PALETTE.lightGray('▌')} ${PALETTE.lightGray(
            'Root AGENTS.md stub refreshed for other assistants'
          )}`
        : null,
      created.length
        ? `${PALETTE.white('▌')} ${PALETTE.white(
            'Created:'
          )} ${this.formatToolNames(created)}`
        : null,
      refreshed.length
        ? `${PALETTE.lightGray('▌')} ${PALETTE.lightGray(
            'Refreshed:'
          )} ${this.formatToolNames(refreshed)}`
        : null,
      skippedExisting.length
        ? `${PALETTE.midGray('▌')} ${PALETTE.midGray(
            'Skipped (already configured):'
          )} ${this.formatToolNames(skippedExisting)}`
        : null,
      skipped.length
        ? `${PALETTE.darkGray('▌')} ${PALETTE.darkGray(
            'Skipped:'
          )} ${this.formatToolNames(skipped)}`
        : null,
    ].filter((line): line is string => Boolean(line));
    for (const line of summaryLines) {
      console.log(line);
    }

    console.log();
    console.log(
      PALETTE.midGray(
        'Use `openspec update` to refresh shared OpenSpec instructions in the future.'
      )
    );

    // Show restart instruction if any tools were configured
    if (created.length > 0 || refreshed.length > 0) {
      console.log();
      console.log(PALETTE.white('Important: Restart your IDE'));
      console.log(
        PALETTE.midGray(
          'Slash commands are loaded at startup. Please restart your coding assistant'
        )
      );
      console.log(
        PALETTE.midGray(
          'to ensure the new /openspec commands appear in your command palette.'
        )
      );
    }

    // Get the selected tool name(s) for display
    const toolName = this.formatToolNames(selectedTools);

    console.log();
    console.log(`Next steps - Copy these prompts to ${toolName}:`);
    console.log(
      chalk.gray('────────────────────────────────────────────────────────────')
    );
    console.log(PALETTE.white('1. Populate your project context:'));
    console.log(
      PALETTE.lightGray(
        '   "Please read openspec/project.md and help me fill it out'
      )
    );
    console.log(
      PALETTE.lightGray(
        '    with details about my project, tech stack, and conventions"\n'
      )
    );
    console.log(PALETTE.white('2. Create your first change proposal:'));
    console.log(
      PALETTE.lightGray(
        '   "I want to add [YOUR FEATURE HERE]. Please create an'
      )
    );
    console.log(
      PALETTE.lightGray('    OpenSpec change proposal for this feature"\n')
    );
    console.log(PALETTE.white('3. Learn the OpenSpec workflow:'));
    console.log(
      PALETTE.lightGray(
        '   "Please explain the OpenSpec workflow from openspec/AGENTS.md'
      )
    );
    console.log(
      PALETTE.lightGray('    and how I should work with you on this project"')
    );
    console.log(
      PALETTE.darkGray(
        '────────────────────────────────────────────────────────────\n'
      )
    );

    // Codex heads-up: prompts installed globally
    const selectedToolIds = new Set(selectedTools.map((t) => t.value));
    if (selectedToolIds.has('codex')) {
      console.log(PALETTE.white('Codex setup note'));
      console.log(
        PALETTE.midGray('Prompts installed to ~/.codex/prompts (or $CODEX_HOME/prompts).')
      );
      console.log();
    }
  }

  private formatToolNames(tools: AIToolOption[]): string {
    const names = tools
      .map((tool) => tool.successLabel ?? tool.name)
      .filter((name): name is string => Boolean(name));

    if (names.length === 0)
      return PALETTE.lightGray('your AGENTS.md-compatible assistant');
    if (names.length === 1) return PALETTE.white(names[0]);

    const base = names.slice(0, -1).map((name) => PALETTE.white(name));
    const last = PALETTE.white(names[names.length - 1]);

    return `${base.join(PALETTE.midGray(', '))}${
      base.length ? PALETTE.midGray(', and ') : ''
    }${last}`;
  }

  private renderBanner(_extendMode: boolean): void {
    const rows = ['', '', '', '', ''];
    for (const char of 'OPENSPEC') {
      const glyph = LETTER_MAP[char] ?? LETTER_MAP[' '];
      for (let i = 0; i < rows.length; i += 1) {
        rows[i] += `${glyph[i]}  `;
      }
    }

    const rowStyles = [
      PALETTE.white,
      PALETTE.lightGray,
      PALETTE.midGray,
      PALETTE.lightGray,
      PALETTE.white,
    ];

    console.log();
    rows.forEach((row, index) => {
      console.log(rowStyles[index](row.replace(/\s+$/u, '')));
    });
    console.log();
    console.log(PALETTE.white('Welcome to OpenSpec!'));
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
