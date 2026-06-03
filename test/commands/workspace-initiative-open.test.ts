import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  createInitiative,
  getGlobalDataDir,
  getManagedWorkspaceRoot,
  getWorkspaceCodeWorkspacePath,
  getWorkspaceViewStatePath,
  mountInitiativesCollection,
  parseWorkspaceViewState,
  registerContextStore,
  writeContextStoreMetadataState,
} from '../../src/core/index.js';
import { withPrependedPathEnv } from '../helpers/path-env.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

describe('workspace open initiative views', () => {
  let tempDir: string;
  let dataHome: string;
  let configHome: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-initiative-'));
    dataHome = path.join(tempDir, 'data');
    configHome = path.join(tempDir, 'config');
    env = {
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function expectedExistingPath(existingPath: string): string {
    return fs.realpathSync.native(existingPath);
  }

  function expectSameExistingPath(actualPath: string, expectedPath: string): void {
    expect(fs.realpathSync.native(actualPath)).toBe(expectedExistingPath(expectedPath));
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

  async function setupInitiative(storeId = 'platform', initiativeId = 'billing-launch') {
    const storeRoot = mkdir(`stores/${storeId}`);
    await registerContextStore({
      id: storeId,
      localPath: storeRoot,
      globalDataDir,
    });
    const state = await createInitiative({
      collection: mountInitiativesCollection(storeRoot),
      id: initiativeId,
      title: 'Billing Launch',
      summary: 'Coordinate the billing launch.',
    });

    return {
      storeId,
      storeRoot,
      initiativeId,
      initiativeRoot: path.join(storeRoot, 'initiatives', initiativeId),
      state,
    };
  }

  function createFakeExecutable(name: string): { binDir: string; logPath: string } {
    const binDir = path.join(tempDir, `fake-${name}-bin`);
    const logPath = path.join(tempDir, `${name}-launch.json`);
    const recorderPath = path.join(binDir, 'record-launch.cjs');
    fs.mkdirSync(binDir, { recursive: true });
    fs.writeFileSync(
      recorderPath,
      "const fs = require('node:fs');\nfs.writeFileSync(process.env.OPENSPEC_FAKE_OPEN_LOG, JSON.stringify({ cwd: process.cwd(), args: process.argv.slice(2) }));\n"
    );

    const posixExecutable = path.join(binDir, name);
    fs.writeFileSync(posixExecutable, '#!/bin/sh\nnode "$OPENSPEC_FAKE_OPEN_RECORDER" "$@"\n');
    fs.chmodSync(posixExecutable, 0o755);
    fs.writeFileSync(
      path.join(binDir, `${name}.cmd`),
      '@echo off\r\nnode "%OPENSPEC_FAKE_OPEN_RECORDER%" %*\r\n'
    );

    return { binDir, logPath };
  }

  function envWithFakeExecutable(fake: { binDir: string; logPath: string }): NodeJS.ProcessEnv {
    return {
      ...withPrependedPathEnv(env, fake.binDir),
      OPENSPEC_FAKE_OPEN_RECORDER: path.join(fake.binDir, 'record-launch.cjs'),
      OPENSPEC_FAKE_OPEN_LOG: fake.logPath,
    };
  }

  function readLaunchLog(logPath: string): { cwd: string; args: string[] } {
    return JSON.parse(fs.readFileSync(logPath, 'utf-8'));
  }

  it('creates a default local view for an initiative and returns a JSON receipt', async () => {
    const initiative = await setupInitiative();
    const code = createFakeExecutable('code');

    const result = await runCLI(
      [
        'workspace',
        'open',
        '--initiative',
        'billing-launch',
        '--store',
        'platform',
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const payload = parseJson(result);
    const workspaceRoot = getManagedWorkspaceRoot('billing-launch', { globalDataDir });

    expect(payload.workspace).toEqual({
      name: 'billing-launch',
      root: expect.any(String),
    });
    expectSameExistingPath(payload.workspace.root, workspaceRoot);
    expect(payload.context).toEqual({
      context_store: {
        id: 'platform',
        root: expect.any(String),
        selector: {
          kind: 'registry',
          id: 'platform',
        },
      },
      initiative: expect.objectContaining({
        id: 'billing-launch',
        title: 'Billing Launch',
        root: expect.any(String),
      }),
    });
    expectSameExistingPath(payload.context.context_store.root, initiative.storeRoot);
    expectSameExistingPath(payload.context.initiative.root, initiative.initiativeRoot);
    expect(payload.generated_files).toEqual({
      agents: expect.any(String),
      code_workspace: expect.any(String),
    });
    expectSameExistingPath(payload.generated_files.agents, path.join(workspaceRoot, 'AGENTS.md'));
    expectSameExistingPath(
      payload.generated_files.code_workspace,
      getWorkspaceCodeWorkspacePath(workspaceRoot, 'billing-launch')
    );
    expect(payload.opened_roots).toEqual([
      {
        kind: 'workspace',
        path: expect.any(String),
      },
      {
        kind: 'initiative',
        name: 'billing-launch',
        path: expect.any(String),
      },
    ]);
    expectSameExistingPath(payload.opened_roots[0].path, workspaceRoot);
    expectSameExistingPath(payload.opened_roots[1].path, initiative.initiativeRoot);
    expect(payload.skipped_roots).toEqual([]);
    expect(payload.advisory_edit_boundaries).toEqual({
      allowed_edit_roots: [],
      coordination_roots: [expect.any(String)],
      enforcement: 'advisory',
    });
    expectSameExistingPath(
      payload.advisory_edit_boundaries.coordination_roots[0],
      initiative.initiativeRoot
    );
    expect(payload.launch).toEqual({
      attempted: true,
      status: 'succeeded',
    });

    const viewState = parseWorkspaceViewState(
      fs.readFileSync(getWorkspaceViewStatePath(workspaceRoot), 'utf-8')
    );
    expect(viewState).toEqual(
      expect.objectContaining({
        version: 1,
        name: 'billing-launch',
        context: {
          kind: 'initiative',
          store: {
            id: 'platform',
            selector: {
              kind: 'registry',
              id: 'platform',
            },
          },
          initiative: {
            id: 'billing-launch',
          },
        },
        links: {},
        preferred_opener: {
          kind: 'editor',
          id: 'vscode',
        },
      })
    );
    expect(fs.existsSync(path.join(workspaceRoot, '.openspec-workspace'))).toBe(true);
    expect(fs.existsSync(path.join(globalDataDir, 'workspaces', 'registry.yaml'))).toBe(false);
    expect(fs.readFileSync(path.join(workspaceRoot, 'AGENTS.md'), 'utf-8')).toContain(
      'Initiative title: Billing Launch'
    );
    expect(JSON.parse(fs.readFileSync(getWorkspaceCodeWorkspacePath(workspaceRoot, 'billing-launch'), 'utf-8')).folders).toEqual([
      {
        name: 'Initiative context',
        path: expect.any(String),
      },
      {
        name: 'OpenSpec workspace',
        path: '.',
      },
    ]);
    const codeWorkspaceFolders = JSON.parse(
      fs.readFileSync(getWorkspaceCodeWorkspacePath(workspaceRoot, 'billing-launch'), 'utf-8')
    ).folders;
    expectSameExistingPath(codeWorkspaceFolders[0].path, initiative.initiativeRoot);

    const launch = readLaunchLog(code.logPath);
    expect(fs.realpathSync.native(launch.cwd)).toBe(fs.realpathSync.native(workspaceRoot));
    expect(launch.args).toHaveLength(1);
    expectSameExistingPath(
      launch.args[0],
      getWorkspaceCodeWorkspacePath(workspaceRoot, 'billing-launch')
    );
  });

  it('persists a path-bound context store and reopens without registry registration', async () => {
    const storeRoot = mkdir('stores/scratch-context');
    const initiativeId = 'scratch-launch';
    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id: 'scratch-context',
    });
    await createInitiative({
      collection: mountInitiativesCollection(storeRoot),
      id: initiativeId,
      title: 'Scratch Launch',
      summary: 'Coordinate local scratch work.',
    });
    const code = createFakeExecutable('code');

    const open = await runCLI(
      [
        'workspace',
        'open',
        '--initiative',
        initiativeId,
        '--store-path',
        storeRoot,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );

    expect(open.exitCode).toBe(0);
    const payload = parseJson(open);
    expect(payload.context.context_store).toEqual({
      id: 'scratch-context',
      root: expect.any(String),
      selector: {
        kind: 'path',
        path: expect.any(String),
        observed_id: 'scratch-context',
      },
    });
    expectSameExistingPath(payload.context.context_store.root, storeRoot);
    expectSameExistingPath(payload.context.context_store.selector.path, storeRoot);

    const workspaceRoot = getManagedWorkspaceRoot(initiativeId, { globalDataDir });
    const viewState = parseWorkspaceViewState(
      fs.readFileSync(getWorkspaceViewStatePath(workspaceRoot), 'utf-8')
    );
    expect(viewState.context).toEqual({
      kind: 'initiative',
      store: {
        id: 'scratch-context',
        selector: {
          kind: 'path',
          path: expect.any(String),
          observed_id: 'scratch-context',
        },
      },
      initiative: {
        id: initiativeId,
      },
    });
    const storedSelector = viewState.context?.store.selector;
    expect(storedSelector?.kind).toBe('path');
    expectSameExistingPath(storedSelector?.kind === 'path' ? storedSelector.path : '', storeRoot);

    const reopen = await runCLI(
      ['workspace', 'open', initiativeId, '--editor', '--json', '--no-interactive'],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );

    expect(reopen.exitCode).toBe(0);
    const reopenedPayload = parseJson(reopen);
    expect(reopenedPayload.status).toEqual([]);
    expectSameExistingPath(reopenedPayload.context.context_store.root, storeRoot);
    expectSameExistingPath(reopenedPayload.context.context_store.selector.path, storeRoot);

    const doctor = await runCLI(
      ['workspace', 'doctor', '--workspace', initiativeId, '--json'],
      { cwd: tempDir, env }
    );

    expect(doctor.exitCode).toBe(0);
    expect(parseJson(doctor).workspace.status).toEqual([]);
  });

  it('reports path-bound context store id drift in workspace doctor', async () => {
    const storeRoot = mkdir('stores/drift-context');
    const initiativeId = 'drift-launch';
    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id: 'drift-context',
    });
    await createInitiative({
      collection: mountInitiativesCollection(storeRoot),
      id: initiativeId,
      title: 'Drift Launch',
      summary: 'Coordinate local drift work.',
    });
    const code = createFakeExecutable('code');

    const open = await runCLI(
      [
        'workspace',
        'open',
        '--initiative',
        initiativeId,
        '--store-path',
        storeRoot,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );
    expect(open.exitCode).toBe(0);

    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id: 'renamed-context',
    });

    const doctor = await runCLI(
      ['workspace', 'doctor', '--workspace', initiativeId, '--json'],
      { cwd: tempDir, env }
    );

    expect(doctor.exitCode).toBe(0);
    expect(parseJson(doctor).workspace.status).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'context_store_binding_id_changed',
        target: 'workspace.context.store.metadata.id',
      })
    );
  });

  it('does not conflate registry and path bindings that share a store id', async () => {
    const registered = await setupInitiative('platform', 'billing-launch');
    const pathStoreRoot = mkdir('stores/platform-copy');
    await writeContextStoreMetadataState(pathStoreRoot, {
      version: 1,
      id: 'platform',
    });
    await createInitiative({
      collection: mountInitiativesCollection(pathStoreRoot),
      id: registered.initiativeId,
      title: 'Billing Launch Copy',
      summary: 'Coordinate a local copy.',
    });
    const code = createFakeExecutable('code');

    const registryOpen = await runCLI(
      [
        'workspace',
        'open',
        '--initiative',
        `${registered.storeId}/${registered.initiativeId}`,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );
    expect(registryOpen.exitCode).toBe(0);

    const pathOpen = await runCLI(
      [
        'workspace',
        'open',
        '--initiative',
        registered.initiativeId,
        '--store-path',
        pathStoreRoot,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );

    expect(pathOpen.exitCode).toBe(1);
    expect(parseJson(pathOpen).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_name_collision',
      })
    );
  });

  it('refuses to silently bind an existing non-initiative workspace', async () => {
    const initiative = await setupInitiative();
    const repo = mkdir('repos/api');
    const setup = await runCLI(
      [
        'workspace',
        'setup',
        '--no-interactive',
        '--json',
        '--name',
        'team-local',
        '--link',
        `api=${repo}`,
        '--opener',
        'editor',
      ],
      { cwd: tempDir, env }
    );
    expect(setup.exitCode).toBe(0);

    const result = await runCLI(
      [
        'workspace',
        'open',
        'team-local',
        '--initiative',
        `${initiative.storeId}/${initiative.initiativeId}`,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_context_bind_required',
      })
    );
  });

  it('reports initiative read failures separately from context store failures', async () => {
    const initiative = await setupInitiative();
    const code = createFakeExecutable('code');
    const open = await runCLI(
      [
        'workspace',
        'open',
        '--initiative',
        `${initiative.storeId}/${initiative.initiativeId}`,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );
    expect(open.exitCode).toBe(0);

    fs.writeFileSync(
      path.join(initiative.initiativeRoot, 'initiative.yaml'),
      'version: 1\nid: Invalid\n',
      'utf-8'
    );

    const doctor = await runCLI(
      ['workspace', 'doctor', '--workspace', initiative.initiativeId, '--json'],
      { cwd: tempDir, env }
    );

    expect(doctor.exitCode).toBe(0);
    expect(parseJson(doctor).workspace.status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_initiative_unavailable',
        target: 'workspace.context.initiative',
      })
    );
  });

  it('warns and skips missing linked roots while opening stored initiative context', async () => {
    const initiative = await setupInitiative();
    const code = createFakeExecutable('code');
    const repo = mkdir('repos/api');
    const open = await runCLI(
      [
        'workspace',
        'open',
        'team-billing',
        '--initiative',
        `${initiative.storeId}/${initiative.initiativeId}`,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );
    expect(open.exitCode).toBe(0);

    const expectedRepo = expectedExistingPath(repo);
    const link = await runCLI(
      ['workspace', 'link', 'api', repo, '--workspace', 'team-billing', '--json'],
      { cwd: tempDir, env }
    );
    expect(link.exitCode).toBe(0);
    fs.rmSync(repo, { recursive: true, force: true });

    const reopen = await runCLI(
      ['workspace', 'open', 'team-billing', '--editor', '--json', '--no-interactive'],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );

    expect(reopen.exitCode).toBe(0);
    const payload = parseJson(reopen);
    expect(payload.opened_roots).toEqual([
      {
        kind: 'workspace',
        path: expect.any(String),
      },
      {
        kind: 'initiative',
        name: initiative.initiativeId,
        path: expect.any(String),
      },
    ]);
    expectSameExistingPath(
      payload.opened_roots[0].path,
      getManagedWorkspaceRoot('team-billing', { globalDataDir })
    );
    expectSameExistingPath(payload.opened_roots[1].path, initiative.initiativeRoot);
    expect(payload.skipped_roots).toEqual([
      {
        kind: 'link',
        name: 'api',
        path: expectedRepo,
        reason: 'path-missing',
      },
    ]);
    expect(payload.warnings).toContainEqual(
      expect.objectContaining({
        code: 'workspace_open_link_skipped',
        target: 'links.api.path',
      })
    );
  });

  it('requires an explicit workspace name when multiple local views point at one initiative', async () => {
    const initiative = await setupInitiative();
    const code = createFakeExecutable('code');

    for (const name of ['team-a-billing', 'team-b-billing']) {
      const open = await runCLI(
        [
          'workspace',
          'open',
          name,
          '--initiative',
          `${initiative.storeId}/${initiative.initiativeId}`,
          '--editor',
          '--json',
          '--no-interactive',
        ],
        { cwd: tempDir, env: envWithFakeExecutable(code) }
      );
      expect(open.exitCode).toBe(0);
    }

    const ambiguous = await runCLI(
      [
        'workspace',
        'open',
        '--initiative',
        `${initiative.storeId}/${initiative.initiativeId}`,
        '--editor',
        '--json',
        '--no-interactive',
      ],
      { cwd: tempDir, env: envWithFakeExecutable(code) }
    );

    expect(ambiguous.exitCode).toBe(1);
    expect(parseJson(ambiguous).status[0]).toEqual(
      expect.objectContaining({
        code: 'workspace_initiative_selection_ambiguous',
      })
    );
  });
});
