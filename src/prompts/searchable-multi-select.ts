import chalk from 'chalk';

interface Choice {
  name: string;
  value: string;
  description?: string;
  configured?: boolean;
  configuredLabel?: string;
  preSelected?: boolean;
}

interface Config {
  message: string;
  choices: Choice[];
  pageSize?: number;
  validate?: (selected: string[]) => boolean | string;
}

/**
 * Create the searchable multi-select prompt.
 * Uses dynamic import to prevent pre-commit hook hangs (see #367).
 */
async function createSearchableMultiSelect(): Promise<
  (config: Config) => Promise<string[]>
> {
  const {
    createPrompt,
    useState,
    useKeypress,
    useMemo,
    usePrefix,
    isEnterKey,
    isBackspaceKey,
    isUpKey,
    isDownKey,
  } = await import('@inquirer/core');

  return createPrompt((config: Config, done: (value: string[]) => void): string => {
    const { message, choices, pageSize = 15, validate } = config;

    const [searchText, setSearchText] = useState('');
    const [selectedValues, setSelectedValues] = useState<string[]>(
      () => choices.filter(c => c.preSelected).map(c => c.value)
    );
    const [cursor, setCursor] = useState(0);
    const [status, setStatus] = useState<'idle' | 'done'>('idle');
    const [error, setError] = useState<string | null>(null);

    const prefix = usePrefix({ status });

    // Filter choices by search
    const filteredChoices = useMemo(() => {
      if (!searchText.trim()) return choices;
      const term = searchText.toLowerCase();
      return choices.filter(
        (c) =>
          c.name.toLowerCase().includes(term) ||
          c.value.toLowerCase().includes(term)
      );
    }, [searchText, choices]);

    const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues]);
    const choiceMap = useMemo(
      () => new Map(choices.map((c) => [c.value, c])),
      [choices]
    );

    useKeypress((key) => {
      if (status === 'done') return;

      // Tab to confirm
      if (key.name === 'tab') {
        if (validate) {
          const result = validate(selectedValues);
          if (result !== true) {
            setError(typeof result === 'string' ? result : 'Invalid');
            return;
          }
        }
        setStatus('done');
        done(selectedValues);
        return;
      }

      // Enter to add item
      if (isEnterKey(key)) {
        const choice = filteredChoices[cursor];
        if (choice && !selectedSet.has(choice.value)) {
          setSelectedValues([...selectedValues, choice.value]);
          setSearchText('');
          setCursor(0);
        }
        return;
      }

      // Backspace to remove or delete search char
      if (isBackspaceKey(key)) {
        if (searchText === '' && selectedValues.length > 0) {
          setSelectedValues(selectedValues.slice(0, -1));
        } else {
          setSearchText(searchText.slice(0, -1));
          setCursor(0);
        }
        return;
      }

      // Navigation
      if (isUpKey(key)) {
        setCursor(Math.max(0, cursor - 1));
        return;
      }
      if (isDownKey(key)) {
        setCursor(Math.min(filteredChoices.length - 1, cursor + 1));
        return;
      }

      // Character input - handle printable characters
      if (key.name && key.name.length === 1 && !key.ctrl) {
        setSearchText(searchText + key.name);
        setCursor(0);
      }
    });

    // Render done state
    if (status === 'done') {
      const names = selectedValues
        .map((v) => choiceMap.get(v)?.name ?? v)
        .join(', ');
      return `${prefix} ${chalk.bold(message)} ${chalk.cyan(names || '(none)')}`;
    }

    // Render active state
    const lines: string[] = [];
    lines.push(`${prefix} ${chalk.bold(message)}`);

    // Selected chips
    const chips =
      selectedValues.length > 0
        ? selectedValues
            .map((v) => chalk.bgCyan.black(` ${choiceMap.get(v)?.name} `))
            .join(' ')
        : chalk.dim('(none selected)');
    lines.push(`  Selected: ${chips}`);

    // Search box
    lines.push(
      `  Search: ${chalk.yellow('[')}${searchText || chalk.dim('type to filter')}${chalk.yellow(']')}`
    );

    // Instructions
    lines.push(
      `  ${chalk.cyan('↑↓')} navigate • ${chalk.cyan('Enter')} add • ${chalk.cyan('Backspace')} remove • ${chalk.cyan('Tab')} confirm`
    );

    // List
    if (filteredChoices.length === 0) {
      lines.push(chalk.yellow('  No matches'));
    } else {
      // Calculate pagination
      const startIndex = Math.max(
        0,
        Math.min(cursor - Math.floor(pageSize / 2), filteredChoices.length - pageSize)
      );
      const endIndex = Math.min(startIndex + pageSize, filteredChoices.length);
      const visibleChoices = filteredChoices.slice(startIndex, endIndex);

      for (let i = 0; i < visibleChoices.length; i++) {
        const item = visibleChoices[i];
        const actualIndex = startIndex + i;
        const isActive = actualIndex === cursor;
        const selected = selectedSet.has(item.value);
        const icon = selected ? chalk.green('◉') : chalk.dim('○');
        const arrow = isActive ? chalk.cyan('›') : ' ';
        const name = isActive ? chalk.cyan(item.name) : item.name;
        const isRefresh = selected && item.configured;
        const suffix = selected
          ? chalk.dim(isRefresh ? ' (refresh)' : ' (selected)')
          : '';
        lines.push(`  ${arrow} ${icon} ${name}${suffix}`);
      }

      // Show pagination indicator if needed
      if (filteredChoices.length > pageSize) {
        const currentPage = Math.floor(cursor / pageSize) + 1;
        const totalPages = Math.ceil(filteredChoices.length / pageSize);
        lines.push(chalk.dim(`  (${currentPage}/${totalPages})`));
      }
    }

    if (error) lines.push(chalk.red(`  ${error}`));
    return lines.join('\n');
  });
}

/**
 * A searchable multi-select prompt with visible search box,
 * selected items display, and intuitive keyboard navigation.
 *
 * - Type to filter choices
 * - ↑↓ to navigate
 * - Enter to add highlighted item
 * - Backspace to remove last selected item (or delete search char)
 * - Tab to confirm selections
 */
export async function searchableMultiSelect(config: Config): Promise<string[]> {
  const prompt = await createSearchableMultiSelect();
  return prompt(config);
}

export default searchableMultiSelect;
