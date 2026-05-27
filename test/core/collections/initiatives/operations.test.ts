import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as nodeFs from 'node:fs';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  INITIATIVE_FILE_NAME,
  INITIATIVE_FILE_NAMES,
  createCollectionRegistry,
  createInitiative,
  listInitiatives,
  mountCollections,
  parseInitiativeState,
  readInitiative,
  serializeInitiativeState,
  type InitiativeOperationsFileSystem,
  type InitiativeState,
} from '../../../../src/core/collections/index.js';

describe('initiative operations', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = nodeFs.mkdtempSync(path.join(os.tmpdir(), 'openspec-initiatives-operations-'));
  });

  afterEach(() => {
    nodeFs.rmSync(tempDir, { recursive: true, force: true });
  });

  function mountInitiatives(storeRoot = path.join(tempDir, 'context-store')) {
    const collections = createCollectionRegistry([{ id: 'initiatives', mount: 'initiatives' }]);
    return mountCollections({ storeRoot, collections }).require('initiatives');
  }

  function initiativeState(overrides: Partial<InitiativeState> = {}): InitiativeState {
    return {
      version: 1,
      id: 'launch-billing-flow',
      title: 'Launch Billing Flow',
      summary: 'Coordinate billing launch across product, API, and client surfaces.',
      status: 'exploring',
      created: '2026-05-21',
      owners: [],
      metadata: {},
      ...overrides,
    };
  }

  async function writeInitiativeState(
    collection: ReturnType<typeof mountInitiatives>,
    folderName: string,
    state: InitiativeState
  ): Promise<void> {
    await fs.mkdir(collection.resolvePath(folderName), { recursive: true });
    await fs.writeFile(
      collection.resolvePath(`${folderName}/${INITIATIVE_FILE_NAME}`),
      serializeInitiativeState(state),
      'utf-8'
    );
  }

  const realFileSystem: InitiativeOperationsFileSystem = {
    async mkdir(dirPath, options) {
      await fs.mkdir(dirPath, options);
    },

    async writeFile(filePath, content, options) {
      await fs.writeFile(filePath, content, {
        encoding: 'utf-8',
        flag: options.flag ?? 'w',
      });
    },

    async readFile(filePath) {
      return fs.readFile(filePath, 'utf-8');
    },

    async readdir(dirPath, options) {
      return fs.readdir(dirPath, options);
    },

    async rm(dirPath, options) {
      await fs.rm(dirPath, options);
    },
  };

  it('creates the MVP initiative folder shape without links.yaml', async () => {
    const collection = mountInitiatives();

    const created = await createInitiative({
      collection,
      id: 'launch-billing-flow',
      title: 'Launch Billing Flow',
      summary: 'Coordinate billing launch across product, API, and client surfaces.',
      owners: ['platform-team'],
      metadata: { priority: 'high' },
      getCurrentDate: () => '2026-05-21',
    });

    expect(created).toEqual(initiativeState({
      owners: ['platform-team'],
      metadata: { priority: 'high' },
    }));

    for (const fileName of INITIATIVE_FILE_NAMES) {
      expect(nodeFs.existsSync(collection.resolvePath(`launch-billing-flow/${fileName}`))).toBe(
        true
      );
    }
    expect(nodeFs.existsSync(collection.resolvePath('launch-billing-flow/links.yaml'))).toBe(
      false
    );

    expect(
      parseInitiativeState(
        await fs.readFile(
          collection.resolvePath(`launch-billing-flow/${INITIATIVE_FILE_NAME}`),
          'utf-8'
        )
      )
    ).toEqual(created);

    await expect(listInitiatives({ collection })).resolves.toEqual([created]);
  });

  it('fails when creating an initiative that already exists', async () => {
    const collection = mountInitiatives();

    await createInitiative({
      collection,
      id: 'launch-billing-flow',
      title: 'Launch Billing Flow',
      summary: 'Coordinate billing launch.',
      getCurrentDate: () => '2026-05-21',
    });

    await expect(
      createInitiative({
        collection,
        id: 'launch-billing-flow',
        title: 'Replacement',
        summary: 'Do not overwrite existing initiative.',
        getCurrentDate: () => '2026-05-22',
      })
    ).rejects.toThrow(/already exists/u);

    expect(
      parseInitiativeState(
        await fs.readFile(
          collection.resolvePath(`launch-billing-flow/${INITIATIVE_FILE_NAME}`),
          'utf-8'
        )
      ).title
    ).toBe('Launch Billing Flow');
  });

  it('cleans up the initiative folder when a create write fails', async () => {
    const collection = mountInitiatives();
    const failingFileSystem: InitiativeOperationsFileSystem = {
      ...realFileSystem,
      async writeFile(filePath, content, options) {
        if (filePath.endsWith('design.md')) {
          throw new Error('simulated write failure');
        }

        await realFileSystem.writeFile(filePath, content, options);
      },
    };

    await expect(
      createInitiative({
        collection,
        id: 'launch-billing-flow',
        title: 'Launch Billing Flow',
        summary: 'Coordinate billing launch.',
        getCurrentDate: () => '2026-05-21',
        fileSystem: failingFileSystem,
      })
    ).rejects.toThrow(/simulated write failure/u);

    expect(nodeFs.existsSync(collection.resolvePath('launch-billing-flow'))).toBe(false);
    expect(nodeFs.existsSync(collection.resolvePath())).toBe(true);
  });

  it('lists initiatives by valid initiative.yaml and ignores unrelated folders', async () => {
    const collection = mountInitiatives();

    await createInitiative({
      collection,
      id: 'zeta-rollout',
      title: 'Zeta Rollout',
      summary: 'Coordinate zeta rollout.',
      getCurrentDate: () => '2026-05-22',
    });
    await createInitiative({
      collection,
      id: 'alpha-rollout',
      title: 'Alpha Rollout',
      summary: 'Coordinate alpha rollout.',
      getCurrentDate: () => '2026-05-21',
    });

    await fs.mkdir(collection.resolvePath('scratch-notes'), { recursive: true });
    await fs.writeFile(collection.resolvePath('scratch-notes/notes.md'), 'not an initiative');
    await fs.writeFile(collection.resolvePath('loose-file.txt'), 'not a folder');

    await expect(listInitiatives({ collection })).resolves.toEqual([
      initiativeState({
        id: 'alpha-rollout',
        title: 'Alpha Rollout',
        summary: 'Coordinate alpha rollout.',
        created: '2026-05-21',
      }),
      initiativeState({
        id: 'zeta-rollout',
        title: 'Zeta Rollout',
        summary: 'Coordinate zeta rollout.',
        created: '2026-05-22',
      }),
    ]);
  });

  it('returns an empty list when the mounted initiatives folder does not exist', async () => {
    await expect(listInitiatives({ collection: mountInitiatives() })).resolves.toEqual([]);
  });

  it('reads one initiative by id without scanning unrelated folders', async () => {
    const collection = mountInitiatives();

    await writeInitiativeState(collection, 'launch-billing-flow', initiativeState());
    await fs.mkdir(collection.resolvePath('broken-initiative'), { recursive: true });
    await fs.writeFile(
      collection.resolvePath(`broken-initiative/${INITIATIVE_FILE_NAME}`),
      'version: 1\nid: Broken\n',
      'utf-8'
    );

    await expect(
      readInitiative({ collection, id: 'launch-billing-flow' })
    ).resolves.toEqual(initiativeState());
  });

  it('returns null when an exact initiative is absent', async () => {
    await expect(
      readInitiative({ collection: mountInitiatives(), id: 'missing-initiative' })
    ).resolves.toBeNull();
  });

  it('fails when the exact initiative.yaml is invalid', async () => {
    const collection = mountInitiatives();

    await fs.mkdir(collection.resolvePath('broken-initiative'), { recursive: true });
    await fs.writeFile(
      collection.resolvePath(`broken-initiative/${INITIATIVE_FILE_NAME}`),
      'version: 1\nid: Broken\n',
      'utf-8'
    );

    await expect(
      readInitiative({ collection, id: 'broken-initiative' })
    ).rejects.toThrow(/Invalid initiative 'broken-initiative'/u);
  });

  it('requires exact initiative.yaml id to match the folder name', async () => {
    const collection = mountInitiatives();

    await writeInitiativeState(
      collection,
      'folder-name',
      initiativeState({
        id: 'state-name',
        title: 'State Name',
      })
    );

    await expect(
      readInitiative({ collection, id: 'folder-name' })
    ).rejects.toThrow(/id 'state-name' must match folder name/u);
  });

  it('fails loudly when initiative.yaml is invalid', async () => {
    const collection = mountInitiatives();

    await fs.mkdir(collection.resolvePath('broken-initiative'), { recursive: true });
    await fs.writeFile(
      collection.resolvePath(`broken-initiative/${INITIATIVE_FILE_NAME}`),
      'version: 1\nid: Broken\n',
      'utf-8'
    );

    await expect(listInitiatives({ collection })).rejects.toThrow(
      /Invalid initiative 'broken-initiative'/u
    );
  });

  it('requires initiative.yaml id to match the folder name', async () => {
    const collection = mountInitiatives();

    await writeInitiativeState(
      collection,
      'folder-name',
      initiativeState({
        id: 'state-name',
        title: 'State Name',
      })
    );

    await expect(listInitiatives({ collection })).rejects.toThrow(
      /id 'state-name' must match folder name/u
    );
  });

  it('requires the mounted initiatives collection', async () => {
    const collections = createCollectionRegistry([{ id: 'decisions', mount: 'decisions' }]);
    const decisions = mountCollections({
      storeRoot: path.join(tempDir, 'context-store'),
      collections,
    }).require('decisions');

    await expect(
      createInitiative({
        collection: decisions,
        id: 'launch-billing-flow',
        title: 'Launch Billing Flow',
        summary: 'Coordinate billing launch.',
      })
    ).rejects.toThrow(/Expected mounted 'initiatives' collection/u);

    await expect(listInitiatives({ collection: decisions })).rejects.toThrow(
      /Expected mounted 'initiatives' collection/u
    );

    await expect(
      readInitiative({
        collection: decisions,
        id: 'launch-billing-flow',
      })
    ).rejects.toThrow(/Expected mounted 'initiatives' collection/u);
  });
});
