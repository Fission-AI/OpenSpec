import path from 'path';
import {
  createPrompt,
  isBackspaceKey,
  isDownKey,
  isEnterKey,
  isSpaceKey,
  isUpKey,
  useKeypress,
  usePagination,
  useState,
} from '@inquirer/core';
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
} from './config.js';

const PROGRESS_SPINNER = {
  interval: 80,
  frames: ['░░░', '▒░░', '▒▒░', '▒▒▒', '▓▒▒', '▓▓▒', '▓▓▓', '▒▓▓', '░▒▓'],
};

const PALETTE = {
  white: chalk.hex('#f4f4f4'),
  lightGray: chalk.hex('#c8c8c8'),
  midGray: chalk.hex('#8a8a8a'),
  darkGray: chalk.hex('#4a4a4a'),
};

const LETTER_MAP: Record<string, string[]> = {
  O: [' ████ ', '██  ██', '██  ██', '██  ██', ' ████ '],
  P: ['█████ ', '██  ██', '█████ ', '██    ', '██    '],
  E: ['██████', '██    ', '█████ ', '██    ', '██████'],
  N: ['██  ██', '███ ██', '██ ███', '██  ██', '██  ██'],
  S: [' █████', '██    ', ' ████ ', '    ██', '█████ '],
  C: [' █████', '██    ', '██    ', '██    ', ' █████'],
  ' ': ['  ', '  ', '  ', '  ', '  '],
};

type ToolLabel = {
  primary: string;
  annotation?: string;
};

const sanitizeToolLabel = (raw: string): string =>
  raw.replace(/✅/gu, '✔').trim();

const parseToolLabel = (raw: string): ToolLabel => {
  const sanitized = sanitizeToolLabel(raw);
  const match = sanitized.match(/^(.*?)\s*\((.+)\)$/u);
  if (!match) {
    return { primary: sanitized };
  }
  return {
    primary: match[1].trim(),
    annotation: match[2].trim(),
  };
};

type ToolWizardChoice = {
  value: string;
  label: ToolLabel;
  configured: boolean;
};

type ToolWizardConfig = {
  extendMode: boolean;
  baseMessage: string;
  choices: ToolWizardChoice[];
  initialSelected?: string[];
};

type WizardStep = 'intro' | 'select' | 'review';

type ToolSelectionPrompt = (config: ToolWizardConfig) => Promise<string[]>;

