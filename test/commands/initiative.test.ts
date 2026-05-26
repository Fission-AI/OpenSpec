import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { COMMAND_REGISTRY } from '../../src/core/completions/command-registry.js';
import {
  getGlobalDataDir,
  INITIATIVE_FILE_NAMES,
  parseInitiativeState,
  registerContextStore,
  writeContextStoreRegistryState,
  writeContextStoreMetadataState,
} from '../../src/core/index.js';
import { runCLI, type RunCLIResult } from '../helpers/run-cli.js';

describe('initiative command', () => {
  let tempDir: string;
  let dataHome: string;
  let configHome: string;
  let globalDataDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-initiative-command-'));
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

  async function setupRegisteredStore(id = 'team-context'): Promise<string> {
    const storeRoot = mkdir(`stores/${id}`);
    await registerContextStore({
      id,
      localPath: storeRoot,
      globalDataDir,
    });
    return storeRoot;
  }

  async function setupUnregisteredStore(id = 'scratch-context'): Promise<string> {
    const storeRoot = mkdir(`stores/${id}`);
    await writeContextStoreMetadataState(storeRoot, {
      version: 1,
      id,
    });
    return storeRoot;
  }

  function initiativeRoot(storeRoot: string, id: string): string {
    return path.join(storeRoot, 'initiatives', id);
  }

  function readInitiativeState(storeRoot: string, id: string) {
    return parseInitiativeState(
      fs.readFileSync(path.join(initiativeRoot(storeRoot, id), 'initiative.yaml'), 'utf-8')
    );
  }

  function writeInvalidInitiative(storeRoot: string, id: string): void {
    fs.mkdirSync(initiativeRoot(storeRoot, id), { recursive: true });
    fs.writeFileSync(
      path.join(initiativeRoot(storeRoot, id), 'initiative.yaml'),
      'version: 1\nid: Invalid\n',
      'utf-8'
    );
  }

  it('creates an initiative in a registered context store with JSON output', async () => {
    const storeRoot = await setupRegisteredStore('team-context');

    const result = await runCLI(
      [
        'initiative',
        'create',
        'launch-billing-flow',
        '--store',
        'team-context',
        '--title',
        'Launch Billing Flow',
        '--summary',
        'Coordinate billing launch work.',
        '--json',
      ],
      { cwd: tempDir, env }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    const payload = parseJson(result);
    expect(payload.status).toEqual([]);
    expect(payload.context_store).toEqual({
      id: 'team-context',
      root: expect.any(String),
      source: 'registry',
    });
    expectSameExistingPath(payload.context_store.root, storeRoot);
    expect(payload.initiative).toEqual(
      expect.objectContaining({
        id: 'launch-billing-flow',
        title: 'Launch Billing Flow',
        summary: 'Coordinate billing launch work.',
        status: 'exploring',
        owners: [],
        metadata: {},
        root: expect.any(String),
        store_path: 'initiatives/launch-billing-flow',
      })
    );
    expectSameExistingPath(payload.initiative.root, initiativeRoot(storeRoot, 'launch-billing-flow'));
    expect(payload.initiative.created).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    expect(payload.created_files).toEqual([...INITIATIVE_FILE_NAMES]);

    for (const fileName of INITIATIVE_FILE_NAMES) {
      expect(fs.existsSync(path.join(initiativeRoot(storeRoot, 'launch-billing-flow'), fileName))).toBe(true);
    }
    expect(fs.existsSync(path.join(initiativeRoot(storeRoot, 'launch-billing-flow'), 'links.yaml'))).toBe(false);
    expect(readInitiativeState(storeRoot, 'launch-billing-flow')).toEqual(
      expect.objectContaining({
        id: 'launch-billing-flow',
        title: 'Launch Billing Flow',
        summary: 'Coordinate billing launch work.',
      })
    );
  });

  it('lists initiatives from an explicit context store path in sorted order', async () => {
    const storeRoot = await setupUnregisteredStore('scratch-context');

    for (const id of ['zeta-launch', 'alpha-launch']) {
      const create = await runCLI(
        [
          'initiative',
          'create',
          id,
          '--store-path',
          storeRoot,
          '--title',
          id,
          '--summary',
          `Summary for ${id}.`,
          '--json',
        ],
        { cwd: tempDir, env }
      );
      expect(create.exitCode).toBe(0);
    }

    const list = await runCLI(['initiative', 'list', '--store-path', storeRoot, '--json'], {
      cwd: tempDir,
      env,
    });

    expect(list.exitCode).toBe(0);
    expect(list.stderr).toBe('');
    const payload = parseJson(list);
    expect(payload.status).toEqual([]);
    expect(payload.context_store).toEqual({
      id: 'scratch-context',
      root: expect.any(String),
      source: 'path',
    });
    expectSameExistingPath(payload.context_store.root, storeRoot);
    expect(payload.initiatives.map((initiative: any) => initiative.id)).toEqual([
      'alpha-launch',
      'zeta-launch',
    ]);
  });

  it('prints readable human output for create and list', async () => {
    const storeRoot = await setupRegisteredStore('team-context');

    const create = await runCLI(
      [
        'initiative',
        'create',
        'launch-billing-flow',
        '--store',
        'team-context',
        '--title',
        'Launch Billing Flow',
        '--summary',
        'Coordinate billing launch work.',
      ],
      { cwd: tempDir, env }
    );

    expect(create.exitCode).toBe(0);
    expect(create.stdout).toContain('Created initiative');
    expect(create.stdout).toContain('ID: launch-billing-flow');
    expect(create.stdout).toContain('Context store: team-context');
    expect(create.stdout).toContain(
      `Location: ${expectedExistingPath(initiativeRoot(storeRoot, 'launch-billing-flow'))}`
    );
    expect(create.stdout).toContain('Created files (6):');
    expect(create.stdout).toContain('openspec initiative list --store team-context');

    const list = await runCLI(['initiative', 'ls', '--store', 'team-context'], {
      cwd: tempDir,
      env,
    });

    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain('OpenSpec initiatives in team-context (1)');
    expect(list.stdout).toContain('launch-billing-flow');
    expect(list.stdout).not.toContain('Status: exploring');
    expect(list.stdout).toContain(`Location: ${expectedExistingPath(storeRoot)}`);
  });

  it('lists initiatives across registered context stores by default', async () => {
    const platformRoot = await setupRegisteredStore('platform');
    const teamRoot = await setupRegisteredStore('team-context');

    for (const [store, id] of [
      ['team-context', 'zeta-launch'],
      ['platform', 'billing-launch'],
      ['team-context', 'alpha-launch'],
    ]) {
      const create = await runCLI(
        [
          'initiative',
          'create',
          id,
          '--store',
          store,
          '--title',
          id,
          '--summary',
          `Summary for ${id}.`,
          '--json',
        ],
        { cwd: tempDir, env }
      );
      expect(create.exitCode).toBe(0);
    }

    const list = await runCLI(['initiative', 'list', '--json'], { cwd: tempDir, env });

    expect(list.exitCode).toBe(0);
    expect(list.stderr).toBe('');
    const payload = parseJson(list);
    expect(payload.context_store).toBeNull();
    expect(payload.context_stores.map((store: any) => store.context_store.id)).toEqual([
      'platform',
      'team-context',
    ]);
    expect(payload.initiatives.map((initiative: any) => `${initiative.store}/${initiative.id}`)).toEqual([
      'platform/billing-launch',
      'team-context/alpha-launch',
      'team-context/zeta-launch',
    ]);
    expect(payload.initiatives[0]).toEqual(
      expect.objectContaining({
        root: expect.any(String),
        store_path: 'initiatives/billing-launch',
      })
    );
    expect(payload.initiatives[1]).toEqual(
      expect.objectContaining({
        root: expect.any(String),
        store_path: 'initiatives/alpha-launch',
      })
    );
    expectSameExistingPath(
      payload.initiatives[0].root,
      initiativeRoot(platformRoot, 'billing-launch')
    );
    expectSameExistingPath(payload.initiatives[1].root, initiativeRoot(teamRoot, 'alpha-launch'));
  });

  it('prints compact all-store human output without initiative statuses', async () => {
    await setupRegisteredStore('platform');
    await setupRegisteredStore('team-context');
    await runCLI(
      [
        'initiative',
        'create',
        'billing-launch',
        '--store',
        'platform',
        '--title',
        'Billing Launch',
        '--summary',
        'Coordinate billing launch work.',
      ],
      { cwd: tempDir, env }
    );

    const list = await runCLI(['initiative', 'ls'], { cwd: tempDir, env });

    expect(list.exitCode).toBe(0);
    expect(list.stdout).toContain('OpenSpec initiatives (1 across 2 stores)');
    expect(list.stdout).toContain('ID');
    expect(list.stdout).toContain('Store');
    expect(list.stdout).toContain('Title');
    expect(list.stdout).toContain('billing-launch');
    expect(list.stdout).toContain('platform');
    expect(list.stdout).toContain('Billing Launch');
    expect(list.stdout).not.toContain('Status:');
  });

  it('shows one initiative by searching registered context stores', async () => {
    const storeRoot = await setupRegisteredStore('platform');
    const create = await runCLI(
      [
        'initiative',
        'create',
        'billing-launch',
        '--store',
        'platform',
        '--title',
        'Billing Launch',
        '--summary',
        'Coordinate billing launch work.',
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(create.exitCode).toBe(0);

    const show = await runCLI(['initiative', 'show', 'billing-launch', '--json'], {
      cwd: tempDir,
      env,
    });

    expect(show.exitCode).toBe(0);
    expect(show.stderr).toBe('');
    const payload = parseJson(show);
    expect(payload).toEqual({
      context_store: {
        id: 'platform',
        root: expect.any(String),
      },
      initiative: {
        version: 1,
        id: 'billing-launch',
        title: 'Billing Launch',
        summary: 'Coordinate billing launch work.',
        created: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
        root: expect.any(String),
        store_path: 'initiatives/billing-launch',
        metadata_path: expect.any(String),
      },
      status: [],
    });
    expectSameExistingPath(payload.context_store.root, storeRoot);
    expectSameExistingPath(payload.initiative.root, initiativeRoot(storeRoot, 'billing-launch'));
    expectSameExistingPath(
      payload.initiative.metadata_path,
      path.join(initiativeRoot(storeRoot, 'billing-launch'), 'initiative.yaml')
    );
    expect(payload.initiative).not.toHaveProperty('status');
    expect(payload.initiative).not.toHaveProperty('owners');
    expect(payload.initiative).not.toHaveProperty('metadata');
    expect(payload.context_store).not.toHaveProperty('source');
    expect(payload).not.toHaveProperty('files');
    expect(payload).not.toHaveProperty('matches');
  });

  it('shows an initiative from an explicit context store path', async () => {
    const storeRoot = await setupUnregisteredStore('scratch-context');
    const create = await runCLI(
      [
        'initiative',
        'create',
        'scratch-launch',
        '--store-path',
        storeRoot,
        '--title',
        'Scratch Launch',
        '--summary',
        'Coordinate scratch launch work.',
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(create.exitCode).toBe(0);

    const show = await runCLI(
      ['initiative', 'show', 'scratch-launch', '--store-path', storeRoot, '--json'],
      { cwd: tempDir, env }
    );

    expect(show.exitCode).toBe(0);
    expect(parseJson(show).context_store).toEqual({
      id: 'scratch-context',
      root: expect.any(String),
    });
    expectSameExistingPath(parseJson(show).context_store.root, storeRoot);
  });

  it('prints compact human output for initiative show', async () => {
    const storeRoot = await setupRegisteredStore('platform');
    await runCLI(
      [
        'initiative',
        'create',
        'billing-launch',
        '--store',
        'platform',
        '--title',
        'Billing Launch',
        '--summary',
        'Coordinate billing launch work.',
      ],
      { cwd: tempDir, env }
    );

    const show = await runCLI(['initiative', 'show', 'billing-launch'], { cwd: tempDir, env });

    expect(show.exitCode).toBe(0);
    expect(show.stdout).toContain('OpenSpec initiative: Billing Launch');
    expect(show.stdout).toContain('ID: billing-launch');
    expect(show.stdout).toContain('Summary: Coordinate billing launch work.');
    expect(show.stdout).toContain('Context store: platform');
    const expectedInitiativeRoot = expectedExistingPath(initiativeRoot(storeRoot, 'billing-launch'));
    expect(show.stdout).toContain(`Location: ${expectedInitiativeRoot}`);
    expect(show.stdout).toContain(
      `Metadata: ${path.join(expectedInitiativeRoot, 'initiative.yaml')}`
    );
    expect(show.stdout).not.toContain('Status:');
    expect(show.stdout).not.toContain('Owners:');
  });

  it('does not let unrelated invalid initiatives block exact show lookup', async () => {
    const storeRoot = await setupRegisteredStore('platform');
    const create = await runCLI(
      [
        'initiative',
        'create',
        'billing-launch',
        '--store',
        'platform',
        '--title',
        'Billing Launch',
        '--summary',
        'Coordinate billing launch work.',
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(create.exitCode).toBe(0);
    writeInvalidInitiative(storeRoot, 'broken-launch');

    const show = await runCLI(['initiative', 'show', 'billing-launch', '--json'], {
      cwd: tempDir,
      env,
    });

    expect(show.exitCode).toBe(0);
    expect(parseJson(show).initiative.id).toBe('billing-launch');
  });

  it('reports show ambiguity and incomplete lookups with diagnostic matches', async () => {
    const platformRoot = await setupRegisteredStore('platform');
    const financeRoot = await setupRegisteredStore('finance');

    for (const store of ['platform', 'finance']) {
      const create = await runCLI(
        [
          'initiative',
          'create',
          'billing-launch',
          '--store',
          store,
          '--title',
          'Billing Launch',
          '--summary',
          `Coordinate ${store} billing launch work.`,
          '--json',
        ],
        { cwd: tempDir, env }
      );
      expect(create.exitCode).toBe(0);
    }

    const ambiguous = await runCLI(['initiative', 'show', 'billing-launch', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(ambiguous.exitCode).toBe(1);
    const ambiguousPayload = parseJson(ambiguous);
    expect(ambiguousPayload).not.toHaveProperty('matches');
    expect(ambiguousPayload.status[0]).toEqual(
      expect.objectContaining({
        code: 'initiative_ambiguous',
        details: {
          matches: [
            expect.objectContaining({
              context_store: { id: 'finance', root: expect.any(String) },
            }),
            expect.objectContaining({
              context_store: { id: 'platform', root: expect.any(String) },
            }),
          ],
        },
      })
    );
    expectSameExistingPath(
      ambiguousPayload.status[0].details.matches[0].context_store.root,
      financeRoot
    );
    expectSameExistingPath(
      ambiguousPayload.status[0].details.matches[1].context_store.root,
      platformRoot
    );

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

    const incomplete = await runCLI(['initiative', 'show', 'billing-launch', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(incomplete.exitCode).toBe(1);
    const incompletePayload = parseJson(incomplete);
    expect(incompletePayload.status[0]).toEqual(
      expect.objectContaining({
        code: 'initiative_lookup_incomplete',
        details: {
          matches: [
            expect.objectContaining({
              context_store: { id: 'platform', root: expect.any(String) },
            }),
          ],
        },
      })
    );
    expectSameExistingPath(
      incompletePayload.status[0].details.matches[0].context_store.root,
      platformRoot
    );
  });

  it('reports not found and invalid exact initiative show failures', async () => {
    const storeRoot = await setupRegisteredStore('platform');

    const missing = await runCLI(['initiative', 'show', 'missing-launch', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(missing.exitCode).toBe(1);
    expect(parseJson(missing).status[0]).toEqual(
      expect.objectContaining({
        code: 'initiative_not_found',
      })
    );

    writeInvalidInitiative(storeRoot, 'broken-launch');
    const invalid = await runCLI(['initiative', 'show', 'broken-launch', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(invalid.exitCode).toBe(1);
    expect(parseJson(invalid).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_initiative',
      })
    );

    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          platform: {
            backend: {
              type: 'git',
              local_path: storeRoot,
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
    const invalidWithUnreadableStore = await runCLI(['initiative', 'show', 'broken-launch', '--json'], {
      cwd: tempDir,
      env,
    });
    expect(invalidWithUnreadableStore.exitCode).toBe(1);
    expect(parseJson(invalidWithUnreadableStore).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_initiative',
        target: 'initiative',
      })
    );
  });

  it('reports all-store empty and partial-read initiative list states', async () => {
    const empty = await runCLI(['initiative', 'list'], { cwd: tempDir, env });
    expect(empty.exitCode).toBe(0);
    expect(empty.stdout).toContain('No initiatives found because no context stores are registered.');

    const readableRoot = await setupRegisteredStore('team-context');
    await runCLI(
      [
        'initiative',
        'create',
        'billing-launch',
        '--store',
        'team-context',
        '--title',
        'Billing Launch',
        '--summary',
        'Coordinate billing launch work.',
      ],
      { cwd: tempDir, env }
    );
    await writeContextStoreRegistryState(
      {
        version: 1,
        stores: {
          'broken-context': {
            backend: {
              type: 'git',
              local_path: path.join(tempDir, 'missing-context'),
            },
          },
          'team-context': {
            backend: {
              type: 'git',
              local_path: readableRoot,
            },
          },
        },
      },
      { globalDataDir }
    );

    const partial = await runCLI(['initiative', 'list', '--json'], { cwd: tempDir, env });
    expect(partial.exitCode).toBe(0);
    const partialPayload = parseJson(partial);
    expect(partialPayload.initiatives.map((initiative: any) => initiative.id)).toEqual([
      'billing-launch',
    ]);
    expect(partialPayload.status[0]).toEqual(
      expect.objectContaining({
        severity: 'warning',
        code: 'context_stores_partially_unreadable',
        fix: 'openspec context-store doctor',
      })
    );

    const invalidRoot = await setupRegisteredStore('invalid-context');
    writeInvalidInitiative(invalidRoot, 'broken-launch');
    const invalidPartial = await runCLI(['initiative', 'list', '--json'], { cwd: tempDir, env });
    expect(invalidPartial.exitCode).toBe(0);
    const invalidPartialPayload = parseJson(invalidPartial);
    expect(invalidPartialPayload.initiatives.map((initiative: any) => initiative.id)).toEqual([
      'billing-launch',
    ]);
    expect(invalidPartialPayload.status).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'context_stores_partially_unreadable',
        }),
        expect.objectContaining({
          code: 'initiative_collections_partially_invalid',
          fix: 'Fix the invalid initiative folder state and retry.',
        }),
      ])
    );
    const invalidStore = invalidPartialPayload.context_stores.find(
      (store: any) => store.context_store.id === 'invalid-context'
    );
    expect(invalidStore?.status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_initiative',
        target: 'initiative',
      })
    );

    fs.rmSync(readableRoot, { recursive: true, force: true });
    const allInvalid = await runCLI(['initiative', 'list', '--json'], { cwd: tempDir, env });
    expect(allInvalid.exitCode).toBe(1);
    expect(parseJson(allInvalid).status[0]).toEqual(
      expect.objectContaining({
        code: 'initiative_collections_invalid',
        target: 'initiative',
        fix: 'Fix the invalid initiative folder state and retry.',
      })
    );

    fs.rmSync(invalidRoot, { recursive: true, force: true });
    const allUnreadable = await runCLI(['initiative', 'list', '--json'], { cwd: tempDir, env });
    expect(allUnreadable.exitCode).toBe(1);
    expect(parseJson(allUnreadable).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_stores_unreadable',
        fix: 'openspec context-store doctor',
      })
    );
  });

  it('reports structured JSON errors for selector and create failures', async () => {
    const storeRoot = await setupRegisteredStore('team-context');

    const missingSelector = await runCLI(
      [
        'initiative',
        'create',
        'launch-billing-flow',
        '--title',
        'Launch Billing Flow',
        '--summary',
        'Coordinate billing launch work.',
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(missingSelector.exitCode).toBe(1);
    expect(parseJson(missingSelector).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_required',
        target: 'context_store',
      })
    );

    const conflict = await runCLI(
      ['initiative', 'list', '--store', 'team-context', '--store-path', storeRoot, '--json'],
      { cwd: tempDir, env }
    );
    expect(conflict.exitCode).toBe(1);
    expect(parseJson(conflict).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_selector_conflict',
      })
    );

    const blankSelector = await runCLI(
      ['initiative', 'list', '--store', '', '--json'],
      { cwd: tempDir, env }
    );
    expect(blankSelector.exitCode).toBe(1);
    expect(parseJson(blankSelector).status[0]).toEqual(
      expect.objectContaining({
        code: 'invalid_context_store_id',
      })
    );

    const unknownStore = await runCLI(
      ['initiative', 'list', '--store', 'unknown-context', '--json'],
      { cwd: tempDir, env }
    );
    expect(unknownStore.exitCode).toBe(1);
    expect(parseJson(unknownStore).status[0]).toEqual(
      expect.objectContaining({
        code: 'context_store_not_found',
      })
    );

    const missingTitle = await runCLI(
      [
        'initiative',
        'create',
        'missing-title',
        '--store',
        'team-context',
        '--summary',
        'Coordinate billing launch work.',
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(missingTitle.exitCode).toBe(1);
    expect(parseJson(missingTitle).status[0]).toEqual(
      expect.objectContaining({
        code: 'initiative_title_required',
        target: 'initiative.title',
      })
    );

    const create = await runCLI(
      [
        'initiative',
        'create',
        'duplicate-launch',
        '--store',
        'team-context',
        '--title',
        'Duplicate Launch',
        '--summary',
        'Coordinate duplicate launch work.',
      ],
      { cwd: tempDir, env }
    );
    expect(create.exitCode).toBe(0);

    const duplicate = await runCLI(
      [
        'initiative',
        'create',
        'duplicate-launch',
        '--store',
        'team-context',
        '--title',
        'Duplicate Launch',
        '--summary',
        'Coordinate duplicate launch work.',
        '--json',
      ],
      { cwd: tempDir, env }
    );
    expect(duplicate.exitCode).toBe(1);
    expect(parseJson(duplicate).status[0]).toEqual(
      expect.objectContaining({
        code: 'initiative_already_exists',
        target: 'initiative.id',
      })
    );
  });

  it('registers initiative subcommands for shell completions', () => {
    const initiative = COMMAND_REGISTRY.find((command) => command.name === 'initiative');
    const create = initiative?.subcommands?.find((command) => command.name === 'create');
    const show = initiative?.subcommands?.find((command) => command.name === 'show');
    const list = initiative?.subcommands?.find((command) => command.name === 'list');
    const ls = initiative?.subcommands?.find((command) => command.name === 'ls');

    expect(initiative?.subcommands?.map((command) => command.name)).toEqual([
      'create',
      'show',
      'list',
      'ls',
    ]);
    expect(create?.positionals).toEqual([
      {
        name: 'id',
        optional: true,
      },
    ]);
    expect(create?.flags?.map((flag) => flag.name)).toEqual([
      'store',
      'store-path',
      'title',
      'summary',
      'json',
    ]);
    expect(create?.flags?.find((flag) => flag.name === 'store')?.takesValue).toBe(true);
    expect(create?.flags?.find((flag) => flag.name === 'store-path')?.takesValue).toBe(true);
    expect(show?.positionals).toEqual([
      {
        name: 'id',
      },
    ]);
    expect(show?.flags?.map((flag) => flag.name)).toEqual(['store', 'store-path', 'json']);
    expect(list?.flags?.map((flag) => flag.name)).toEqual(['store', 'store-path', 'json']);
    expect(ls?.flags?.map((flag) => flag.name)).toEqual(['store', 'store-path', 'json']);
  });
});
