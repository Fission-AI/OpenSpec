/**
 * New Change Command
 *
 * Creates a new change directory with optional description and schema in the
 * resolved OpenSpec root. `--store <id>` selects a registered store's
 * root; initiative linking and workspace affected areas are no longer part of
 * this command.
 */

import ora from 'ora';
import { promises as fs } from 'fs';
import path from 'path';
import { createChange, validateChangeName } from '../../utils/change-utils.js';
import { validateDomainPath } from '../../utils/change-path.js';
import { isInteractive } from '../../utils/interactive.js';
import { formatChangeLocation } from '../../core/planning-home.js';
import {
  resolveRootForCommand,
  RootSelectionError,
  toPlanningHome,
  toRootOutput,
  withStoreFlag,
  type ResolvedOpenSpecRoot,
  type RootOutput,
  isStoreSelectedRoot,
} from '../../core/root-selection.js';
import { printJson, statusFromError, validateSchemaExists } from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface NewChangeOptions {
  description?: string;
  domain?: string;
  goal?: string;
  schema?: string;
  store?: string;
  storePath?: string;
  initiative?: string;
  areas?: string;
  json?: boolean;
}

interface NewChangeOutput {
  change: {
    id: string;
    path: string;
    metadataPath: string;
    schema: string;
  };
  root: RootOutput;
}

type DomainChoice =
  | { kind: 'existing'; segment: string }
  | { kind: 'here' }
  | { kind: 'new' };

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

function assertRemovedOptionsAbsent(options: NewChangeOptions): void {
  if (options.initiative !== undefined) {
    throw new RootSelectionError(
      '--initiative is no longer supported. Normal changes no longer attach to initiatives; --store <id> selects the OpenSpec root.',
      'initiative_option_removed',
      { target: 'change.options' }
    );
  }

  if (options.areas !== undefined) {
    throw new RootSelectionError(
      '--areas is no longer supported. Workspace affected areas are not part of the normal OpenSpec root path.',
      'areas_option_removed',
      { target: 'change.options' }
    );
  }
}

