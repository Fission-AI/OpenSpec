import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';

describe('global defaultStore fallback (#1359)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let storeRoot: string;
  let scratch: string;

  beforeEach(async () => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-global-default-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });

    storeRoot = path.join(tempDir, 'team-context');
    createOpenSpecRoot(storeRoot);
    await registerStore({ id: 'team-context', localPath: storeRoot, globalDataDir });

    scratch = path.join(tempDir, 'no-root-here');
    fs.mkdirSync(scratch, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  function setDefaultStore(id: string): void {
    fs.mkdirSync(path.join(tempDir, 'config', 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(tempDir, 'config', 'openspec', 'config.json'),
      JSON.stringify({ defaultStore: id }) + '\n'
    );
  }

  it('reports global_default provenance in status JSON and the root banner', async () => {
    setDefaultStore('team-context');

    const status = await runCLI(['status', '--json'], { cwd: scratch, env });
    expect(status.exitCode).toBe(0);
    expect(parseJson(status).root).toEqual({
      path: fs.realpathSync.native(storeRoot),
      source: 'global_default',
      store_id: 'team-context',
    });

    const human = await runCLI(['status'], { cwd: scratch, env });
    expect(human.exitCode).toBe(0);
    expect(human.stderr).toContain('Using OpenSpec root: team-context');
  }, 30_000);

  it('reports a stale default in the JSON failure payload with the clearing fix', async () => {
    setDefaultStore('ghost-plans');

    const status = await runCLI(['status', '--json'], { cwd: scratch, env });
    expect(status.exitCode).toBe(1);
    const [diagnostic] = parseJson(status).status;
    expect(diagnostic.code).toBe('unknown_store');
    expect(diagnostic.message).toContain("Global defaultStore 'ghost-plans'");
    expect(diagnostic.fix).toContain('openspec config unset defaultStore');
  }, 30_000);
});
