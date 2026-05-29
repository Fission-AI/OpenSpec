import chalk from 'chalk';

export const workspacePromptTheme = {
  prefix: '',
  style: {
    answer: (text: string) => chalk.cyan(text),
    defaultAnswer: (text: string) => chalk.dim(text),
    error: (text: string) => chalk.red(text),
    help: (text: string) => chalk.dim(text),
    highlight: (text: string) => chalk.cyan(text),
    key: (text: string) => chalk.cyan(text),
    message: (text: string) => chalk.bold(text),
  },
};

export const workspaceSelectTheme = {
  ...workspacePromptTheme,
  icon: {
    cursor: chalk.cyan('>'),
  },
  style: {
    ...workspacePromptTheme.style,
    keysHelpTip: (keys: [key: string, action: string][]) =>
      chalk.dim(keys.map(([key, action]) => `${key}: ${action}`).join(' | ')),
  },
};
