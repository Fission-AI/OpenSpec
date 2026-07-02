/**
 * New Initiative Command
 *
 * Scaffolds an initiative folder in the resolved OpenSpec root (or a store via
 * `--store <id>`): an `initiative.yaml` manifest plus a `brief.md` stub. This
 * is a deliberately thin scaffold — a folder and a manifest — not a revival of
 * the removed heavyweight initiative command group.
 */

import { existsSync, promises as fs } from 'fs';
import path from 'path';
import ora from 'ora';

import { validateChangeName } from '../../utils/change-utils.js';
import {
  resolveRootForCommand,
  toRootOutput,
  withStoreFlag,
  type RootOutput,
} from '../../core/root-selection.js';
import { INITIATIVES_DIRNAME } from '../../core/initiatives.js';
import { printJson, statusFromError } from './shared.js';

export interface NewInitiativeOptions {
  title?: string;
  store?: string;
  storePath?: string;
  json?: boolean;
}

interface NewInitiativeOutput {
  initiative: {
    id: string;
    path: string;
    manifestPath: string;
    title: string;
  };
  root: RootOutput;
}

/** "smoother-setup" -> "Smoother setup". */
function titleFromId(id: string): string {
  const spaced = id.replace(/-/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function manifestContent(title: string): string {
  return (
    '# The initiative manifest: its title and the changes it groups.\n' +
    '# Status for these changes is rolled up live by `openspec list --initiatives`.\n' +
    `title: ${title}\n` +
    'changes: []\n'
  );
}

function briefContent(title: string): string {
  return (
    `# Initiative: ${title}\n\n` +
    '## What this is\n\n' +
    '<!-- The effort, in a sentence or two. -->\n\n' +
    '## Why these changes go together\n\n' +
    '<!-- What ties the work into one effort. -->\n\n' +
    '## The changes it groups\n\n' +
    'List change ids in `initiative.yaml`. See live status with ' +
    '`openspec list --initiatives`.\n'
  );
}

export async function newInitiativeCommand(
  name: string | undefined,
  options: NewInitiativeOptions
): Promise<void> {
  const spinner = options.json ? undefined : ora();

  try {
    if (!name) {
      throw new Error('Missing required argument <name>');
    }

    const validation = validateChangeName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const root = await resolveRootForCommand(options, {
      json: options.json,
      failurePayload: { initiative: null },
    });
    if (!root) {
      return;
    }

    const initiativeDir = path.join(
      root.path,
      'openspec',
      INITIATIVES_DIRNAME,
      name
    );

    if (existsSync(initiativeDir)) {
      throw new Error(
        `Initiative '${name}' already exists at ${initiativeDir}`
      );
    }

    const title = options.title ?? titleFromId(name);
    if (spinner) {
      spinner.start(`Creating initiative '${name}'...`);
    }

    await fs.mkdir(initiativeDir, { recursive: true });
    const manifestPath = path.join(initiativeDir, 'initiative.yaml');
    await fs.writeFile(manifestPath, manifestContent(title), 'utf-8');
    await fs.writeFile(
      path.join(initiativeDir, 'brief.md'),
      briefContent(title),
      'utf-8'
    );

    const payload: NewInitiativeOutput = {
      initiative: {
        id: name,
        path: initiativeDir,
        manifestPath,
        title,
      },
      root: toRootOutput(root),
    };

    if (options.json) {
      printJson(payload);
      return;
    }

    spinner?.stop();
    console.log(`Created initiative '${name}' at ${initiativeDir}/`);
    console.log(
      `Next: add change ids to ${path.join(name, 'initiative.yaml')}, then ` +
        withStoreFlag(root, 'openspec list --initiatives')
    );
  } catch (error) {
    spinner?.stop();
    if (options.json) {
      printJson({
        initiative: null,
        status: [statusFromError(error)],
      });
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}
