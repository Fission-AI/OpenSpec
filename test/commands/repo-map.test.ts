import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';

describe('repo map commands and surfaces (3.5)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-repo-cli-')));
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  async function makeStore(id: string): Promise<string> {
    const root = mkdir(`stores/${id}`);
    createOpenSpecRoot(root);
    await registerStore({ id, localPath: root, globalDataDir });
    return root;
  }

  describe('repo commands', () => {
    it('registers with the folder-name default, lists, and unregisters untouched', async () => {
      const repoDir = mkdir('src/api-server');
      fs.writeFileSync(path.join(repoDir, 'README.md'), 'code');
      const before = snapshot(repoDir);

      const registered = await runCLI(['repo', 'register', repoDir, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(registered.exitCode).toBe(0);
      expect(parseJson(registered)).toEqual({
        repo: { id: 'api-server', path: repoDir },
        registry: {
          path: expect.stringContaining('registry.yaml'),
          registered: true,
          already_registered: false,
        },
        status: [],
      });

      const rerun = await runCLI(['repo', 'register', repoDir, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(rerun).registry.already_registered).toBe(true);

      const list = await runCLI(['repo', 'list', '--json'], { cwd: tempDir, env });
      expect(parseJson(list)).toEqual({
        repos: [{ id: 'api-server', path: repoDir }],
        status: [],
      });
      const listHuman = await runCLI(['repo', 'list'], { cwd: tempDir, env });
      expect(listHuman.stdout).toContain(`api-server  ${repoDir}`);

      const unregistered = await runCLI(['repo', 'unregister', 'api-server', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(unregistered).registry.removed).toBe(true);
      expect(snapshot(repoDir)).toEqual(before);

      const empty = await runCLI(['repo', 'list', '--json'], { cwd: tempDir, env });
      expect(parseJson(empty)).toEqual({ repos: [], status: [] });
      const emptyHuman = await runCLI(['repo', 'list'], { cwd: tempDir, env });
      expect(emptyHuman.stdout.trim()).toBe('No repos registered.');
    });

    it('fails clearly on bad paths, bad ids, and unknown unregisters', async () => {
      const missing = await runCLI(
        ['repo', 'register', path.join(tempDir, 'nope'), '--json'],
        { cwd: tempDir, env }
      );
      expect(missing.exitCode).toBe(1);
      expect(parseJson(missing).status[0].code).toBe('repo_path_missing');

      const filePath = path.join(tempDir, 'file.txt');
      fs.writeFileSync(filePath, 'x');
      const notDir = await runCLI(['repo', 'register', filePath, '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(notDir).status[0].code).toBe('repo_path_not_directory');

      // Default folder name fails grammar → the fix names --id.
      const badName = mkdir('src/My Repo');
      const badDefault = await runCLI(['repo', 'register', badName, '--json'], {
        cwd: tempDir,
        env,
      });
      const badStatus = parseJson(badDefault).status[0];
      expect(badStatus.code).toBe('invalid_repo_id');
      expect(badStatus.fix).toContain('--id');

      const badExplicit = await runCLI(
        ['repo', 'register', mkdir('src/fine'), '--id', 'BAD ID', '--json'],
        { cwd: tempDir, env }
      );
      expect(parseJson(badExplicit).status[0].code).toBe('invalid_repo_id');

      const unknown = await runCLI(['repo', 'unregister', 'ghost', '--json'], {
        cwd: tempDir,
        env,
      });
      expect(parseJson(unknown).status[0].code).toBe('repo_not_found');
    });

    it('store setup with a repo-claimed id creates nothing', async () => {
      const repoDir = mkdir('src/api-server');
      await runCLI(['repo', 'register', repoDir, '--json'], { cwd: tempDir, env });

      const storePath = path.join(tempDir, 'stores/api-server');
      const refused = await runCLI(
        ['store', 'setup', 'api-server', '--path', storePath, '--json'],
        { cwd: tempDir, env }
      );
      expect(refused.exitCode).toBe(1);
      expect(parseJson(refused).status[0].code).toBe('store_id_claimed_by_repo');
      expect(fs.existsSync(storePath)).toBe(false);
    });

    it('keeps store list and doctor working with a both-sections registry', async () => {
      await makeStore('team-context');
      await runCLI(['repo', 'register', mkdir('src/api-server'), '--json'], {
        cwd: tempDir,
        env,
      });

      const list = await runCLI(['store', 'list', '--json'], { cwd: tempDir, env });
      expect(list.exitCode).toBe(0);
      expect(parseJson(list).stores.map((s: any) => s.id)).toEqual(['team-context']);

      const doctor = await runCLI(['store', 'doctor', '--json'], { cwd: tempDir, env });
      expect(doctor.exitCode).toBe(0);
      expect(parseJson(doctor).stores).toHaveLength(1);
    });
  });

  describe('--store rejection', () => {
    it('rejects a repo id with the typed hint in all session shapes', async () => {
      await makeStore('team-context');
      const repoDir = mkdir('src/api-server');
      await runCLI(['repo', 'register', repoDir, '--json'], { cwd: tempDir, env });

      const flagged = await runCLI(['list', '--json', '--store', 'api-server'], {
        cwd: tempDir,
        env,
      });
      expect(flagged.exitCode).toBe(1);
      const status = parseJson(flagged).status[0];
      expect(status.code).toBe('store_id_is_repo');
      expect(status.message).toContain(repoDir);
      expect(status.message).toContain('cd into the repo');
      expect(status.fix).toContain('team-context');

      // Positive control: the mixed registry still resolves stores.
      const ok = await runCLI(['list', '--json', '--store', 'team-context'], {
        cwd: tempDir,
        env,
      });
      expect(ok.exitCode).toBe(0);

      // Pointer path: a store: declaration naming a repo id.
      const pointerRepo = mkdir('app-repo');
      fs.mkdirSync(path.join(pointerRepo, 'openspec'), { recursive: true });
      fs.writeFileSync(
        path.join(pointerRepo, 'openspec', 'config.yaml'),
        'store: api-server\n'
      );
      const viaPointer = await runCLI(['list', '--json'], { cwd: pointerRepo, env });
      expect(viaPointer.exitCode).toBe(1);
      const pointerStatus = parseJson(viaPointer).status[0];
      expect(pointerStatus.code).toBe('store_id_is_repo');
      expect(pointerStatus.message).toContain('Declared in');
    });

    it('rejects a repo id even when no stores are registered, without a looping fix', async () => {
      const repoDir = mkdir('src/api-server');
      await runCLI(['repo', 'register', repoDir, '--json'], { cwd: tempDir, env });

      const result = await runCLI(['list', '--json', '--store', 'api-server'], {
        cwd: tempDir,
        env,
      });
      expect(result.exitCode).toBe(1);
      const status = parseJson(result).status[0];
      expect(status.code).toBe('store_id_is_repo');
      expect(status.fix).not.toContain('store setup api-server');
      expect(status.fix).toContain('different-id');
    });
  });

  describe('targets enrichment', () => {
    async function setUpTargets(): Promise<string> {
      const storeRoot = await makeStore('team-context');
      fs.writeFileSync(
        path.join(storeRoot, 'openspec', 'config.yaml'),
        'schema: spec-driven\ntargets:\n  - api-server\n  - { id: web-app, remote: "https://192.0.2.1/web.git" }\n'
      );
      const created = await runCLI(
        ['new', 'change', 'enrich-check', '--json', '--store', 'team-context'],
        { cwd: tempDir, env }
      );
      expect(created.exitCode).toBe(0);
      return storeRoot;
    }

    it('adds local paths to mapped targets on both surfaces, both modes', async () => {
      await setUpTargets();
      const repoDir = mkdir('src/api-server');
      await runCLI(['repo', 'register', repoDir, '--json'], { cwd: tempDir, env });

      const artifact = await runCLI(
        ['instructions', 'proposal', '--change', 'enrich-check', '--store', 'team-context', '--json'],
        { cwd: tempDir, env }
      );
      expect(parseJson(artifact).targets.repos).toEqual([
        { id: 'api-server', path: repoDir },
        { id: 'web-app', remote: 'https://192.0.2.1/web.git' },
      ]);

      const artifactHuman = await runCLI(
        ['instructions', 'proposal', '--change', 'enrich-check', '--store', 'team-context'],
        { cwd: tempDir, env }
      );
      expect(artifactHuman.stdout).toContain(`  - api-server → ${repoDir}`);
      expect(artifactHuman.stdout).toContain('  - web-app (clone: https://192.0.2.1/web.git)');

      const apply = await runCLI(
        ['instructions', 'apply', '--change', 'enrich-check', '--store', 'team-context', '--json'],
        { cwd: tempDir, env }
      );
      expect(parseJson(apply).targets.repos[0]).toEqual({ id: 'api-server', path: repoDir });

      const applyHuman = await runCLI(
        ['instructions', 'apply', '--change', 'enrich-check', '--store', 'team-context'],
        { cwd: tempDir, env }
      );
      expect(applyHuman.stdout).toContain(`  - api-server → ${repoDir}`);
    });

    it('renders the combined remote-and-path form and respects narrowing', async () => {
      const storeRoot = await setUpTargets();
      const webDir = mkdir('src/web-app');
      await runCLI(['repo', 'register', webDir, '--json'], { cwd: tempDir, env });

      const metadataPath = path.join(
        storeRoot, 'openspec', 'changes', 'enrich-check', '.openspec.yaml'
      );
      fs.writeFileSync(
        metadataPath,
        fs.readFileSync(metadataPath, 'utf-8') + 'targets:\n  - web-app\n'
      );

      const human = await runCLI(
        ['instructions', 'proposal', '--change', 'enrich-check', '--store', 'team-context'],
        { cwd: tempDir, env }
      );
      expect(human.stdout).toContain(
        `  - web-app → ${webDir} (clone: https://192.0.2.1/web.git)`
      );
    });

    it('enriches change-only targets when the store declares none', async () => {
      const storeRoot = await makeStore('plain-context');
      const created = await runCLI(
        ['new', 'change', 'change-only', '--json', '--store', 'plain-context'],
        { cwd: tempDir, env }
      );
      expect(created.exitCode).toBe(0);

      const apiDir = mkdir('src/api-server');
      await runCLI(['repo', 'register', apiDir, '--json'], { cwd: tempDir, env });

      const metadataPath = path.join(
        storeRoot, 'openspec', 'changes', 'change-only', '.openspec.yaml'
      );
      fs.writeFileSync(
        metadataPath,
        fs.readFileSync(metadataPath, 'utf-8') + 'targets:\n  - api-server\n'
      );

      const result = await runCLI(
        ['instructions', 'proposal', '--change', 'change-only', '--store', 'plain-context', '--json'],
        { cwd: tempDir, env }
      );
      const targets = JSON.parse(result.stdout).targets;
      expect(targets.source).toBe('change');
      expect(targets.repos[0]).toEqual({ id: 'api-server', path: apiDir });
    });

    it('stays byte-identical with no repos mapped', async () => {
      await setUpTargets();

      const before = await runCLI(
        ['instructions', 'proposal', '--change', 'enrich-check', '--store', 'team-context', '--json'],
        { cwd: tempDir, env }
      );
      // Map an UNRELATED repo: declared targets stay bare.
      await runCLI(['repo', 'register', mkdir('src/other-repo'), '--json'], {
        cwd: tempDir,
        env,
      });
      const after = await runCLI(
        ['instructions', 'proposal', '--change', 'enrich-check', '--store', 'team-context', '--json'],
        { cwd: tempDir, env }
      );
      expect(after.stdout).toBe(before.stdout);
    });
  });
});
