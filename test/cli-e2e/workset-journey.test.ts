import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { getWorksetsDir } from '../../src/core/worksets.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';
import {
  createFakeTool,
  envWithFakeTools,
  readLaunchLog,
} from '../helpers/fake-tool.js';
import { snapshotDirectory as snapshot } from '../helpers/fs-snapshot.js';

/**
 * The 7.1 journey: compose -> list -> open (both styles) -> remove,
 * proving the feature leaves no footprint - member folders are
 * byte-untouched, the relationship surfaces (context/doctor) are
 * byte-identical before and after, and a teammate's machine sees
 * nothing.
 */
describe('workset journey (7.1 e2e)', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;
  let globalDataDir: string;
  let storeRoot: string;
  let appRepo: string;
  let scratchFolder: string;

  beforeEach(async () => {
    process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS = '1';
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workset-e2e-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
      PATH: path.dirname(process.execPath),
    };
    globalDataDir = getGlobalDataDir({ env });

    // A real relationship topology so independence is provable.
    storeRoot = path.join(tempDir, 'team-context');
    createOpenSpecRoot(storeRoot);
    await registerStore({
      id: 'team-context',
      localPath: storeRoot,
      globalDataDir,
    });

    appRepo = path.join(tempDir, 'web-app');
    createOpenSpecRoot(appRepo);
    fs.writeFileSync(
      path.join(appRepo, 'openspec', 'config.yaml'),
      'schema: spec-driven\nreferences:\n  - team-context\n'
    );

    scratchFolder = path.join(tempDir, 'notes');
    fs.mkdirSync(scratchFolder, { recursive: true });
    fs.writeFileSync(path.join(scratchFolder, 'todo.md'), '- ship 7.1\n');
  });

  afterEach(() => {
    delete process.env.OPENSPEC_ENABLE_CLI_AGENT_OPENERS;
    // Windows can hold a brief handle on a just-exited spawned CLI/opener;
    // retry the recursive remove so EBUSY during teardown does not flake.
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  function parseJson(result: RunCLIResult): any {
    return JSON.parse(result.stdout);
  }

  it('compose -> list -> open both styles -> remove, with no footprint', async () => {
    const fakeCode = createFakeTool(tempDir, 'code');
    const fakeClaude = createFakeTool(tempDir, 'claude');
    const launchEnv = envWithFakeTools(env, [fakeCode, fakeClaude]);

    const memberSnapshots = [
      snapshot(storeRoot),
      snapshot(appRepo),
      snapshot(scratchFolder),
    ];
    const contextBefore = await runCLI(['context', '--json'], {
      cwd: appRepo,
      env,
    });
    const doctorBefore = await runCLI(['doctor', '--json'], {
      cwd: appRepo,
      env,
    });

    // Compose: a planning root, a code repo, and a plain folder - any
    // folders, any number, no relationship required.
    const created = await runCLI(
      [
        'workset',
        'create',
        'platform',
        '--member',
        storeRoot,
        '--member',
        appRepo,
        '--member',
        `notes=${scratchFolder}`,
        '--tool',
        'claude',
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(created.exitCode).toBe(0);
    expect(parseJson(created).workset.members).toHaveLength(3);

    // Reopen surface: the saved view is listed by name.
    const listed = await runCLI(['workset', 'list', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(parseJson(listed).worksets.map((w: { name: string }) => w.name)).toEqual(
      ['platform']
    );

    // Editor open: window opens (fake records argv), command returns 0.
    const editorOpen = await runCLI(
      ['workset', 'open', 'platform', '--tool', 'code'],
      { cwd: tempDir, env: launchEnv }
    );
    expect(editorOpen.exitCode).toBe(0);
    const codeLaunch = readLaunchLog(fakeCode.logPath);
    expect(codeLaunch.args).toHaveLength(1);
    const generatedPath = codeLaunch.args[0];
    expect(generatedPath.endsWith('platform.code-workspace')).toBe(true);
    expect(JSON.parse(fs.readFileSync(generatedPath, 'utf-8'))).toEqual({
      folders: [
        { name: 'team-context', path: storeRoot },
        { name: 'web-app', path: appRepo },
        { name: 'notes', path: scratchFolder },
      ],
    });

    // Agent open: the saved preference, every member attached, clean
    // session (no positional anywhere).
    const agentOpen = await runCLI(['workset', 'open', 'platform'], {
      cwd: tempDir,
      env: launchEnv,
    });
    expect(agentOpen.exitCode).toBe(0);
    const claudeLaunch = readLaunchLog(fakeClaude.logPath);
    expect(claudeLaunch.args).toEqual([
      '--add-dir',
      storeRoot,
      '--add-dir',
      appRepo,
      '--add-dir',
      scratchFolder,
    ]);
    expect(fs.realpathSync.native(claudeLaunch.cwd)).toBe(storeRoot);

    // Remove: only the saved view goes.
    const removed = await runCLI(
      ['workset', 'remove', 'platform', '--yes', '--json'],
      { cwd: tempDir, env }
    );
    expect(removed.exitCode).toBe(0);

    // No footprint: members byte-untouched, relationship surfaces
    // byte-identical, and deleting the worksets dir removes every trace.
    expect(snapshot(storeRoot)).toEqual(memberSnapshots[0]);
    expect(snapshot(appRepo)).toEqual(memberSnapshots[1]);
    expect(snapshot(scratchFolder)).toEqual(memberSnapshots[2]);

    const contextAfter = await runCLI(['context', '--json'], {
      cwd: appRepo,
      env,
    });
    const doctorAfter = await runCLI(['doctor', '--json'], {
      cwd: appRepo,
      env,
    });
    expect(contextAfter.stdout).toBe(contextBefore.stdout);
    expect(doctorAfter.stdout).toBe(doctorBefore.stdout);

    const worksetsDir = getWorksetsDir({ globalDataDir });
    fs.rmSync(worksetsDir, { recursive: true, force: true });
    const listAfterDelete = await runCLI(['workset', 'list', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(parseJson(listAfterDelete)).toEqual({ worksets: [], status: [] });
    // ~10 CLI subprocess spawns; the 10s default is tight on slow Windows runners.
  }, 60_000);

  it('composition is personal: two machines over the same checkout never meet', async () => {
    const teammateEnv: NodeJS.ProcessEnv = {
      ...env,
      XDG_DATA_HOME: path.join(tempDir, 'teammate-data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'teammate-config'),
    };
    const checkoutBefore = snapshot(storeRoot);

    const mine = await runCLI(
      [
        'workset',
        'create',
        'mine',
        '--member',
        storeRoot,
        '--member',
        scratchFolder,
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(mine.exitCode).toBe(0);

    const theirs = await runCLI(
      ['workset', 'create', 'theirs', '--member', storeRoot, '--json'],
      { cwd: tempDir, env: teammateEnv }
    );
    expect(theirs.exitCode).toBe(0);

    const myList = await runCLI(['workset', 'list', '--json'], {
      cwd: tempDir,
      env,
    });
    const theirList = await runCLI(['workset', 'list', '--json'], {
      cwd: tempDir,
      env: teammateEnv,
    });
    expect(parseJson(myList).worksets.map((w: { name: string }) => w.name)).toEqual(
      ['mine']
    );
    expect(
      parseJson(theirList).worksets.map((w: { name: string }) => w.name)
    ).toEqual(['theirs']);

    // Removing mine affects nothing of theirs, and the shared checkout
    // is byte-untouched throughout.
    await runCLI(['workset', 'remove', 'mine', '--yes', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(
      parseJson(
        await runCLI(['workset', 'list', '--json'], {
          cwd: tempDir,
          env: teammateEnv,
        })
      ).worksets
    ).toHaveLength(1);
    expect(snapshot(storeRoot)).toEqual(checkoutBefore);
  }, 60_000);
});
