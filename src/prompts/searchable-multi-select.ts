import chalk from 'chalk';

interface Choice {
  name: string;
  value: string;
  description?: string;
  configured?: boolean;
  detected?: boolean;
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
 * 创建可搜索的多选提示组件。
 * 使用动态导入以防止 pre-commit hook 挂起（参见 #367）。
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

    // 根据搜索过滤选项
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

      // Enter 键确认/提交
      if (isEnterKey(key)) {
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

      // 空格键切换选中状态
      if (key.name === 'space') {
        const choice = filteredChoices[cursor];
        if (choice) {
          if (selectedSet.has(choice.value)) {
            setSelectedValues(selectedValues.filter(v => v !== choice.value));
          } else {
            setSelectedValues([...selectedValues, choice.value]);
          }
        }
        return;
      }

      // Backspace 键删除选中项或搜索字符
      if (isBackspaceKey(key)) {
        if (searchText === '' && selectedValues.length > 0) {
          setSelectedValues(selectedValues.slice(0, -1));
        } else {
          setSearchText(searchText.slice(0, -1));
          setCursor(0);
        }
        return;
      }

      // 导航
      if (isUpKey(key)) {
        setCursor(Math.max(0, cursor - 1));
        return;
      }
      if (isDownKey(key)) {
        setCursor(Math.min(filteredChoices.length - 1, cursor + 1));
        return;
      }

      // 字符输入 - 处理可打印字符
      if (key.name && key.name.length === 1 && !key.ctrl) {
        setSearchText(searchText + key.name);
        setCursor(0);
      }
    });

    // 渲染完成状态
    if (status === 'done') {
      const names = selectedValues
        .map((v) => choiceMap.get(v)?.name ?? v)
        .join(', ');
      return `${prefix} ${chalk.bold(message)} ${chalk.cyan(names || '(无)')}`;
    }

    // 渲染活动状态
    const lines: string[] = [];
    lines.push(`${prefix} ${chalk.bold(message)}`);

    // 已选项标签
    const chips =
      selectedValues.length > 0
        ? selectedValues
            .map((v) => chalk.bgCyan.black(` ${choiceMap.get(v)?.name} `))
            .join(' ')
        : chalk.dim('(未选择)');
    lines.push(`  已选择: ${chips}`);

    // 搜索框
    lines.push(
      `  搜索: ${chalk.yellow('[')}${searchText || chalk.dim('输入以过滤')}${chalk.yellow(']')}`
    );

    // 操作提示
    lines.push(
      `  ${chalk.cyan('↑↓')} 导航 • ${chalk.cyan('Space')} 切换 • ${chalk.cyan('Backspace')} 删除 • ${chalk.cyan('Enter')} 确认`
    );

    // 列表
    if (filteredChoices.length === 0) {
      lines.push(chalk.yellow('  无匹配'));
    } else {
      // 计算分页
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
        const icon = selected ? chalk.green('[x]') : chalk.dim('[ ]');
        const arrow = isActive ? chalk.cyan('›') : ' ';
        const name = isActive ? chalk.cyan(item.name) : item.name;
        const isRefresh = selected && item.configured;
        const statusLabel = !selected
          ? item.configured
            ? ' (已配置)'
            : item.detected
              ? ' (已检测)'
              : ''
          : '';
        const suffix = selected
          ? chalk.dim(isRefresh ? ' (刷新)' : ' (已选中)')
          : chalk.dim(statusLabel);
        lines.push(`  ${arrow} ${icon} ${name}${suffix}`);
      }

      // 显示分页指示器（如需要）
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
 * 可搜索的多选提示组件，带有可见搜索框、
 * 已选项显示和直观的键盘导航。
 *
 * - 输入以过滤选项
 * - ↑↓ 键导航
 * - 空格键切换高亮项的选中状态
 * - Backspace 键删除最后选中项（或删除搜索字符）
 * - Enter 键确认选择
 */
export async function searchableMultiSelect(config: Config): Promise<string[]> {
  const prompt = await createSearchableMultiSelect();
  return prompt(config);
}

export default searchableMultiSelect;