const toolSelectionWizard = createPrompt<string[], ToolWizardConfig>(
  (config, done) => {
    const totalSteps = 3;
    const [step, setStep] = useState<WizardStep>('intro');
    const [cursor, setCursor] = useState<number>(0);
    const [selected, setSelected] = useState<string[]>(
      () => config.initialSelected ?? []
    );
    const [error, setError] = useState<string | null>(null);

    const selectedSet = new Set(selected);
    const pageSize = Math.max(Math.min(config.choices.length, 7), 1);

    const updateSelected = (next: Set<string>) => {
      const ordered = config.choices
        .map((choice) => choice.value)
        .filter((value) => next.has(value));
      setSelected(ordered);
    };

    const page = usePagination({
      items: config.choices,
      active: cursor,
      pageSize,
      loop: config.choices.length > 1,
      renderItem: ({ item, isActive }) => {
        const isSelected = selectedSet.has(item.value);
        const cursorSymbol = isActive
          ? PALETTE.white('›')
          : PALETTE.midGray(' ');
        const indicator = isSelected
          ? PALETTE.white('◉')
          : PALETTE.midGray('○');
        const nameColor = isActive ? PALETTE.white : PALETTE.midGray;
        const label = `${nameColor(item.label.primary)}${
          item.configured ? PALETTE.midGray(' (already configured)') : ''
        }`;
        return `${cursorSymbol} ${indicator} ${label}`;
      },
    });

    useKeypress((key) => {
      if (step === 'intro') {
        if (isEnterKey(key)) {
          setStep('select');
        }
        return;
      }

      if (step === 'select') {
        if (isUpKey(key)) {
          const previousIndex =
            cursor <= 0 ? config.choices.length - 1 : cursor - 1;
          setCursor(previousIndex);
          setError(null);
          return;
        }

        if (isDownKey(key)) {
          const nextIndex =
            cursor >= config.choices.length - 1 ? 0 : cursor + 1;
          setCursor(nextIndex);
          setError(null);
          return;
        }

        if (isSpaceKey(key)) {
          const current = config.choices[cursor];
          if (!current) return;

          const next = new Set(selected);
          if (next.has(current.value)) {
            next.delete(current.value);
          } else {
            next.add(current.value);
          }

          updateSelected(next);
          setError(null);
          return;
        }

        if (isEnterKey(key)) {
          if (selected.length === 0) {
            setError('Select at least one AI tool to continue.');
            return;
          }
          setStep('review');
          setError(null);
          return;
        }

        if (key.name === 'escape') {
          setSelected([]);
          setError(null);
        }
        return;
      }

      if (step === 'review') {
        if (isEnterKey(key)) {
          const finalSelection = config.choices
            .map((choice) => choice.value)
            .filter((value) => selectedSet.has(value));
          done(finalSelection);
          return;
        }

        if (isBackspaceKey(key) || key.name === 'escape') {
          setStep('select');
          setError(null);
        }
      }
    });

    const selectedNames = config.choices
      .filter((choice) => selectedSet.has(choice.value))
      .map((choice) => choice.label.primary);

    const stepIndex = step === 'intro' ? 1 : step === 'select' ? 2 : 3;
    const lines: string[] = [];
    lines.push(PALETTE.midGray(`Step ${stepIndex}/${totalSteps}`));
    lines.push('');

    if (step === 'intro') {
      const introHeadline = config.extendMode
        ? 'Extend your OpenSpec tooling'
        : 'Configure your OpenSpec tooling';
      const introBody = config.extendMode
        ? 'We detected an existing setup. We will help you refresh or add integrations.'
        : "Let's get your AI assistants connected so they understand OpenSpec.";

      lines.push(PALETTE.white(introHeadline));
      lines.push(PALETTE.midGray(introBody));
      lines.push('');
      lines.push(PALETTE.midGray('Press Enter to continue.'));
    } else if (step === 'select') {
      lines.push(PALETTE.white(config.baseMessage));
      lines.push(
        PALETTE.midGray(
          'Use ↑/↓ to move · Space to toggle · Enter to review selections.'
        )
      );
      lines.push('');
      lines.push(page);
      lines.push('');
      if (selectedNames.length === 0) {
        lines.push(
          `${PALETTE.midGray('Selected')}: ${PALETTE.midGray(
            'None selected yet'
          )}`
        );
      } else {
        lines.push(PALETTE.midGray('Selected:'));
        selectedNames.forEach((name) => {
          lines.push(`  ${PALETTE.white('-')} ${PALETTE.white(name)}`);
        });
      }
    } else {
      lines.push(PALETTE.white('Review selections'));
      lines.push(
        PALETTE.midGray('Press Enter to confirm or Backspace to adjust.')
      );
      lines.push('');

      if (selectedNames.length === 0) {
        lines.push(
          PALETTE.midGray('No tools selected. Press Backspace to return.')
        );
      } else {
        selectedNames.forEach((name) => {
          lines.push(`${PALETTE.white('▌')} ${PALETTE.white(name)}`);
        });
      }
    }

    if (error) {
      return [lines.join('\n'), chalk.red(error)];
    }

    return lines.join('\n');
  }
);

type InitCommandOptions = {
  prompt?: ToolSelectionPrompt;
};

export class InitCommand {
  private readonly prompt: ToolSelectionPrompt;

