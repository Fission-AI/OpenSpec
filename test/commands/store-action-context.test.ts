import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { getGlobalDataDir, registerStore } from '../../src/core/index.js';
import { runCLI } from '../helpers/run-cli.js';
import { createOpenSpecRoot } from '../helpers/openspec-fixtures.js';

// #2013: a store-selected root is where planning artifacts live, not where
// implementation happens. `actionContext` must not tell the agent that the
// store is the only editable root, or apply refuses to touch the code repo.
describe('status actionContext for store-selected roots (#2013)', () => {
  let tempDir: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;
  let storeRoot: string;
  let appRepo: string;

  beforeEach(async () => {
    tempDir = fs.realpathSync.native(
      fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-action-context-'))
    );
    env = {
      XDG_DATA_HOME: path.join(tempDir, 'data'),
      XDG_CONFIG_HOME: path.join(tempDir, 'config'),
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });

    storeRoot = path.join(tempDir, 'plans');
    createOpenSpecRoot(storeRoot);
    await registerStore({ id: 'plans', localPath: storeRoot, globalDataDir });
    fs.mkdirSync(path.join(storeRoot, 'openspec', 'changes', 'add-auth'), { recursive: true });

    appRepo = path.join(tempDir, 'app');
    fs.mkdirSync(path.join(appRepo, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(appRepo, 'openspec', 'config.yaml'),
      'schema: spec-driven\nstore: plans\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  });

  async function actionContext(args: string[], cwd: string): Promise<any> {
    const result = await runCLI(['status', '--change', 'add-auth', '--json', ...args], {
      cwd,
      env,
    });
    expect(result.exitCode).toBe(0);
    return JSON.parse(result.stdout).actionContext;
  }

  it('lists the declaring repo and the store when the store is declared', async () => {
    const context = await actionContext([], appRepo);

    expect(context.allowedEditRoots).toEqual([appRepo, storeRoot]);
    expect(context.constraints).toEqual([
      `Change artifacts live in store 'plans' (${storeRoot}). Implementation edits go in ${appRepo}, the project on the current path that declares this store; ask the user before editing any other repository.`,
    ]);
  });

  it('finds the declaring repo from a subdirectory of it', async () => {
    const deep = path.join(appRepo, 'src', 'deep');
    fs.mkdirSync(deep, { recursive: true });

    const context = await actionContext([], deep);

    expect(context.allowedEditRoots).toEqual([appRepo, storeRoot]);
  });

  it('lists the declaring repo with an explicit --store from that repo (issue repro)', async () => {
    const context = await actionContext(['--store', 'plans'], appRepo);

    expect(context.allowedEditRoots).toEqual([appRepo, storeRoot]);
  });

  it('does not guess an implementation repo when no project declares the store', async () => {
    const elsewhere = path.join(tempDir, 'elsewhere');
    fs.mkdirSync(elsewhere);

    const context = await actionContext(['--store', 'plans'], elsewhere);

    expect(context.allowedEditRoots).toEqual([storeRoot]);
    expect(context.constraints).toEqual([
      `Change artifacts live in store 'plans' (${storeRoot}). OpenSpec could not determine which repository implements this change; ask the user which repository to edit, and make implementation edits there.`,
    ]);
  });

  it('does not borrow a repo that declares a different store', async () => {
    fs.writeFileSync(path.join(appRepo, 'openspec', 'config.yaml'), 'store: other\n');

    const context = await actionContext(['--store', 'plans'], appRepo);

    expect(context.allowedEditRoots).toEqual([storeRoot]);
  });

  it('does not borrow a real planning root whose store pointer is ignored', async () => {
    const repo = path.join(tempDir, 'local');
    createOpenSpecRoot(repo);
    fs.writeFileSync(path.join(repo, 'openspec', 'config.yaml'), 'store: plans\n');

    const context = await actionContext(['--store', 'plans'], repo);

    expect(context.allowedEditRoots).toEqual([storeRoot]);
  });

  it('gives every change in status --all the same edit roots', async () => {
    fs.mkdirSync(path.join(storeRoot, 'openspec', 'changes', 'add-billing'), { recursive: true });

    const result = await runCLI(['status', '--all', '--json'], { cwd: appRepo, env });

    expect(result.exitCode).toBe(0);
    const { changes } = JSON.parse(result.stdout);
    expect(changes.map((entry: any) => entry.actionContext.allowedEditRoots)).toEqual([
      [appRepo, storeRoot],
      [appRepo, storeRoot],
    ]);
  });

  it('keeps the repo-local context byte-stable', async () => {
    const repo = path.join(tempDir, 'local');
    createOpenSpecRoot(repo);
    fs.mkdirSync(path.join(repo, 'openspec', 'changes', 'add-auth'), { recursive: true });

    const context = await actionContext([], repo);

    // toEqual ignores key order; the serialized form pins it too.
    expect(JSON.stringify(context)).toBe(JSON.stringify({
      mode: 'repo-local',
      sourceOfTruth: 'repo',
      planningArtifacts: ['proposal', 'specs', 'design', 'tasks'],
      linkedContext: [],
      allowedEditRoots: [repo],
      requiresAffectedAreaSelection: false,
      constraints: ['Repo-local change artifacts and implementation edits are scoped to this project.'],
    }));
  });
});
