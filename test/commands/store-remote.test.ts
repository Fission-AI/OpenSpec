import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getGlobalDataDir,
  readStoreRegistryState,
  parseStoreMetadataState,
  serializeStoreMetadataState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createHealthyOpenSpecRoot, isolatedGitEnv } from '../helpers/store-git.js';

const TEST_NET_URL = 'https://192.0.2.1/acme/team-context.git';

describe('store canonical remote (3.3)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-remote-'));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
      ...isolatedGitEnv(tempDir),
    };
    globalDataDir = getGlobalDataDir({ env });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function git(cwd: string, ...args: string[]): string {
    return execFileSync('git', args, { cwd, env: { ...process.env, ...env }, encoding: 'utf-8' });
  }

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  async function registryRemote(id: string): Promise<string | undefined> {
    const registry = await readStoreRegistryState({ globalDataDir });
    const entry = registry?.stores?.[id];
    return entry && entry.backend.type === 'git' ? entry.backend.remote : undefined;
  }

  describe('metadata round-trip', () => {
    it('serializes and parses the optional remote', () => {
      const withRemote = serializeStoreMetadataState({
        version: 1,
        id: 'team-context',
        remote: TEST_NET_URL,
      });
      expect(withRemote).toContain(`remote: ${TEST_NET_URL}`);
      expect(parseStoreMetadataState(withRemote)).toEqual({
        version: 1,
        id: 'team-context',
        remote: TEST_NET_URL,
      });

      const without = serializeStoreMetadataState({ version: 1, id: 'team-context' });
      expect(without).not.toContain('remote');
      expect(parseStoreMetadataState(without)).toEqual({ version: 1, id: 'team-context' });
    });

    it('keeps strictness: pre-3.3 files parse, unknown keys and empty remotes fail', () => {
      expect(parseStoreMetadataState('version: 1\nid: old-context\n')).toEqual({
        version: 1,
        id: 'old-context',
      });
      expect(() => parseStoreMetadataState('version: 1\nid: x\nremot: typo\n')).toThrow();
      expect(() => parseStoreMetadataState('version: 1\nid: x\nremote: ""\n')).toThrow();
    });
  });

  describe('setup', () => {
    it('records --remote in store.yaml inside the initial commit', async () => {
      const storeRoot = path.join(tempDir, 'team-context');
      const result = await runCLI(
        ['store', 'setup', 'team-context', '--path', storeRoot, '--remote', TEST_NET_URL, '--json'],
        { cwd: tempDir, env }
      );
      expect(result.exitCode).toBe(0);

      const committed = git(storeRoot, 'show', 'HEAD:.openspec-store/store.yaml');
      expect(committed).toContain(`remote: ${TEST_NET_URL}`);
      expect(committed).toBe(
        fs.readFileSync(path.join(storeRoot, '.openspec-store', 'store.yaml'), 'utf-8')
      );
      // Setup observes no origin on a fresh init.
      expect(await registryRemote('team-context')).toBeUndefined();
    });

    it('fails on an empty --remote before creating anything', async () => {
      const storeRoot = path.join(tempDir, 'empty-remote');
      const result = await runCLI(
        ['store', 'setup', 'empty-remote', '--path', storeRoot, '--remote', '', '--json'],
        { cwd: tempDir, env }
      );
      expect(result.exitCode).toBe(1);
      expect(fs.existsSync(storeRoot)).toBe(false);
    });

    it('refuses --remote when store.yaml already exists, naming the hand-edit', async () => {
      const storeRoot = path.join(tempDir, 'retrofit-context');
      await runCLI(['store', 'setup', 'retrofit-context', '--path', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });
      const before = fs.readFileSync(path.join(storeRoot, '.openspec-store', 'store.yaml'), 'utf-8');

      const result = await runCLI(
        ['store', 'setup', 'retrofit-context', '--path', storeRoot, '--remote', TEST_NET_URL, '--json'],
        { cwd: tempDir, env }
      );
      expect(result.exitCode).toBe(1);
      const status = parseJson(result).status;
      expect(status[0].code).toBe('store_remote_requires_hand_edit');
      expect(status[0].fix).toContain(path.join('.openspec-store', 'store.yaml'));
      expect(fs.readFileSync(path.join(storeRoot, '.openspec-store', 'store.yaml'), 'utf-8')).toBe(
        before
      );
    });

    it('produces byte-identical store.yaml without --remote', async () => {
      const storeRoot = path.join(tempDir, 'plain-context');
      await runCLI(['store', 'setup', 'plain-context', '--path', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(
        fs.readFileSync(path.join(storeRoot, '.openspec-store', 'store.yaml'), 'utf-8')
      ).toBe('version: 1\nid: plain-context\n');
    });

    it('records the remote without a commit under --no-init-git', async () => {
      const storeRoot = path.join(tempDir, 'no-git-context');
      const result = await runCLI(
        [
          'store', 'setup', 'no-git-context', '--path', storeRoot,
          '--remote', TEST_NET_URL, '--no-init-git', '--json',
        ],
        { cwd: tempDir, env }
      );
      expect(result.exitCode).toBe(0);
      expect(
        fs.readFileSync(path.join(storeRoot, '.openspec-store', 'store.yaml'), 'utf-8')
      ).toContain(`remote: ${TEST_NET_URL}`);
      expect(fs.existsSync(path.join(storeRoot, '.git'))).toBe(false);
    });

    it('prints the canonical remote in the sharing guidance', async () => {
      const storeRoot = path.join(tempDir, 'shared-context');
      const result = await runCLI(
        ['store', 'setup', 'shared-context', '--path', storeRoot, '--remote', TEST_NET_URL],
        { cwd: tempDir, env }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`Share it: teammates clone ${TEST_NET_URL}`);
    });
  });

  describe('register', () => {
    function makeUnregisteredStore(name: string, options: { origin?: string; metadataRemote?: string } = {}): string {
      const storeRoot = path.join(tempDir, name);
      createHealthyOpenSpecRoot(storeRoot);
      fs.mkdirSync(path.join(storeRoot, '.openspec-store'), { recursive: true });
      fs.writeFileSync(
        path.join(storeRoot, '.openspec-store', 'store.yaml'),
        `version: 1\nid: ${name}\n` +
          (options.metadataRemote ? `remote: ${options.metadataRemote}\n` : '')
      );
      git(storeRoot, 'init');
      if (options.origin) {
        git(storeRoot, 'remote', 'add', 'origin', options.origin);
      }
      git(storeRoot, 'add', '-A');
      git(storeRoot, 'commit', '-m', 'init');
      return storeRoot;
    }

    it('records the observed origin read-only and refreshes on re-register', async () => {
      const storeRoot = makeUnregisteredStore('cloned-context', { origin: TEST_NET_URL });
      const metadataBefore = fs.readFileSync(
        path.join(storeRoot, '.openspec-store', 'store.yaml'),
        'utf-8'
      );
      const headBefore = git(storeRoot, 'rev-parse', 'HEAD').trim();

      const result = await runCLI(['store', 'register', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(result.exitCode).toBe(0);
      expect(await registryRemote('cloned-context')).toBe(TEST_NET_URL);
      // Read-only: no metadata change, no commit.
      expect(
        fs.readFileSync(path.join(storeRoot, '.openspec-store', 'store.yaml'), 'utf-8')
      ).toBe(metadataBefore);
      expect(git(storeRoot, 'rev-parse', 'HEAD').trim()).toBe(headBefore);

      // No-op rerun preserves the remote.
      const rerun = await runCLI(['store', 'register', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(rerun).registry.already_registered).toBe(true);
      expect(await registryRemote('cloned-context')).toBe(TEST_NET_URL);

      // Origin change + re-register refreshes the record.
      git(storeRoot, 'remote', 'set-url', 'origin', 'https://192.0.2.2/moved.git');
      await runCLI(['store', 'register', storeRoot, '--json'], { cwd: tempDir, env });
      expect(await registryRemote('cloned-context')).toBe('https://192.0.2.2/moved.git');
    });

    it('leaves the registry remote unset without an origin', async () => {
      const storeRoot = makeUnregisteredStore('local-only-context');
      await runCLI(['store', 'register', storeRoot, '--json'], { cwd: tempDir, env });
      expect(await registryRemote('local-only-context')).toBeUndefined();
    });

    it('keeps conversion-created metadata remote-free', async () => {
      const storeRoot = path.join(tempDir, 'convert-context');
      createHealthyOpenSpecRoot(storeRoot);
      git(storeRoot, 'init');
      git(storeRoot, 'remote', 'add', 'origin', TEST_NET_URL);
      git(storeRoot, 'add', '-A');
      git(storeRoot, 'commit', '-m', 'init');

      const result = await runCLI(['store', 'register', storeRoot, '--yes', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(result.exitCode).toBe(0);
      expect(
        fs.readFileSync(path.join(storeRoot, '.openspec-store', 'store.yaml'), 'utf-8')
      ).toBe('version: 1\nid: convert-context\n');
      expect(await registryRemote('convert-context')).toBe(TEST_NET_URL);
    });

    it('falls back to the observed origin in sharing guidance', async () => {
      const storeRoot = makeUnregisteredStore('origin-only-context', { origin: TEST_NET_URL });
      const result = await runCLI(['store', 'register', storeRoot], { cwd: tempDir, env });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain(`Share it: teammates clone ${TEST_NET_URL}`);
    });

    it('prefers the canonical remote over the origin in sharing guidance', async () => {
      const canonical = 'https://192.0.2.9/canonical.git';
      const storeRoot = makeUnregisteredStore('canon-context', {
        origin: TEST_NET_URL,
        metadataRemote: canonical,
      });
      const result = await runCLI(['store', 'register', storeRoot], { cwd: tempDir, env });
      expect(result.stdout).toContain(`Share it: teammates clone ${canonical}`);
    });
  });

  describe('rerun and refresh reporting', () => {
    it('keeps setup reruns as no-ops that preserve the observed remote', async () => {
      // Build a store whose checkout has an origin, register it via
      // setup, then rerun setup: the registry remote must survive and
      // the rerun must report already_registered.
      const storeRoot = path.join(tempDir, 'rerun-context');
      createHealthyOpenSpecRoot(storeRoot);
      git(storeRoot, 'init');
      git(storeRoot, 'remote', 'add', 'origin', TEST_NET_URL);
      git(storeRoot, 'add', '-A');
      git(storeRoot, 'commit', '-m', 'init');

      const first = await runCLI(
        ['store', 'setup', 'rerun-context', '--path', storeRoot, '--json'],
        { cwd: tempDir, env }
      );
      expect(first.exitCode).toBe(0);
      expect(await registryRemote('rerun-context')).toBe(TEST_NET_URL);

      const rerun = await runCLI(
        ['store', 'setup', 'rerun-context', '--path', storeRoot, '--json'],
        { cwd: tempDir, env }
      );
      expect(rerun.exitCode).toBe(0);
      expect(parseJson(rerun).registry.already_registered).toBe(true);
      expect(await registryRemote('rerun-context')).toBe(TEST_NET_URL);
    });

    it('reports already_registered when a later origin merely backfills the record', async () => {
      // Register before any origin exists, follow the product's own
      // sharing guidance (add a remote), rerun: the entry refreshes but
      // the user still sees a rerun, not a fresh registration.
      const storeRoot = path.join(tempDir, 'backfill-context');
      await runCLI(['store', 'setup', 'backfill-context', '--path', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(await registryRemote('backfill-context')).toBeUndefined();

      git(storeRoot, 'remote', 'add', 'origin', TEST_NET_URL);
      const rerun = await runCLI(
        ['store', 'setup', 'backfill-context', '--path', storeRoot, '--json'],
        { cwd: tempDir, env }
      );
      expect(rerun.exitCode).toBe(0);
      expect(parseJson(rerun).registry.already_registered).toBe(true);
      expect(await registryRemote('backfill-context')).toBe(TEST_NET_URL);
    });

    it('never records an enclosing repo origin for a non-repo store folder', async () => {
      // git -C walks up: a store folder nested in another repo must not
      // inherit that repo's origin into the registry.
      const outerRepo = path.join(tempDir, 'monorepo');
      fs.mkdirSync(outerRepo, { recursive: true });
      git(outerRepo, 'init');
      git(outerRepo, 'remote', 'add', 'origin', 'https://192.0.2.7/monorepo.git');

      const storeRoot = path.join(outerRepo, 'team-specs');
      createHealthyOpenSpecRoot(storeRoot);
      fs.mkdirSync(path.join(storeRoot, '.openspec-store'), { recursive: true });
      fs.writeFileSync(
        path.join(storeRoot, '.openspec-store', 'store.yaml'),
        'version: 1\nid: team-specs\n'
      );

      const result = await runCLI(['store', 'register', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(result.exitCode).toBe(0);
      expect(await registryRemote('team-specs')).toBeUndefined();
      const human = await runCLI(['store', 'register', storeRoot], { cwd: tempDir, env });
      expect(human.stdout).not.toContain('192.0.2.7');
    });
  });

  describe('onboarding end to end', () => {
    it('executes the printed clone fix verbatim and continues to a resolved index', async () => {
      // A scratch HOME keeps the rendered <home>/openspec/<id> checkout
      // path inside the temp dir for both the fix text and the CLI.
      const scratchHome = path.join(tempDir, 'home');
      fs.mkdirSync(scratchHome, { recursive: true });
      // os.homedir() reads USERPROFILE on win32, HOME elsewhere.
      const e2eEnv = { ...env, HOME: scratchHome, USERPROFILE: scratchHome };

      // The "remote": a local bare-ish git repo holding a healthy store.
      const originWorktree = path.join(tempDir, 'origin-worktree');
      createHealthyOpenSpecRoot(originWorktree);
      // Anchor every directory a healthy clone needs (the same job
      // store setup's anchor files do).
      fs.writeFileSync(path.join(originWorktree, 'openspec', 'specs', '.gitkeep'), '');
      fs.writeFileSync(path.join(originWorktree, 'openspec', 'changes', 'archive', '.gitkeep'), '');
      fs.mkdirSync(path.join(originWorktree, '.openspec-store'), { recursive: true });
      fs.writeFileSync(
        path.join(originWorktree, '.openspec-store', 'store.yaml'),
        'version: 1\nid: team-context\n'
      );
      git(originWorktree, 'init');
      git(originWorktree, 'add', '-A');
      git(originWorktree, 'commit', '-m', 'init');

      // The app repo declares the reference with the clone source. The
      // forward-slash spelling keeps the remote shell-safe on Windows
      // (backslashes fail isShellSafeRemote); git accepts it anywhere.
      const originRemote = originWorktree.split(path.sep).join('/');
      const appRepo = path.join(tempDir, 'app-repo');
      fs.mkdirSync(path.join(appRepo, 'openspec'), { recursive: true });
      fs.writeFileSync(
        path.join(appRepo, 'openspec', 'config.yaml'),
        'schema: spec-driven\nreferences:\n' +
          `  - { id: team-context, remote: ${originRemote} }\n`
      );
      fs.mkdirSync(path.join(appRepo, 'openspec', 'specs'), { recursive: true });
      fs.mkdirSync(path.join(appRepo, 'openspec', 'changes', 'archive'), { recursive: true });

      const created = await runCLI(['new', 'change', 'onboard-check', '--json'], {
        cwd: appRepo,
        env: e2eEnv,
      });
      expect(created.exitCode).toBe(0);

      // First run degrades with the clone-source fix.
      const degraded = await runCLI(
        ['instructions', 'proposal', '--change', 'onboard-check', '--json'],
        { cwd: appRepo, env: e2eEnv }
      );
      const entry = parseJson(degraded).references[0];
      expect(entry.status[0].code).toBe('reference_unresolved');
      const fix: string = entry.status[0].fix;
      const expectedCheckout = path.join(scratchHome, 'openspec', 'team-context');
      // The quote style is platform-deliberate: POSIX single quotes,
      // win32 double quotes (cmd/PowerShell treat ' as literal).
      const q = process.platform === 'win32' ? '"' : "'";
      expect(fix).toBe(
        `git clone -- ${originRemote} ${q}${expectedCheckout}${q} && openspec store register ${q}${expectedCheckout}${q} --id team-context`
      );

      // Execute the fix's two commands with the values the shape pin
      // just verified - argv arrays, no shell re-tokenization (paths
      // with spaces would break a naive split(' ')).
      execFileSync('git', ['clone', '--', originRemote, expectedCheckout], {
        env: { ...process.env, ...e2eEnv },
      });
      const registered = await runCLI(
        ['store', 'register', expectedCheckout, '--id', 'team-context', '--json'],
        { cwd: appRepo, env: e2eEnv }
      );
      expect(registered.exitCode).toBe(0);

      // The rerun resolves the index from the fresh checkout.
      const resolved = await runCLI(
        ['instructions', 'proposal', '--change', 'onboard-check', '--json'],
        { cwd: appRepo, env: e2eEnv }
      );
      const resolvedEntry = parseJson(resolved).references[0];
      expect(resolvedEntry.status).toEqual([]);
      expect(resolvedEntry.root).toBe(fs.realpathSync.native(expectedCheckout));
    });
  });

  describe('doctor and resolution', () => {
    it('surfaces both remotes, prefers canonical in human output, no new diagnostics', async () => {
      const canonical = 'https://192.0.2.9/canonical.git';
      const storeRoot = path.join(tempDir, 'doc-context');
      createHealthyOpenSpecRoot(storeRoot);
      // Keep specs/ and archive/ tracked so the pre-existing
      // fragile-directories warning stays out of this assertion.
      fs.writeFileSync(path.join(storeRoot, 'openspec', 'specs', '.gitkeep'), '');
      fs.writeFileSync(path.join(storeRoot, 'openspec', 'changes', 'archive', '.gitkeep'), '');
      fs.mkdirSync(path.join(storeRoot, '.openspec-store'), { recursive: true });
      fs.writeFileSync(
        path.join(storeRoot, '.openspec-store', 'store.yaml'),
        `version: 1\nid: doc-context\nremote: ${canonical}\n`
      );
      git(storeRoot, 'init');
      git(storeRoot, 'remote', 'add', 'origin', TEST_NET_URL);
      git(storeRoot, 'add', '-A');
      git(storeRoot, 'commit', '-m', 'init');
      await runCLI(['store', 'register', storeRoot, '--json'], { cwd: tempDir, env });

      const json = await runCLI(['store', 'doctor', 'doc-context', '--json'], {
        cwd: tempDir,
        env,
      });
      const store = parseJson(json).stores[0];
      expect(store.metadata.remote).toBe(canonical);
      expect(store.git.origin_url).toBe(TEST_NET_URL);
      expect(store.status).toEqual([]);

      const human = await runCLI(['store', 'doctor', 'doc-context'], { cwd: tempDir, env });
      expect(human.stdout).toContain(`  Remote: ${canonical}`);
      expect(human.stdout).not.toContain(TEST_NET_URL);

      // The remote-bearing store.yaml resolves normally with --store.
      const list = await runCLI(['list', '--json', '--store', 'doc-context'], {
        cwd: tempDir,
        env,
      });
      expect(list.exitCode).toBe(0);
      expect(parseJson(list).root.store_id).toBe('doc-context');
    });

    it('shows no Remote noise for stores without remotes', async () => {
      const storeRoot = path.join(tempDir, 'quiet-context');
      await runCLI(['store', 'setup', 'quiet-context', '--path', storeRoot, '--json'], {
        cwd: tempDir,
        env,
      });
      const human = await runCLI(['store', 'doctor', 'quiet-context'], { cwd: tempDir, env });
      expect(human.exitCode).toBe(0);
      expect(human.stdout).not.toContain('Remote:');
    });
  });
});