  constructor(options: InitCommandOptions = {}) {
    this.prompt = options.prompt ?? ((config) => toolSelectionWizard(config));
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    const openspecDir = OPENSPEC_DIR_NAME;
    const openspecPath = path.join(projectPath, openspecDir);

    // Validation happens silently in the background
    const extendMode = await this.validate(projectPath, openspecPath);
    const existingToolStates = await this.getExistingToolStates(projectPath);

    this.renderBanner(extendMode);

    // Get configuration (after validation to avoid prompts if validation fails)
    const config = await this.getConfiguration(existingToolStates, extendMode);

    if (config.aiTools.length === 0) {
      if (extendMode) {
        throw new Error(
          `OpenSpec seems to already be initialized at ${openspecPath}.\n` +
            `Use 'openspec update' to update the structure.`
        );
      }

      throw new Error('You must select at least one AI tool to configure.');
    }

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
          'ℹ OpenSpec already initialized. Skipping base scaffolding.'
        )
      );
    }

    // Step 2: Configure AI tools
    const toolSpinner = this.startSpinner('Configuring AI tools...');
    await this.configureAITools(projectPath, openspecDir, config.aiTools);
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
      extendMode
    );
  }

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

  private async getConfiguration(
    existingTools: Record<string, boolean>,
    extendMode: boolean
  ): Promise<OpenSpecConfig> {
    const selectedTools = await this.promptForAITools(
      existingTools,
      extendMode
    );
    return { aiTools: selectedTools };
  }

  private async promptForAITools(
    existingTools: Record<string, boolean>,
    extendMode: boolean
  ): Promise<string[]> {
    const availableTools = AI_TOOLS.filter((tool) => tool.available);

    if (availableTools.length === 0) {
      return [];
    }

    const baseMessage = extendMode
      ? 'Which AI tools would you like to add or refresh?'
      : 'Which AI tools do you use?';
    const initialSelected = extendMode
      ? availableTools
          .filter((tool) => existingTools[tool.value])
          .map((tool) => tool.value)
      : [];

    return this.prompt({
      extendMode,
      baseMessage,
      choices: availableTools.map((tool) => ({
        value: tool.value,
        label: parseToolLabel(tool.name),
        configured: Boolean(existingTools[tool.value]),
      })),
      initialSelected,
    });
  }

  private async getExistingToolStates(
    projectPath: string
  ): Promise<Record<string, boolean>> {
    const states: Record<string, boolean> = {};
    for (const tool of AI_TOOLS) {
      states[tool.value] = await this.isToolConfigured(projectPath, tool.value);
    }
    return states;
  }

  private async isToolConfigured(
    projectPath: string,
    toolId: string
  ): Promise<boolean> {
    const configFile = ToolRegistry.get(toolId)?.configFileName;
    if (
      configFile &&
      (await FileSystemUtils.fileExists(path.join(projectPath, configFile)))
    )
      return true;

    const slashConfigurator = SlashCommandRegistry.get(toolId);
    if (!slashConfigurator) return false;
    for (const target of slashConfigurator.getTargets()) {
      if (await FileSystemUtils.fileExists(path.join(projectPath, target.path)))
        return true;
    }
    return false;
  }

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
    const context: ProjectContext = {
      // Could be enhanced with prompts for project details
    };

    const templates = TemplateManager.getTemplates(context);

    for (const template of templates) {
      const filePath = path.join(openspecPath, template.path);
      const content =
        typeof template.content === 'function'
          ? template.content(context)
          : template.content;

      await FileSystemUtils.writeFile(filePath, content);
    }
  }

  private async configureAITools(
    projectPath: string,
    openspecDir: string,
    toolIds: string[]
  ): Promise<void> {
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
  }

  private displaySuccessMessage(
    selectedTools: AIToolOption[],
    created: AIToolOption[],
    refreshed: AIToolOption[],
    skippedExisting: AIToolOption[],
    skipped: AIToolOption[],
    extendMode: boolean
  ): void {
    console.log(); // Empty line for spacing
    const successHeadline = extendMode
      ? 'OpenSpec tool configuration updated!'
      : 'OpenSpec initialized successfully!';
    ora().succeed(PALETTE.white(successHeadline));

    console.log();
    console.log(PALETTE.lightGray('Tool summary:'));
    const summaryLines = [
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
  }

  private formatToolNames(tools: AIToolOption[]): string {
    const names = tools
      .map((tool) => tool.successLabel ?? tool.name)
      .filter((name): name is string => Boolean(name));

    if (names.length === 0) return PALETTE.lightGray('your AI assistant');
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
