import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  getGlobalDataDir,
  registerContextStore,
  writeContextStoreMetadataState,
  writeContextStoreRegistryState,
} from '../../src/core/index.js';
import { readChangeMetadata } from '../../src/utils/change-metadata.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

describe('repo-local change initiative links', () => {
  let tempDir: string;
  let dataHome: string;
  let configHome: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-change-initiative-link-'));
    tempDir = fs.realpathSync.native(tempDir);
    dataHome = path.join(tempDir, 'data');
    configHome = path.join(tempDir, 'config');
    env = {
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: configHome,
      OPEN_SPEC_INTERACTIVE: '0',
      OPENSPEC_TELEMETRY: '0',
    };
    globalDataDir = getGlobalDataDir({ env });
    fs.mkdirSync(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
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

  function mkdir(relativePath: string): string {
    const dir = path.join(tempDir, relativePath);
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function canonicalPath(existingPath: string): string {
    return fs.realpathSync.native(existingPath);
  }

  function expectSameExistingPath(actualPath: string, expectedPath: string): void {
    expect(canonicalPath(actualPath)).toBe(canonicalPath(expectedPath));
  }

  async function setupRegisteredStore(store = 'platform'): Promise<string> {
    const storeRoot = mkdir(`stores/${store}`);
    await registerContextStore({
      id: store,
      localPath: storeRoot,
      globalDataDir,
    });
    return storeRoot;
  }

  async function setupUnregisteredStore(store = 'scratch-context'): Promise<string> {
    const storeRoot = mkdir(`stores/${store}`);
    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id: store,
    });
    return storeRoot;
  }

  async function createInitiative(
    id = 'billing-launch',
    selector: ['--store' | '--store-path', string] = ['--store', 'platform']
  ): Promise<void> {
    const result = await runCLI(
      [
        'initiative',
        'create',
        id,
        selector[0],
        selector[1],
        '--title',
        id,
        '--summary',
        `Coordinate ${id}.`,
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(result.exitCode).toBe(0);
  }

  function changeDir(id: string): string {
    return path.join(tempDir, 'openspec', 'changes', id);
  }

  function metadataPath(id: string): string {
    return path.join(changeDir(id), '.openspec.yaml');
  }

  function expectStoredLinkOnly(changeId: string, store: string, initiativeId: string, storeRoot: string): void {
    const metadata = readChangeMetadata(changeDir(changeId), tempDir);
    expect(metadata?.initiative).toEqual({
      store,
      id: initiativeId,
    });

    const raw = fs.readFileSync(metadataPath(changeId), 'utf-8');
    expect(raw).toContain('initiative:');
    expect(raw).toContain(`store: ${store}`);
    expect(raw).toContain(`id: ${initiativeId}`);
    expect(raw).not.toContain(storeRoot);
    expect(raw).not.toContain('store_path');
    expect(raw).not.toContain('metadata_path');
    expect(raw).not.toContain('summary:');
  }

  it('creates a repo-local change linked to a uniquely found initiative', async () => {
    const storeRoot = await setupRegisteredStore('platform');
    await createInitiative('billing-launch');

    const result = await runCLI(
      ['new', 'change', 'add-billing-api', '--initiative', 'billing-launch', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const payload = parseJson(result);
    expect(payload).toEqual({
      change: {
        id: 'add-billing-api',
        path: expect.any(String),
        metadataPath: expect.any(String),
        schema: 'spec-driven',
      },
      initiative: {
        store: 'platform',
        id: 'billing-launch',
      },
    });
    expectSameExistingPath(payload.change.path, changeDir('add-billing-api'));
    expectSameExistingPath(payload.change.metadataPath, metadataPath('add-billing-api'));
    expect(JSON.stringify(payload).toLowerCase()).not.toContain('next');
    expectStoredLinkOnly('add-billing-api', 'platform', 'billing-launch', storeRoot);
    expect(fs.existsSync(path.join(storeRoot, 'initiatives', 'billing-launch', 'links.yaml'))).toBe(false);
  });

  it('prints factual human output for initiative-linked creation', async () => {
    await setupRegisteredStore('platform');
    await createInitiative('billing-launch');

    const result = await runCLI(
      ['new', 'change', 'add-billing-ui', '--initiative', 'platform/billing-launch'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    const output = result.stdout + result.stderr;
    expect(output).toContain("Created change 'add-billing-ui'");
    expect(output).toContain('Schema: spec-driven');
    expect(output).toContain('Initiative: platform/billing-launch');
    expect(output).not.toContain('Next:');
  });

  it('creates a linked change with an explicit context store selector', async () => {
    const storeRoot = await setupRegisteredStore('platform');
    await createInitiative('billing-launch');

    const result = await runCLI(
      ['new', 'change', 'store-selected-link', '--initiative', 'billing-launch', '--store', 'platform', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).initiative).toEqual({
      store: 'platform',
      id: 'billing-launch',
    });
    expectStoredLinkOnly('store-selected-link', 'platform', 'billing-launch', storeRoot);
  });

  it('rejects a blank create-time initiative selector without writing a change', async () => {
    const result = await runCLI(
      ['new', 'change', 'blank-linked-change', '--initiative', '', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    const payload = parseJson(result);
    expect(payload.change).toBeNull();
    expect(payload.status[0].message).toContain('Pass --initiative <id>');
    expect(fs.existsSync(changeDir('blank-linked-change'))).toBe(false);
  });

  it('creates a linked change with an explicit context store path selector', async () => {
    const storeRoot = await setupUnregisteredStore('scratch-context');
    await createInitiative('scratch-launch', ['--store-path', storeRoot]);

    const result = await runCLI(
      [
        'new',
        'change',
        'path-selected-link',
        '--initiative',
        'scratch-launch',
        '--store-path',
        storeRoot,
        '--json',
      ],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(parseJson(result).initiative).toEqual({
      store: 'scratch-context',
      id: 'scratch-launch',
    });
    expectStoredLinkOnly('path-selected-link', 'scratch-context', 'scratch-launch', storeRoot);
  });

  it('does not write a change when initiative lookup fails', async () => {
    await setupRegisteredStore('platform');

    const result = await runCLI(
      ['new', 'change', 'missing-linked-change', '--initiative', 'missing-launch', '--json'],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(1);
    const payload = parseJson(result);
    expect(payload.change).toBeNull();
    expect(payload.status[0]).toEqual(expect.objectContaining({ code: 'initiative_not_found' }));
    expect(payload.status[0].fix).toBe('openspec initiative list');
    expect(fs.existsSync(changeDir('missing-linked-change'))).toBe(false);
  });

  it('reuses initiative show ambiguity and incomplete lookup behavior before writing', async () => {
    const platformRoot = await setupRegisteredStore('platform');
    await createInitiative('billing-launch', ['--store', 'platform']);
    await setupRegisteredStore('finance');
    await createInitiative('billing-launch', ['--store', 'finance']);

    const ambiguous = await runCLI(
      ['new', 'change', 'ambiguous-linked-change', '--initiative', 'billing-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(ambiguous.exitCode).toBe(1);
    expect(parseJson(ambiguous).status[0]).toEqual(
      expect.objectContaining({ code: 'initiative_ambiguous' })
    );
    expect(fs.existsSync(changeDir('ambiguous-linked-change'))).toBe(false);

    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          platform: {
            backend: {
              type: 'git',
              local_path: platformRoot,
            },
          },
          'missing-context': {
            backend: {
              type: 'git',
              local_path: path.join(tempDir, 'missing-context'),
            },
          },
        },
      },
      { globalDataDir }
    );

    const incomplete = await runCLI(
      ['new', 'change', 'incomplete-linked-change', '--initiative', 'billing-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(incomplete.exitCode).toBe(1);
    expect(parseJson(incomplete).status[0]).toEqual(
      expect.objectContaining({ code: 'initiative_lookup_incomplete' })
    );
    expect(fs.existsSync(changeDir('incomplete-linked-change'))).toBe(false);
  });

  it('does not write an existing change when set change initiative lookup fails', async () => {
    const platformRoot = await setupRegisteredStore('platform');
    const create = await runCLI(['new', 'change', 'set-lookup-failure', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(create.exitCode).toBe(0);
    const before = fs.readFileSync(metadataPath('set-lookup-failure'), 'utf-8');

    const missing = await runCLI(
      ['set', 'change', 'set-lookup-failure', '--initiative', 'missing-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(missing.exitCode).toBe(1);
    const missingPayload = parseJson(missing);
    expect(missingPayload.status[0]).toEqual(expect.objectContaining({ code: 'initiative_not_found' }));
    expect(missingPayload.status[0].fix).toBe('openspec initiative list');
    expect(fs.readFileSync(metadataPath('set-lookup-failure'), 'utf-8')).toBe(before);

    await createInitiative('billing-launch', ['--store', 'platform']);
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          platform: {
            backend: {
              type: 'git',
              local_path: platformRoot,
            },
          },
          'missing-context': {
            backend: {
              type: 'git',
              local_path: path.join(tempDir, 'missing-context'),
            },
          },
        },
      },
      { globalDataDir }
    );

    const incomplete = await runCLI(
      ['set', 'change', 'set-lookup-failure', '--initiative', 'billing-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(incomplete.exitCode).toBe(1);
    expect(parseJson(incomplete).status[0]).toEqual(
      expect.objectContaining({ code: 'initiative_lookup_incomplete' })
    );
    expect(fs.readFileSync(metadataPath('set-lookup-failure'), 'utf-8')).toBe(before);

    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          platform: {
            backend: {
              type: 'git',
              local_path: platformRoot,
            },
          },
        },
      },
      { globalDataDir }
    );
    await setupRegisteredStore('finance');
    await createInitiative('billing-launch', ['--store', 'finance']);

    const ambiguous = await runCLI(
      ['set', 'change', 'set-lookup-failure', '--initiative', 'billing-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(ambiguous.exitCode).toBe(1);
    expect(parseJson(ambiguous).status[0]).toEqual(
      expect.objectContaining({ code: 'initiative_ambiguous' })
    );
    expect(parseJson(ambiguous).status[0].fix).toBe(
      'openspec initiative show billing-launch --store <store>'
    );
    expect(fs.readFileSync(metadataPath('set-lookup-failure'), 'utf-8')).toBe(before);
  });

  it('refuses initiative-linked creation from a workspace planning home', async () => {
    await setupRegisteredStore('platform');
    await createInitiative('billing-launch');
    const api = mkdir('linked-api');

    const setup = await runCLI(
      ['workspace', 'setup', '--no-interactive', '--json', '--name', 'platform', '--link', `api=${api}`],
      { cwd: tempDir, env }
    );
    expect(setup.exitCode).toBe(0);
    const workspaceRoot = parseJson(setup).workspace.root;

    const result = await runCLI(
      ['new', 'change', 'workspace-linked-change', '--initiative', 'billing-launch', '--json'],
      { cwd: workspaceRoot, env }
    );

    expect(result.exitCode).toBe(1);
    const payload = parseJson(result);
    expect(payload.status[0].message).toContain('repo-local changes');
    expect(fs.existsSync(path.join(workspaceRoot, 'changes', 'workspace-linked-change'))).toBe(false);
  });

  it('sets and surfaces initiative links without resolving the initiative during status or instructions', async () => {
    const storeRoot = await setupUnregisteredStore('scratch-context');
    await createInitiative('scratch-launch', ['--store-path', storeRoot]);
    const create = await runCLI(['new', 'change', 'recover-linked-change', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(create.exitCode).toBe(0);

    const set = await runCLI(
      [
        'set',
        'change',
        'recover-linked-change',
        '--initiative',
        'scratch-launch',
        '--store-path',
        storeRoot,
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(set.exitCode).toBe(0);
    expect(parseJson(set)).toEqual(
      expect.objectContaining({
        initiative: {
          store: 'scratch-context',
          id: 'scratch-launch',
        },
        updated: true,
      })
    );
    expectStoredLinkOnly('recover-linked-change', 'scratch-context', 'scratch-launch', storeRoot);
    expect(fs.existsSync(path.join(storeRoot, 'initiatives', 'scratch-launch', 'links.yaml'))).toBe(false);

    fs.rmSync(storeRoot, { recursive: true, force: true });

    const status = await runCLI(['status', '--change', 'recover-linked-change', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(status.exitCode).toBe(0);
    const statusPayload = parseJson(status);
    expect(statusPayload.initiative).toEqual({
      store: 'scratch-context',
      id: 'scratch-launch',
    });
    expect(statusPayload.nextSteps).toEqual(expect.any(Array));
    expect(statusPayload.nextSteps.length).toBeGreaterThan(0);

    const humanStatus = await runCLI(['status', '--change', 'recover-linked-change'], {
      cwd: tempDir,
      env,
    });
    expect(humanStatus.exitCode).toBe(0);
    expect(humanStatus.stdout).toContain('Initiative: scratch-context/scratch-launch');

    const instructions = await runCLI(
      ['instructions', 'proposal', '--change', 'recover-linked-change'],
      { cwd: tempDir, env }
    );
    expect(instructions.exitCode).toBe(0);
    expect(instructions.stdout).toContain('<initiative store="scratch-context" id="scratch-launch" />');

    const applyInstructions = await runCLI(
      ['instructions', 'apply', '--change', 'recover-linked-change', '--json'],
      { cwd: tempDir, env }
    );
    expect(applyInstructions.exitCode).toBe(0);
    expect(parseJson(applyInstructions).initiative).toEqual({
      store: 'scratch-context',
      id: 'scratch-launch',
    });
  });

  it('makes same-link set idempotent and rejects different-link conflicts without writing', async () => {
    await setupRegisteredStore('platform');
    await createInitiative('billing-launch', ['--store', 'platform']);
    await setupRegisteredStore('finance');
    await createInitiative('finance-launch', ['--store', 'finance']);

    const create = await runCLI(
      ['new', 'change', 'idempotent-link', '--initiative', 'platform/billing-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(create.exitCode).toBe(0);
    const before = fs.readFileSync(metadataPath('idempotent-link'), 'utf-8');

    const same = await runCLI(
      ['set', 'change', 'idempotent-link', '--initiative', 'billing-launch', '--store', 'platform', '--json'],
      { cwd: tempDir, env }
    );
    expect(same.exitCode).toBe(0);
    expect(parseJson(same).updated).toBe(false);
    expect(fs.readFileSync(metadataPath('idempotent-link'), 'utf-8')).toBe(before);

    const conflict = await runCLI(
      ['set', 'change', 'idempotent-link', '--initiative', 'finance/finance-launch', '--json'],
      { cwd: tempDir, env }
    );
    expect(conflict.exitCode).toBe(1);
    expect(parseJson(conflict).status[0].message).toContain('already linked');
    expect(fs.readFileSync(metadataPath('idempotent-link'), 'utf-8')).toBe(before);
  });

  it('refuses set change from a workspace planning home', async () => {
    const api = mkdir('linked-api');
    const setup = await runCLI(
      ['workspace', 'setup', '--no-interactive', '--json', '--name', 'platform', '--link', `api=${api}`],
      { cwd: tempDir, env }
    );
    expect(setup.exitCode).toBe(0);
    const workspaceRoot = parseJson(setup).workspace.root;

    const create = await runCLI(['new', 'change', 'workspace-plan'], {
      cwd: workspaceRoot,
      env,
    });
    expect(create.exitCode).toBe(0);

    const result = await runCLI(
      ['set', 'change', 'workspace-plan', '--initiative', 'platform/billing-launch', '--json'],
      { cwd: workspaceRoot, env }
    );

    expect(result.exitCode).toBe(1);
    expect(parseJson(result).status[0].message).toContain('repo-local changes');
  });
});
