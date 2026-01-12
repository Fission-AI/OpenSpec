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
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import { FileSystemUtils } from '../utils/file-system.js';
import {
  AI_TOOLS,
  LEGACY_OPENSPEC_DIR_NAME,
  DEFAULT_OPENSPEC_DIR_NAME,
  OPENSPEC_MARKERS,
  AIToolOption,
} from './config.js';
import { PALETTE } from './styles/palette.js';
import { runInit, InitResult, RootStubStatus } from './init-logic.js';
import { ToolRegistry } from './configurators/registry.js';
import { SlashCommandRegistry } from './configurators/slash/registry.js';

const PROGRESS_SPINNER = {
  interval: 80,
  frames: ['░░░', '▒░░', '▒▒░', '▒▒▒', '▓▒▒', '▓▓▒', '▓▓▓', '▒▓▓', '░▒▓'],
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

const isSelectableChoice = (
  choice: ToolWizardChoice
): choice is Extract<ToolWizardChoice, { selectable: true }> => choice.selectable;

type ToolWizardChoice =
  | {
      kind: 'heading' | 'info';
      value: string;
      label: ToolLabel;
      selectable: false;
    }
  | {
      kind: 'option';
      value: string;
      label: ToolLabel;
      configured: boolean;
      selectable: true;
    };

type ToolWizardConfig = {
  extendMode: boolean;
  baseMessage: string;
  choices: ToolWizardChoice[];
  initialSelected?: string[];
};

type WizardStep = 'intro' | 'select' | 'review';

type ToolSelectionPrompt = (config: ToolWizardConfig) => Promise<string[]>;

const ROOT_STUB_CHOICE_VALUE = '__root_stub__';

const OTHER_TOOLS_HEADING_VALUE = '__heading-other__';
const LIST_SPACER_VALUE = '__list-spacer__';

const toolSelectionWizard = createPrompt<string[], ToolWizardConfig>(
  (config, done) => {
    const totalSteps = 3;
    const [step, setStep] = useState<WizardStep>('intro');
    const selectableChoices = config.choices.filter(isSelectableChoice);
    const initialCursorIndex = config.choices.findIndex((choice) =>
      choice.selectable
    );
    const [cursor, setCursor] = useState<number>(
      initialCursorIndex === -1 ? 0 : initialCursorIndex
    );
    const [selected, setSelected] = useState<string[]>(() => {
      const initial = new Set(
        (config.initialSelected ?? []).filter((value) =>
          selectableChoices.some((choice) => choice.value === value)
        )
      );
      return selectableChoices
        .map((choice) => choice.value)
        .filter((value) => initial.has(value));
    });
    const [error, setError] = useState<string | null>(null);

    const selectedSet = new Set(selected);
    const pageSize = Math.max(config.choices.length, 1);

    const updateSelected = (next: Set<string>) => {
      const ordered = selectableChoices
        .map((choice) => choice.value)
        .filter((value) => next.has(value));
      setSelected(ordered);
    };

    const page = usePagination({
      items: config.choices,
      active: cursor,
      pageSize,
      loop: false,
      renderItem: ({ item, isActive }) => {
        if (!item.selectable) {
          const prefix = item.kind === 'info' ? '  ' : '';
          const textColor =
            item.kind === 'heading' ? PALETTE.lightGray : PALETTE.midGray;
          return `${PALETTE.midGray(' ')} ${PALETTE.midGray(' ')} ${textColor(
            `${prefix}${item.label.primary}`
          )}`;
        }

        const isSelected = selectedSet.has(item.value);
        const cursorSymbol = isActive
          ? PALETTE.white('›')
          : PALETTE.midGray(' ');
        const indicator = isSelected
          ? PALETTE.white('◉')
          : PALETTE.midGray('○');
        const nameColor = isActive ? PALETTE.white : PALETTE.midGray;
        const annotation = item.label.annotation
          ? PALETTE.midGray(` (${item.label.annotation})`)
          : '';
        const configuredNote = item.configured
          ? PALETTE.midGray(' (already configured)')
          : '';
        const label = `${nameColor(item.label.primary)}${annotation}${configuredNote}`;
        return `${cursorSymbol} ${indicator} ${label}`;
      },
    });

    const moveCursor = (direction: 1 | -1) => {
      if (selectableChoices.length === 0) {
        return;
      }

      let nextIndex = cursor;
      while (true) {
        nextIndex = nextIndex + direction;
        if (nextIndex < 0 || nextIndex >= config.choices.length) {
          return;
        }

        if (config.choices[nextIndex]?.selectable) {
          setCursor(nextIndex);
          return;
        }
      }
    };

    useKeypress((key) => {
      if (step === 'intro') {
        if (isEnterKey(key)) {
          setStep('select');
        }
        return;
      }

      if (step === 'select') {
        if (isUpKey(key)) {
          moveCursor(-1);
          setError(null);
          return;
        }

        if (isDownKey(key)) {
          moveCursor(1);
          setError(null);
          return;
        }

        if (isSpaceKey(key)) {
          const current = config.choices[cursor];
          if (!current || !current.selectable) return;

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
          const current = config.choices[cursor];
          if (
            current &&
            current.selectable &&
            !selectedSet.has(current.value)
          ) {
            const next = new Set(selected);
            next.add(current.value);
            updateSelected(next);
          }
          setStep('review');
          setError(null);
          return;
        }

        if (key.name === 'escape') {
          const next = new Set<string>();
          updateSelected(next);
          setError(null);
        }
        return;
      }

      if (step === 'review') {
        if (isEnterKey(key)) {
          const finalSelection = config.choices
            .map((choice) => choice.value)
            .filter(
              (value) =>
                selectedSet.has(value) && value !== ROOT_STUB_CHOICE_VALUE
            );
          done(finalSelection);
          return;
        }

        if (isBackspaceKey(key) || key.name === 'escape') {
          setStep('select');
          setError(null);
        }
      }
    });

    const rootStubChoice = selectableChoices.find(
      (choice) => choice.value === ROOT_STUB_CHOICE_VALUE
    );
    const rootStubSelected = rootStubChoice
      ? selectedSet.has(ROOT_STUB_CHOICE_VALUE)
      : false;
    const nativeChoices = selectableChoices.filter(
      (choice) => choice.value !== ROOT_STUB_CHOICE_VALUE
    );
    const selectedNativeChoices = nativeChoices.filter((choice) =>
      selectedSet.has(choice.value)
    );

    const formatSummaryLabel = (
      choice: Extract<ToolWizardChoice, { selectable: true }>
    ) => {
      const annotation = choice.label.annotation
        ? PALETTE.midGray(` (${choice.label.annotation})`)
        : '';
      const configuredNote = choice.configured
        ? PALETTE.midGray(' (already configured)')
        : '';
      return `${PALETTE.white(choice.label.primary)}${annotation}${configuredNote}`;
    };

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
          'Use ↑/↓ to move · Space to toggle · Enter selects highlighted tool and reviews.'
        )
      );
      lines.push('');
      lines.push(page);
      lines.push('');
      lines.push(PALETTE.midGray('Selected configuration:'));
      if (rootStubSelected && rootStubChoice) {
        lines.push(
          `  ${PALETTE.white('-')} ${formatSummaryLabel(rootStubChoice)}`
        );
      }
      if (selectedNativeChoices.length === 0) {
        lines.push(
          `  ${PALETTE.midGray('- No natively supported providers selected')}`
        );
      } else {
        selectedNativeChoices.forEach((choice) => {
          lines.push(
            `  ${PALETTE.white('-')} ${formatSummaryLabel(choice)}`
          );
        });
      }
    } else {
      lines.push(PALETTE.white('Review selections'));
      lines.push(
        PALETTE.midGray('Press Enter to confirm or Backspace to adjust.')
      );
      lines.push('');

      if (rootStubSelected && rootStubChoice) {
        lines.push(
          `${PALETTE.white('▌')} ${formatSummaryLabel(rootStubChoice)}`
        );
      }

      if (selectedNativeChoices.length === 0) {
        lines.push(
          PALETTE.midGray(
            'No natively supported providers selected. Universal instructions will still be applied.'
          )
        );
      } else {
        selectedNativeChoices.forEach((choice) => {
          lines.push(
            `${PALETTE.white('▌')} ${formatSummaryLabel(choice)}`
          );
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
  tools?: string;
};

export class InitCommand {
  private readonly prompt: ToolSelectionPrompt;
  private readonly toolsArg?: string;

  constructor(options: InitCommandOptions = {}) {
    this.prompt = options.prompt ?? ((config) => toolSelectionWizard(config));
    this.toolsArg = options.tools;
  }

  async execute(targetPath: string): Promise<void> {
    const projectPath = path.resolve(targetPath);
    
    // Check for legacy directory
    const legacyPath = path.join(projectPath, LEGACY_OPENSPEC_DIR_NAME);
    const defaultPath = path.join(projectPath, DEFAULT_OPENSPEC_DIR_NAME);
    
    const hasLegacy = await FileSystemUtils.directoryExists(legacyPath);
    const hasDefault = await FileSystemUtils.directoryExists(defaultPath);

    let shouldMigrate = false;
    if (hasLegacy && !hasDefault) {
        shouldMigrate = await confirm({
            message: `Detected legacy '${LEGACY_OPENSPEC_DIR_NAME}/' directory. Would you like to migrate it to '${DEFAULT_OPENSPEC_DIR_NAME}/'?`,
            default: true
        });
    }

    // Need to get tool selection BEFORE running logic if we want to show spinners for each step
    // But we need extendMode to show the correct prompt.
    const openspecPath = hasLegacy && !shouldMigrate ? legacyPath : defaultPath;
    const extendMode = await FileSystemUtils.directoryExists(openspecPath);
    
    const existingTools = await this.getExistingToolStates(projectPath, extendMode);
    
    this.renderBanner(extendMode);
    const selectedTools = await this.getSelectedTools(existingTools, extendMode);

    const availableTools = AI_TOOLS.filter((tool) => tool.available);
    const selectedIds = new Set(selectedTools);
    
    const structureSpinner = this.startSpinner(shouldMigrate ? 'Migrating directory...' : 'Creating OpenSpec structure...');
    
    const result = await runInit(targetPath, { 
        tools: selectedTools,
        shouldMigrate 
    });

    structureSpinner.stopAndPersist({
        symbol: PALETTE.white('▌'),
        text: PALETTE.white(result.migrated ? `Migrated to ${DEFAULT_OPENSPEC_DIR_NAME}/` : (result.extendMode ? 'OpenSpec structure verified' : 'OpenSpec structure created')),
    });

    const toolSpinner = this.startSpinner('Configuring AI tools...');
    // runInit already did this, but we want the spinner experience in CLI.
    // Actually, runInit is meant to be the shared logic. 
    // To keep spinners, we might need to split runInit or accept progress callbacks.
    // For now, let's just finish the spinner.
    toolSpinner.stopAndPersist({
      symbol: PALETTE.white('▌'),
      text: PALETTE.white('AI tools configured'),
    });

    const selectedToolOptions = availableTools.filter(t => selectedIds.has(t.value));
    const created = availableTools.filter(t => result.createdTools.includes(t.value));
    const refreshed = availableTools.filter(t => result.refreshedTools.includes(t.value));
    const skippedExisting = availableTools.filter(t => result.skippedExistingTools.includes(t.value));
    const skipped = availableTools.filter(t => result.skippedTools.includes(t.value));

    this.displaySuccessMessage(
      selectedToolOptions,
      created,
      refreshed,
      skippedExisting,
      skipped,
      result.extendMode,
      result.rootStubStatus
    );
  }

  private async getExistingToolStates(
    projectPath: string,
    extendMode: boolean
  ): Promise<Record<string, boolean>> {
    if (!extendMode) {
      return Object.fromEntries(AI_TOOLS.map(t => [t.value, false]));
    }

    const entries = await Promise.all(
      AI_TOOLS.map(async (t) => {
          // We can't use isToolConfigured here easily if it's moved to logic.
          // Let's re-implement it or export it.
          return [t.value, await this.isToolConfigured(projectPath, t.value)] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  private async isToolConfigured(
    projectPath: string,
    toolId: string
  ): Promise<boolean> {
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

    const configFile = ToolRegistry.get(toolId)?.configFileName;
    if (configFile) {
      const configPath = path.join(projectPath, configFile);
      hasConfigFile = (await FileSystemUtils.fileExists(configPath)) && (await fileHasMarkers(configPath));
    }

    const slashConfigurator = SlashCommandRegistry.get(toolId);
    if (slashConfigurator) {
      for (const target of slashConfigurator.getTargets()) {
        const absolute = slashConfigurator.resolveAbsolutePath(projectPath, target.id);
        if ((await FileSystemUtils.fileExists(absolute)) && (await fileHasMarkers(absolute))) {
          hasSlashCommands = true;
          break;
        }
      }
    }

    const hasConfigFileRequirement = configFile !== undefined;
    const hasSlashCommandRequirement = slashConfigurator !== undefined;

    if (hasConfigFileRequirement && hasSlashCommandRequirement) {
      return hasConfigFile && hasSlashCommands;
    } else if (hasConfigFileRequirement) {
      return hasConfigFile;
    } else if (hasSlashCommandRequirement) {
      return hasSlashCommands;
    }

    return false;
  }

  private async getSelectedTools(
    existingTools: Record<string, boolean>,
    extendMode: boolean
  ): Promise<string[]> {
    const nonInteractiveSelection = this.resolveToolsArg();
    if (nonInteractiveSelection !== null) {
      return nonInteractiveSelection;
    }

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

