import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { classifyOpenSpecDir } from '../../src/core/project-config.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';

/**
 * The guide's store layout is `~/openspec/<id>`. With the id `specs` or
 * `changes`, the store folder is itself `~/openspec/specs` or
 * `~/openspec/changes`, which gave `$HOME` a planning shape. `$HOME` then
 * became the nearest root for every command under the home tree: the global
 * `defaultStore` was never consulted and new changes landed outside the store.
 */
describe('a store named specs or changes at ~/openspec/<id>', () => {
  let tempDir: string;
  let home: string;
  let workDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-store-phantom-root-'))
    );
    home = path.join(tempDir, 'home');
    workDir = path.join(home, 'src', 'web-app');
    fs.mkdirSync(workDir, { recursive: true });
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function parseJson(result: RunCLIResult): any {
    try {
      return JSON.parse(result.stdout);
    } catch (error) {
      throw new Error(
        `Could not parse JSON.\nCommand: ${result.command}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}\n${String(error)}`
      );
    }
  }

  /** `store setup <id> --path ~/openspec/<id>`, then `config set defaultStore <id>`. */
  async function setupDefaultStore(id: string): Promise<string> {
    const storeRoot = path.join(home, 'openspec', id);
    const setup = await runCLI(
      ['store', 'setup', id, '--path', storeRoot, '--no-init-git', '--json'],
      { cwd: tempDir, env }
    );
    expect(setup.exitCode).toBe(0);
    const config = await runCLI(['config', 'set', 'defaultStore', id], { cwd: tempDir, env });
    expect(config.exitCode).toBe(0);
    return storeRoot;
  }

  async function rootFrom(cwd: string): Promise<any> {
    const result = await runCLI(['list', '--json'], { cwd, env });
    expect(result.exitCode).toBe(0);
    return parseJson(result).root;
  }

  it('control: a store named team-plans resolves as the global default', async () => {
    const storeRoot = await setupDefaultStore('team-plans');

    expect(await rootFrom(workDir)).toEqual({
      path: storeRoot,
      source: 'global_default',
      store_id: 'team-plans',
    });
  }, 60_000);

  it.each(['specs', 'changes'])(
    'a store named %s still resolves as the global default',
    async (id) => {
      const storeRoot = await setupDefaultStore(id);

      expect(await rootFrom(workDir)).toEqual({
        path: storeRoot,
        source: 'global_default',
        store_id: id,
      });
    },
    60_000
  );

  it.each(['specs', 'changes'])(
    'new change lands in the store named %s, not under $HOME/openspec',
    async (id) => {
      const storeRoot = await setupDefaultStore(id);

      const result = await runCLI(['new', 'change', 'probe-change', '--json'], { cwd: workDir, env });

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(storeRoot, 'openspec', 'changes', 'probe-change'))).toBe(true);
      expect(fs.existsSync(path.join(home, 'openspec', 'changes', 'probe-change'))).toBe(false);
    },
    60_000
  );

  it('resolves the store itself as the nearest root from inside it', async () => {
    const storeRoot = await setupDefaultStore('specs');

    expect(await rootFrom(path.join(storeRoot, 'openspec', 'changes'))).toEqual({
      path: storeRoot,
      source: 'nearest',
    });
  }, 60_000);

  it('keeps a real project root at $HOME as the nearest root', async () => {
    await setupDefaultStore('team-plans');
    createOpenSpecRoot(home);

    expect(await rootFrom(workDir)).toEqual({ path: home, source: 'nearest' });
  }, 60_000);

  it('keeps $HOME a root when its changes/ is real planning, even beside a store named specs', async () => {
    await setupDefaultStore('specs');
    fs.mkdirSync(path.join(home, 'openspec', 'changes'), { recursive: true });

    expect(await rootFrom(workDir)).toEqual({ path: home, source: 'nearest' });
  }, 60_000);
});

describe('classifyOpenSpecDir planning shape', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-classify-'));
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function makeStoreFolder(relativePath: string, id: string): void {
    const metadataDir = path.join(projectRoot, relativePath, '.openspec-store');
    fs.mkdirSync(metadataDir, { recursive: true });
    fs.writeFileSync(path.join(metadataDir, 'store.yaml'), `version: 1\nid: ${id}\n`);
  }

  it.each(['specs', 'changes'])('counts a plain openspec/%s directory as planning', (dir) => {
    fs.mkdirSync(path.join(projectRoot, 'openspec', dir), { recursive: true });

    expect(classifyOpenSpecDir(projectRoot).hasPlanningShape).toBe(true);
  });

  it.each(['specs', 'changes'])('does not count openspec/%s when it is a store root', (dir) => {
    makeStoreFolder(path.join('openspec', dir), dir);

    expect(classifyOpenSpecDir(projectRoot).hasPlanningShape).toBe(false);
  });

  it('counts the other directory when only one of them is a store root', () => {
    makeStoreFolder(path.join('openspec', 'specs'), 'specs');
    fs.mkdirSync(path.join(projectRoot, 'openspec', 'changes'), { recursive: true });

    expect(classifyOpenSpecDir(projectRoot).hasPlanningShape).toBe(true);
  });

  it('still counts a specs directory whose store metadata sits deeper inside it', () => {
    makeStoreFolder(path.join('openspec', 'specs', 'billing'), 'billing');

    expect(classifyOpenSpecDir(projectRoot).hasPlanningShape).toBe(true);
  });
});
