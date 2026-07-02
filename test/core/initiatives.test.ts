import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { listInitiatives } from '../../src/core/initiatives.js';
import {
  readStoreRegistryState,
  writeStoreRegistryState,
} from '../../src/core/store/foundation.js';

describe('listInitiatives', () => {
  let tempDir: string;
  let globalDataDir: string;
  let savedXdgDataHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-initiatives-'));
    globalDataDir = path.join(tempDir, 'data', 'openspec');
    savedXdgDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(tempDir, 'xdg');
  });

  afterEach(() => {
    if (savedXdgDataHome === undefined) {
      delete process.env.XDG_DATA_HOME;
    } else {
      process.env.XDG_DATA_HOME = savedXdgDataHome;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function write(relativePath: string, content: string): void {
    const full = path.join(tempDir, relativePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }

  function initiative(root: string, id: string, manifest: string): void {
    write(`${root}/openspec/initiatives/${id}/initiative.yaml`, manifest);
  }

  function change(root: string, id: string, tasks: string): void {
    write(`${root}/openspec/changes/${id}/tasks.md`, tasks);
  }

  async function registerStore(id: string): Promise<string> {
    const storeRoot = path.join(tempDir, 'stores', id);
    fs.mkdirSync(storeRoot, { recursive: true });
    const existing = await readStoreRegistryState({ globalDataDir }).catch(
      () => null
    );
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          ...(existing?.stores ?? {}),
          [id]: { backend: { type: 'git', local_path: storeRoot } },
        },
      },
      { globalDataDir }
    );
    return storeRoot;
  }

  it('rolls up the live status of the changes an initiative groups', async () => {
    initiative(
      'app',
      'smoother-setup',
      'title: Smoother setup\nchanges:\n  - done-change\n  - wip-change\n'
    );
    change('app', 'done-change', '- [x] 1.1 a\n- [x] 1.2 b\n');
    change('app', 'wip-change', '- [x] 1.1 a\n- [ ] 1.2 b\n');

    const [result] = await listInitiatives(path.join(tempDir, 'app'), {
      globalDataDir,
    });

    expect(result.id).toBe('smoother-setup');
    expect(result.title).toBe('Smoother setup');
    expect(result.changesTotal).toBe(2);
    expect(result.changesComplete).toBe(1); // only done-change is fully complete
    expect(result.tasksTotal).toBe(4);
    expect(result.tasksComplete).toBe(3);
    expect(result.shadowsStore).toBeUndefined();
    // Solo/local: no external stores, changes resolve in the initiative's root.
    expect(result.stores).toEqual([]);
    expect(result.changeStatuses.map((c) => c.store)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('rolls up change status across stores named per change (cross-repo)', async () => {
    await registerStore('api-server');
    await registerStore('web-app');
    change('stores/api-server', 'add-payments-api', '- [x] a\n- [x] b\n'); // complete
    change('stores/api-server', 'add-search', '- [x] a\n- [ ] b\n'); // in-progress
    change('stores/web-app', 'add-payments-ui', '- [ ] a\n'); // in-progress
    change('app', 'update-docs', '- [x] a\n'); // complete, local to the initiative

    initiative(
      'app',
      'payments-launch',
      'title: Payments launch\n' +
        'changes:\n' +
        '  - { id: add-payments-api, store: api-server }\n' +
        '  - { id: add-search, store: api-server }\n' +
        '  - { id: add-payments-ui, store: web-app }\n' +
        '  - update-docs\n' +
        '  - { id: add-refunds, store: web-app }\n' // never created -> not-found
    );

    const [info] = await listInitiatives(path.join(tempDir, 'app'), {
      globalDataDir,
    });

    expect(info.changesTotal).toBe(5);
    expect(info.changesComplete).toBe(2); // add-payments-api + update-docs
    expect(info.tasksComplete).toBe(4); // 2 + 1 + 0 + 1 + 0
    expect(info.tasksTotal).toBe(6); // 2 + 2 + 1 + 1 + 0
    expect(info.stores).toEqual(['api-server', 'web-app']);

    const byId = Object.fromEntries(
      info.changeStatuses.map((c) => [c.id, c])
    );
    expect(byId['add-payments-api'].state).toBe('complete');
    expect(byId['add-payments-api'].store).toBe('api-server');
    expect(byId['add-search'].state).toBe('in-progress');
    expect(byId['update-docs'].store).toBeUndefined(); // local
    expect(byId['update-docs'].state).toBe('complete');
    expect(byId['add-refunds'].state).toBe('not-found'); // named store lacks it
  });

  it('marks a change as not-found when its named store is not registered', async () => {
    change('app', 'here-change', '- [x] a\n');
    initiative(
      'app',
      'effort',
      'title: Effort\nchanges:\n  - here-change\n  - { id: elsewhere, store: ghost-store }\n'
    );

    const [info] = await listInitiatives(path.join(tempDir, 'app'), {
      globalDataDir,
    });

    const byId = Object.fromEntries(info.changeStatuses.map((c) => [c.id, c]));
    expect(byId['here-change'].state).toBe('complete');
    expect(byId['elsewhere'].state).toBe('not-found');
    expect(info.stores).toEqual(['ghost-store']); // declared, even if unresolved
  });

  it('flags a local initiative that shadows a canonical one in a referenced store', async () => {
    const storeRoot = await registerStore('acme-plans');
    fs.mkdirSync(
      path.join(storeRoot, 'openspec', 'initiatives', 'smoother-setup'),
      { recursive: true }
    );
    fs.writeFileSync(
      path.join(
        storeRoot,
        'openspec',
        'initiatives',
        'smoother-setup',
        'initiative.yaml'
      ),
      'title: Canonical\nchanges: []\n'
    );

    write('consumer/openspec/config.yaml', 'references:\n  - acme-plans\n');
    initiative('consumer', 'smoother-setup', 'title: Local draft\nchanges: []\n');
    initiative('consumer', 'unrelated', 'title: Unrelated\nchanges: []\n');

    const results = await listInitiatives(path.join(tempDir, 'consumer'), {
      globalDataDir,
    });
    const byId = Object.fromEntries(results.map((i) => [i.id, i]));

    expect(byId['smoother-setup'].shadowsStore).toBe('acme-plans');
    expect(byId['unrelated'].shadowsStore).toBeUndefined();
  });

  it('ignores plain folders without an initiative.yaml manifest', async () => {
    fs.mkdirSync(
      path.join(tempDir, 'app', 'openspec', 'initiatives', 'just-a-folder'),
      { recursive: true }
    );
    initiative('app', 'tracked', 'title: Tracked\nchanges: []\n');

    const results = await listInitiatives(path.join(tempDir, 'app'), {
      globalDataDir,
    });

    expect(results.map((i) => i.id)).toEqual(['tracked']);
  });
});
