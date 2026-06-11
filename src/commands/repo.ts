/**
 * The `repo` command group (slice 3.5): map target repo ids to local
 * checkout paths. Local machine settings, never shared planning state.
 * Mapping a repo never clones, syncs, or enforces edit boundaries.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Command } from 'commander';

import {
  getRepoPath,
  listRepoEntries,
  registerRepo,
  unregisterRepo,
} from '../core/store/registry.js';
import {
  getStoreRegistryPath,
  readStoreRegistryState,
} from '../core/store/foundation.js';
import { StoreError, type StoreDiagnostic } from '../core/store/errors.js';
import { isKebabId } from '../core/id.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';

interface RepoOutput {
  id: string;
  path: string;
}

interface RepoMutationOutput {
  repo: RepoOutput | null;
  registry: {
    path: string;
    registered?: boolean;
    already_registered?: boolean;
    removed?: boolean;
  } | null;
  status: StoreDiagnostic[];
}

interface RepoListOutput {
  repos: RepoOutput[];
  status: StoreDiagnostic[];
}

function printJson(payload: unknown): void {
  console.log(JSON.stringify(payload, null, 2));
}

function asStatus(error: unknown): StoreDiagnostic {
  if (error instanceof StoreError) {
    return error.diagnostic;
  }
  return {
    severity: 'error',
    code: 'repo_error',
    message: error instanceof Error ? error.message : String(error),
  };
}

function handleFailure(json: boolean | undefined, payload: object, error: unknown): void {
  const status = asStatus(error);
  if (json) {
    printJson({ ...payload, status: [status] });
    process.exitCode = 1;
    return;
  }
  console.error(`Error: ${status.message}`);
  if (status.fix) {
    console.error(`Fix: ${status.fix}`);
  }
  process.exitCode = 1;
}

function validateRepoId(id: string, fromDefault: boolean): string {
  if (!isKebabId(id)) {
    throw new StoreError(
      `Repo id '${id}' must be kebab-case with lowercase letters, numbers, and single hyphen separators.`,
      'invalid_repo_id',
      {
        target: 'repo.id',
        fix: fromDefault
          ? 'Pass --id <kebab-case-id> to choose an id different from the folder name.'
          : 'Use kebab-case with lowercase letters, numbers, and single hyphen separators.',
      }
    );
  }
  return id;
}

interface RepoRegisterOptions {
  id?: string;
  json?: boolean;
}

class RepoCommand {
  async register(inputPath: string, options: RepoRegisterOptions = {}): Promise<void> {
    try {
      const resolvedPath = path.resolve(inputPath);
      if (!fs.existsSync(resolvedPath)) {
        throw new StoreError(`Repo path does not exist: ${resolvedPath}`, 'repo_path_missing', {
          target: 'repo.root',
          fix: 'Pass the path of an existing checkout.',
        });
      }
      if (!fs.statSync(resolvedPath).isDirectory()) {
        throw new StoreError(
          `Repo path is not a directory: ${resolvedPath}`,
          'repo_path_not_directory',
          { target: 'repo.root', fix: 'Pass an existing checkout directory.' }
        );
      }

      const id = validateRepoId(
        options.id ?? path.basename(resolvedPath),
        options.id === undefined
      );
      const result = await registerRepo({ id, path: resolvedPath });

      const payload: RepoMutationOutput = {
        repo: { id: result.id, path: result.path },
        registry: {
          path: getStoreRegistryPath(),
          registered: result.registered,
          already_registered: result.alreadyRegistered,
        },
        status: [],
      };

      if (options.json) {
        printJson(payload);
        return;
      }
      console.log(`Repo ${result.alreadyRegistered ? 'already registered' : 'registered'}: ${result.id}`);
      console.log(`Location: ${result.path}`);
    } catch (error) {
      handleFailure(options.json, { repo: null, registry: null }, error);
    }
  }

  async unregister(id: string, options: { json?: boolean } = {}): Promise<void> {
    try {
      // getRepoPath is the id-level accessor (4.1's entry point too);
      // unregisterRepo re-validates under the registry lock.
      const knownPath = await getRepoPath(id);
      const removed = await unregisterRepo(id);

      const payload: RepoMutationOutput = {
        repo: { id: removed.id, path: knownPath ?? removed.path },
        registry: { path: getStoreRegistryPath(), removed: true },
        status: [],
      };

      if (options.json) {
        printJson(payload);
        return;
      }
      console.log(`Repo unregistered: ${removed.id}`);
      console.log(`Location (untouched): ${removed.path}`);
    } catch (error) {
      handleFailure(options.json, { repo: null, registry: null }, error);
    }
  }

  async list(options: { json?: boolean } = {}): Promise<void> {
    try {
      const registry = await readStoreRegistryState();
      const repos = listRepoEntries(registry);

      const payload: RepoListOutput = {
        repos,
        status: [],
      };

      if (options.json) {
        printJson(payload);
        return;
      }
      if (repos.length === 0) {
        console.log('No repos registered.');
        return;
      }
      for (const entry of repos) {
        console.log(`${entry.id}  ${entry.path}`);
      }
    } catch (error) {
      handleFailure(options.json, { repos: [] }, error);
    }
  }
}

export function registerRepoCommand(program: Command): void {
  const repoCommand = new RepoCommand();
  const groupDescription =
    COMMAND_REGISTRY.find((entry) => entry.name === 'repo')?.description ??
    'Map target repo ids to local checkout paths on this machine';
  const repo = program.command('repo').description(groupDescription);

  repo
    .command('register <path>')
    .description('Map a target repo id to an existing local checkout')
    .option('--id <id>', 'Repo id (defaults to the folder name)')
    .option('--json', 'Output as JSON')
    .action(async (inputPath: string, options: RepoRegisterOptions) => {
      await repoCommand.register(inputPath, options);
    });

  repo
    .command('unregister <id>')
    .description('Forget a repo mapping (never touches the checkout)')
    .option('--json', 'Output as JSON')
    .action(async (id: string, options: { json?: boolean }) => {
      await repoCommand.unregister(id, options);
    });

  repo
    .command('list')
    .description('Show mapped repo ids and their local paths')
    .option('--json', 'Output as JSON')
    .action(async (options: { json?: boolean }) => {
      await repoCommand.list(options);
    });
}
