import chalk from 'chalk';
import * as nodeFs from 'node:fs';
import * as path from 'node:path';

import {
  inferLinkName,
  resolveExistingDirectory,
  validateLinkNameForCommand,
} from './operations.js';
import { workspacePromptTheme, workspaceSelectTheme } from './prompt-theme.js';
import { asErrorMessage } from './types.js';

const fs = nodeFs;

export interface PromptSetupLinksOptions {
  heading?: string;
  intro?: string;
  allowEmpty?: boolean;
  emptyName?: string;
  emptyShort?: string;
  emptyDescription?: string;
  finishName?: string;
  finishShort?: string;
  finishDescription?: string;
}

type LinkPromptAction = 'finish' | 'add';

async function promptExistingPath(message: string, defaultPath?: string): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  const pathInput = await input({
    message,
    default: defaultPath,
    prefill: defaultPath ? 'editable' : undefined,
    required: true,
    theme: workspacePromptTheme,
    validate(value: string) {
      const resolvedPath = path.isAbsolute(value)
        ? path.resolve(value)
        : path.resolve(process.cwd(), value);
      return fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()
        ? true
        : 'Enter an existing repo or folder path.';
    },
  });

  return resolveExistingDirectory(pathInput);
}

async function promptLinkName(existingLinks: Record<string, string>): Promise<string> {
  const { input } = await import('@inquirer/prompts');

  return input({
    message: 'Link name:',
    required: true,
    theme: workspacePromptTheme,
    validate(value: string) {
      try {
        validateLinkNameForCommand(value);
      } catch (error) {
        return asErrorMessage(error);
      }

      if (existingLinks[value]) {
        return `Link name '${value}' is already linked to ${existingLinks[value]}.`;
      }

      return true;
    },
  });
}

export async function promptSetupLinks(
  options: PromptSetupLinksOptions = {}
): Promise<Record<string, string>> {
  const { select } = await import('@inquirer/prompts');
  const links: Record<string, string> = {};
  const heading = options.heading ?? '[2/5] Link repos or folders';
  const intro = options.intro ?? 'Start with the current directory, or enter another repo path.';

  console.log('');
  console.log(chalk.bold(heading));
  console.log(chalk.dim(intro));
  console.log('');

  while (true) {
    const linkCount = Object.keys(links).length;
    if (linkCount === 0 && options.allowEmpty) {
      const firstAction = await select<LinkPromptAction>({
        message: 'Continue',
        default: 'finish',
        choices: [
          {
            name: options.emptyName ?? options.finishName ?? 'Create workspace files',
            short: options.emptyShort ?? options.finishShort ?? 'Create workspace files',
            value: 'finish',
            description: options.emptyDescription ?? 'Create the workspace without linked repos or folders',
          },
          {
            name: 'Add a repo or folder',
            short: 'Add repo',
            value: 'add',
            description: 'Include local implementation context in this workspace',
          },
        ],
        theme: workspaceSelectTheme,
      });

      if (firstAction === 'finish') {
        return links;
      }
    }

    const resolvedPath = await promptExistingPath(
      linkCount === 0 ? 'Repo or folder path:' : 'Another repo or folder path:',
      linkCount === 0 ? '.' : undefined
    );
    let linkName = inferLinkName(resolvedPath);

    try {
      validateLinkNameForCommand(linkName);
    } catch {
      linkName = await promptLinkName(links);
    }

    if (links[linkName]) {
      console.log(`Link name '${linkName}' is already linked to ${links[linkName]}.`);
      linkName = await promptLinkName(links);
    }

    links[linkName] = resolvedPath;
    console.log(chalk.green(`Added link '${linkName}'`));
    console.log(chalk.dim(`  ${resolvedPath}`));

    const nextAction = await select<LinkPromptAction>({
      message: 'Continue',
      default: 'finish',
      choices: [
        {
          name: options.finishName ?? 'Create workspace files',
          short: options.finishShort ?? 'Create workspace files',
          value: 'finish',
          description: options.finishDescription ?? 'Run a workspace check after setup',
        },
        {
          name: 'Add another repo or folder',
          short: 'Add another',
          value: 'add',
          description: 'Include another local directory in this workspace',
        },
      ],
      theme: workspaceSelectTheme,
    });

    if (nextAction === 'finish') {
      return links;
    }
  }
}