async function isChangeDirectory(directory: string): Promise<boolean> {
  for (const marker of ['.openspec.yaml', 'proposal.md']) {
    try {
      if ((await fs.stat(path.join(directory, marker))).isFile()) {
        return true;
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  return false;
}

async function listDomainChildren(
  changesDir: string,
  domain: string[]
): Promise<string[]> {
  const currentDir = path.join(changesDir, ...domain);
  let entries;
  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const children: string[] = [];
  for (const entry of entries) {
    if (
      !entry.isDirectory() ||
      entry.name.startsWith('.') ||
      (domain.length === 0 && entry.name === 'archive')
    ) {
      continue;
    }

    if (!(await isChangeDirectory(path.join(currentDir, entry.name)))) {
      children.push(entry.name);
    }
  }

  return children.sort((left, right) => left.localeCompare(right));
}

async function findExistingDomains(changesDir: string): Promise<string[]> {
  const domains: string[] = [];

  async function visit(domain: string[]): Promise<void> {
    for (const child of await listDomainChildren(changesDir, domain)) {
      const nested = [...domain, child];
      domains.push(nested.join('/'));
      await visit(nested);
    }
  }

  await visit([]);
  return domains;
}

function validateExplicitDomain(domain: string): string {
  const validation = validateDomainPath(domain);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  return domain;
}

function validateNewDomainSegment(segment: string): string | undefined {
  if (!segment || segment.includes('/') || segment.includes('\\')) {
    return 'Domain name must be a single path segment';
  }

  const validation = validateDomainPath(segment);
  return validation.valid ? undefined : validation.error;
}

async function promptForDomain(changesDir: string): Promise<string> {
  const { input, select } = await import('@inquirer/prompts');
  const domain: string[] = [];

  while (true) {
    const children = await listDomainChildren(changesDir, domain);
    const location = domain.length === 0 ? 'root' : domain.join('/');
    const choice = await select<DomainChoice>({
      message: `Select a domain (${location})`,
      choices: [
        ...children.map((segment) => ({
          name: segment,
          value: { kind: 'existing' as const, segment },
        })),
        { name: `Create here (${location})`, value: { kind: 'here' as const } },
        { name: 'New subdomain', value: { kind: 'new' as const } },
      ],
    });

    if (choice.kind === 'existing') {
      domain.push(choice.segment);
      continue;
    }

    if (choice.kind === 'here') {
      return domain.join('/');
    }

    while (true) {
      const segment = (await input({ message: 'New subdomain name' })).trim();
      const error = validateNewDomainSegment(segment);
      if (!error) {
        return [...domain, segment].join('/');
      }
      console.error(error);
    }
  }
}

async function domainRequiredError(changesDir: string): Promise<RootSelectionError> {
  const domains = await findExistingDomains(changesDir);
  const existing = domains.length > 0 ? domains.join(', ') : '(none)';
  const message = [
    'Domain selection is required.',
    'Use --domain <path> to create in a domain or --domain "" to create at the root.',
    `Existing domains in the selected root: ${existing}.`,
    'Domain casing is preserved, but collisions are possible on case-insensitive file systems.',
  ].join(' ');

  return new RootSelectionError(message, 'domain_required', {
    target: 'change.domain',
    fix: 'Pass --domain <path> or --domain "" explicitly.',
  });
}

function printCreatedChangeHuman(
  payload: NewChangeOutput,
  root: ResolvedOpenSpecRoot
): void {
  // A relative path is only honest when the root is where the user
  // stands; a distant ancestor root gets the absolute path.
  const location =
    !isStoreSelectedRoot(root) && root.path === process.cwd()
      ? formatChangeLocation(toPlanningHome(root), payload.change.id)
      : payload.change.path;
  console.log(`Created change '${payload.change.id}' at ${location}/`);
  console.log(`Schema: ${payload.change.schema}`);
  console.log(`Next: ${withStoreFlag(root, `openspec status --change ${payload.change.id}`)}`);
}

export async function newChangeCommand(name: string | undefined, options: NewChangeOptions): Promise<void> {
  const spinner = options.json ? undefined : ora();

  try {
    if (!name) {
      throw new Error('Missing required argument <name>');
    }

    const validation = validateChangeName(name);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    assertRemovedOptionsAbsent(options);

    const root = await resolveRootForCommand(options, {
      json: options.json,
      failurePayload: { change: null },
    });
    if (!root) {
      return;
    }

    const projectRoot = root.path;
    let domain: string;
    if (options.domain !== undefined) {
      domain = validateExplicitDomain(options.domain);
    } else if (!options.json && isInteractive()) {
      domain = await promptForDomain(root.changesDir);
    } else {
      throw await domainRequiredError(root.changesDir);
    }
    const changeId = domain ? `${domain}/${name}` : name;

    // Validate schema if provided
    if (options.schema) {
      validateSchemaExists(options.schema, projectRoot);
    }

    const resolvedSchema = options.schema ?? root.defaultSchema;
    if (spinner) {
      spinner.start(`Creating change '${changeId}' with schema '${resolvedSchema}'...`);
    }

    const result = await createChange(projectRoot, changeId, {
      schema: options.schema,
      defaultSchema: root.defaultSchema,
      changesDir: root.changesDir,
      metadata: {
        ...(options.goal ? { goal: options.goal } : {}),
      },
    });

    // If description provided, create README.md with description
    if (options.description) {
      const { promises: fs } = await import('fs');
      const readmePath = path.join(result.changeDir, 'README.md');
      await fs.writeFile(readmePath, `# ${name}\n\n${options.description}\n`, 'utf-8');
    }

    const payload: NewChangeOutput = {
      change: {
        id: changeId,
        path: result.changeDir,
        metadataPath: path.join(result.changeDir, '.openspec.yaml'),
        schema: result.schema,
      },
      root: toRootOutput(root),
    };

    if (options.json) {
      printJson(payload);
      return;
    }

    spinner?.stop();
    printCreatedChangeHuman(payload, root);
  } catch (error) {
    spinner?.stop();
    if (options.json) {
      printJson({
        change: null,
        status: [statusFromError(error)],
      });
      process.exitCode = 1;
      return;
    }
    throw error;
  }
}
