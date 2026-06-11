/**
 * The `repo` command group (slice 3.5): map target repo ids to local
 * checkout paths. Local machine settings, never shared planning state.
 * Mapping a repo never clones, syncs, or enforces edit boundaries.
 */
import * as path from 'node:path';
import { Command } from 'commander';

import {
  listRepoEntries,
  registerRepo,
  unregisterRepo,
} from '../core/store/registry.js';
import {
  getStoreRegistryPath,
  readStoreRegistryState,
} from '../core/store/foundation.js';
import { StoreError, type StoreDiagnostic } from '../core/store/errors.js';
import { emitFailure, printJson } from './shared-output.js';
import { COMMAND_REGISTRY } from '../core/completions/command-registry.js';

interface RepoOutput {
  id: string;
  path: string;
}

interface RepoRegisterOutput {
  repo: RepoOutput | null;
  registry: {
    path: string;
    registered: boolean;
    already_registered: boolean;
  } | null;
  status: StoreDiagnostic[];
}

interface RepoUnregisterOutput {
  repo: RepoOutput | null;
  registry: {
    path: string;
    removed: boolean;
  } | null;
  status: StoreDiagnostic[];
}

interface RepoListOutput {
  repos: RepoOutput[];
  status: StoreDiagnostic[];
}

interface RepoRegisterOptions {
  id?: string;
  json?: boolean;
}

class RepoCommand {
  async register(inputPath: string, options: RepoRegisterOptions = {}): Promise<void> {
    try {
      const resolvedPath = path.resolve(inputPath);
      const id = options.id ?? path.basename(resolvedPath);
      let result;
      try {
        result = await registerRepo({ id, path: resolvedPath });
      } catch (error) {
        // The user didn't choose a default folder-name id: when that is
        // what failed grammar, the fix names --id.
        if (
          options.id === undefined &&
          error instanceof StoreError &&
          error.diagnostic.code === 'invalid_repo_id'
        ) {
          throw new StoreError(error.message, 'invalid_repo_id', {
            target: 'repo.id',
            fix: 'Pass --id <kebab-case-id> to choose an id different from the folder name.',
          });
        }
        throw error;
      }

      const payload: RepoRegisterOutput = {
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
      emitFailure(options.json, { repo: null, registry: null }, error, 'repo_error');
    }
  }

  async unregister(id: string, options: { json?: boolean } = {}): Promise<void> {
    try {
      const removed = await unregisterRepo(id);

      const payload: RepoUnregisterOutput = {
        repo: { id: removed.id, path: removed.path },
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
      emitFailure(options.json, { repo: null, registry: null }, error, 'repo_error');
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
      emitFailure(options.json, { repos: [] }, error, 'repo_error');
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
