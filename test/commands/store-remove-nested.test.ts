import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getGlobalDataDir,
  getStoreMetadataPath,
  readStoreRegistryState,
  writeStoreMetadataState,
  writeStoreRegistryState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createHealthyOpenSpecRoot, isolatedGitEnv } from '../helpers/store-git.js';

/**
 * `store remove` deletes the store folder recursively. Another registered
 * store can live inside that folder, most naturally a shared store vendored as
 * a git submodule, and `store register` accepts that layout. Removing the
 * outer store must never delete the inner one or the uncommitted work in it,
 * and must never leave the registry pointing into a deleted folder.
 */
describe('store remove with another registered store inside the target', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-remove-nested-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  async function makeStore(relativePath: string, id: string): Promise<string> {
    const root = path.join(tempDir, relativePath);
    createHealthyOpenSpecRoot(root);
    await writeStoreMetadataState(root, { version: 1, id });
    return fs.realpathSync.native(root);
  }

  async function register(stores: Record<string, string>): Promise<void> {
    await writeStoreRegistryState(
      {
        version: 1,
        stores: Object.fromEntries(
          Object.entries(stores).map(([id, localPath]) => [
            id,
            { backend: { type: 'git' as const, local_path: localPath } },
          ])
        ),
      },
      { globalDataDir }
    );
  }

  /** Planning work that exists only on disk, never committed anywhere. */
  function writeDraft(storeRoot: string): string {
    const draft = path.join(storeRoot, 'openspec', 'changes', 'draft-idea', 'proposal.md');
    fs.mkdirSync(path.dirname(draft), { recursive: true });
    fs.writeFileSync(draft, '# Draft (uncommitted work)\n');
    return draft;
  }

  /** `team-plans` with `plat` registered inside it, as a vendored store would be. */
  async function nestedLayout(): Promise<{ teamPlans: string; plat: string; draft: string }> {
    const teamPlans = await makeStore(path.join('openspec', 'team-plans'), 'team-plans');
    const plat = await makeStore(path.join('openspec', 'team-plans', 'vendor', 'plat'), 'plat');
    await register({ plat, 'team-plans': teamPlans });
    return { teamPlans, plat, draft: writeDraft(plat) };
  }

  function remove(id: string, options: { json?: boolean } = { json: true }): Promise<RunCLIResult> {
    return runCLI(
      ['store', 'remove', id, '--yes', ...(options.json ? ['--json'] : [])],
      { cwd: tempDir, env }
    );
  }

  function parseJson(result: RunCLIResult): any {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(
        `Could not parse JSON.\nCommand: ${result.command}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\n${String(error)}`
      );
    }
  }

  async function registeredIds(): Promise<string[]> {
    const registry = await readStoreRegistryState({ globalDataDir });
    return Object.keys(registry?.stores ?? {}).sort();
  }

  it('control: removes the store when the other registered store is a sibling', async () => {
    const teamPlans = await makeStore(path.join('openspec', 'team-plans'), 'team-plans');
    const plat = await makeStore(path.join('work', 'plat'), 'plat');
    await register({ plat, 'team-plans': teamPlans });
    const draft = writeDraft(plat);

    const result = await remove('team-plans');

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).files).toEqual(
      expect.objectContaining({ deleted: true, deleted_path: teamPlans })
    );
    expect(fs.existsSync(teamPlans)).toBe(false);
    expect(fs.existsSync(draft)).toBe(true);
    expect(await registeredIds()).toEqual(['plat']);
  }, 30_000);

  it('refuses to delete a folder that contains another registered store', async () => {
    const { teamPlans, draft } = await nestedLayout();

    const result = await remove('team-plans');

    expect(result.exitCode).toBe(1);
    expect(fs.existsSync(draft)).toBe(true);
    expect(fs.existsSync(getStoreMetadataPath(teamPlans))).toBe(true);
    expect(await registeredIds()).toEqual(['plat', 'team-plans']);
  }, 30_000);

  it('names the nested store and the way out in the JSON refusal', async () => {
    const { plat } = await nestedLayout();

    const payload = parseJson(await remove('team-plans'));

    expect(payload.store).toBeNull();
    expect(payload.files).toBeNull();
    expect(payload.status).toHaveLength(1);
    const [diagnostic] = payload.status;
    expect(diagnostic).toEqual(
      expect.objectContaining({
        severity: 'error',
        code: 'store_remove_contains_registered_store',
        target: 'store.root',
      })
    );
    expect(diagnostic.message).toContain("'plat'");
    expect(diagnostic.message).toContain(plat);
    expect(diagnostic.fix).toContain('openspec store unregister plat');
  }, 30_000);

  it('prints the refusal in human mode and deletes nothing', async () => {
    const { draft } = await nestedLayout();

    const result = await remove('team-plans', { json: false });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("'plat'");
    expect(result.stderr).toContain('openspec store unregister plat');
    expect(fs.existsSync(draft)).toBe(true);
  }, 30_000);

  it('lists every nested store in the refusal', async () => {
    const teamPlans = await makeStore(path.join('openspec', 'team-plans'), 'team-plans');
    const plat = await makeStore(path.join('openspec', 'team-plans', 'vendor', 'plat'), 'plat');
    const docs = await makeStore(path.join('openspec', 'team-plans', 'vendor', 'docs'), 'docs');
    await register({ docs, plat, 'team-plans': teamPlans });

    const [diagnostic] = parseJson(await remove('team-plans')).status;

    expect(diagnostic.code).toBe('store_remove_contains_registered_store');
    expect(diagnostic.message).toContain("'docs'");
    expect(diagnostic.message).toContain("'plat'");
    expect(await registeredIds()).toEqual(['docs', 'plat', 'team-plans']);
  }, 30_000);

  it('does not treat a sibling that shares the name prefix as nested', async () => {
    const teamPlans = await makeStore(path.join('stores', 'team-plans'), 'team-plans');
    const archive = await makeStore(path.join('stores', 'team-plans-archive'), 'team-plans-archive');
    await register({ 'team-plans': teamPlans, 'team-plans-archive': archive });

    const result = await remove('team-plans');

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(teamPlans)).toBe(false);
    expect(fs.existsSync(getStoreMetadataPath(archive))).toBe(true);
  }, 30_000);

  it('refuses while a stale registration still points inside the folder', async () => {
    const teamPlans = await makeStore(path.join('openspec', 'team-plans'), 'team-plans');
    await register({
      plat: path.join(teamPlans, 'vendor', 'plat'),
      'team-plans': teamPlans,
    });

    const result = await remove('team-plans');

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0].code).toBe('store_remove_contains_registered_store');
    expect(fs.existsSync(teamPlans)).toBe(true);
  }, 30_000);

  it('removes the outer store once the nested store is unregistered', async () => {
    const { teamPlans, draft } = await nestedLayout();
    const unregister = await runCLI(['store', 'unregister', 'plat', '--json'], { cwd: tempDir, env });
    expect(unregister.exitCode).toBe(0);
    // Unregister forgets the registration and leaves the files alone.
    expect(fs.existsSync(draft)).toBe(true);

    const result = await remove('team-plans');

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(teamPlans)).toBe(false);
    expect(await registeredIds()).toEqual([]);
  }, 30_000);

  // Creating a directory symlink needs elevated rights on Windows.
  it.skipIf(process.platform === 'win32')(
    'finds a nested store registered through a symlinked path',
    async () => {
      const teamPlans = await makeStore(path.join('openspec', 'team-plans'), 'team-plans');
      await makeStore(path.join('openspec', 'team-plans', 'vendor', 'plat'), 'plat');
      const link = path.join(tempDir, 'team-plans-link');
      fs.symlinkSync(teamPlans, link, 'dir');
      await register({
        plat: path.join(link, 'vendor', 'plat'),
        'team-plans': teamPlans,
      });

      const result = await remove('team-plans');

      expect(result.exitCode).toBe(1);
      expect(parseJson(result).status[0].code).toBe('store_remove_contains_registered_store');
      expect(fs.existsSync(path.join(teamPlans, 'vendor', 'plat'))).toBe(true);
    },
    30_000
  );

  it('refuses a store vendored as a git submodule and keeps its uncommitted work', async () => {
    const gitEnv = { ...process.env, ...isolatedGitEnv(tempDir) };
    const git = (cwd: string, args: string[]) =>
      execFileSync('git', args, { cwd, env: gitEnv, stdio: 'pipe' });

    const upstream = await makeStore(path.join('upstream', 'plat'), 'plat');
    git(upstream, ['init', '-q']);
    git(upstream, ['add', '-A']);
    git(upstream, ['commit', '-qm', 'plat store']);

    const teamPlans = await makeStore(path.join('openspec', 'team-plans'), 'team-plans');
    git(teamPlans, ['init', '-q']);
    git(teamPlans, ['add', '-A']);
    git(teamPlans, ['commit', '-qm', 'team-plans store']);
    git(teamPlans, ['-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', upstream, 'vendor/plat']);
    git(teamPlans, ['commit', '-qm', 'vendor plat']);

    const plat = fs.realpathSync.native(path.join(teamPlans, 'vendor', 'plat'));
    await register({ plat, 'team-plans': teamPlans });
    const draft = writeDraft(plat);

    const result = await remove('team-plans');

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0].code).toBe('store_remove_contains_registered_store');
    expect(fs.existsSync(draft)).toBe(true);
    expect(await registeredIds()).toEqual(['plat', 'team-plans']);
  }, 30_000);
});
