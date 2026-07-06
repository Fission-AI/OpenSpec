import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  listInitiativeNames,
  normalizeInitiativeRef,
  readInitiativesShape,
  rollupInitiatives,
  rollupRegisteredStorePortfolios,
} from '../../src/core/initiatives.js';
import {
  readStoreRegistryState,
  writeStoreRegistryState,
} from '../../src/core/store/foundation.js';

describe('initiatives', () => {
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

  function change(root: string, id: string, ref: string | null, tasks: string): void {
    const metadata =
      ref === null
        ? 'schema: spec-driven\n'
        : `schema: spec-driven\ninitiative: ${ref}\n`;
    write(`${root}/openspec/changes/${id}/.openspec.yaml`, metadata);
    write(`${root}/openspec/changes/${id}/tasks.md`, tasks);
  }

  async function registerStore(id: string, root: string): Promise<void> {
    const existing = await readStoreRegistryState({ globalDataDir }).catch(() => null);
    await writeStoreRegistryState(
      {
        version: 1,
        stores: {
          ...(existing?.stores ?? {}),
          [id]: { backend: { type: 'git', local_path: path.join(tempDir, root) } },
        },
      },
      { globalDataDir }
    );
  }

  it('splits initiatives from evergreen artifacts, and stages inside an initiative', async () => {
    write('app/openspec/initiatives/roadmap.md', '# roadmap\n');
    write('app/openspec/initiatives/smoother-setup/00_goal/goal.md', '# goal\n');
    write('app/openspec/initiatives/smoother-setup/01_who/personas.md', '# who\n');
    write('app/openspec/initiatives/smoother-setup/notes.md', '# notes\n');
    write('app/openspec/initiatives/q3-payments/brief.md', '# brief\n');

    const shape = await readInitiativesShape(path.join(tempDir, 'app'));

    expect(shape?.evergreen).toEqual(['roadmap.md']);
    expect(shape?.initiatives.map((i) => i.name)).toEqual([
      'q3-payments',
      'smoother-setup',
    ]);
    const smoother = shape?.initiatives.find((i) => i.name === 'smoother-setup');
    expect(smoother?.stages.map((s) => s.name)).toEqual(['00_goal', '01_who']);
    expect(smoother?.stages.map((s) => s.files)).toEqual([1, 1]);
    expect(smoother?.artifacts).toEqual(['notes.md']);
  });

  it('returns null when there is no initiatives folder', async () => {
    fs.mkdirSync(path.join(tempDir, 'app', 'openspec'), { recursive: true });
    expect(await readInitiativesShape(path.join(tempDir, 'app'))).toBeNull();
    expect(
      await rollupInitiatives(path.join(tempDir, 'app'), { globalDataDir })
    ).toBeNull();
  });

  it('normalizes the legacy object ref to <store>/<id>', () => {
    expect(normalizeInitiativeRef('smoother-setup')).toBe('smoother-setup');
    expect(normalizeInitiativeRef('team-plans/q3')).toBe('team-plans/q3');
    expect(normalizeInitiativeRef({ store: 'team-plans', id: 'q3' })).toBe(
      'team-plans/q3'
    );
    expect(normalizeInitiativeRef(undefined)).toBeNull();
    expect(normalizeInitiativeRef('')).toBeNull();
    expect(normalizeInitiativeRef({ store: 'team-plans' })).toBeNull();
  });

  it('groups local changes under the initiative they name', async () => {
    write('app/openspec/initiatives/smoother-setup/goal.md', '# goal\n');
    change('app', 'done-change', 'smoother-setup', '- [x] a\n- [x] b\n');
    change('app', 'wip-change', 'smoother-setup', '- [x] a\n- [ ] b\n');
    change('app', 'unrelated', null, '- [ ] a\n'); // no initiative line -> not included

    const portfolio = await rollupInitiatives(path.join(tempDir, 'app'), {
      globalDataDir,
    });

    expect(portfolio?.initiatives.map((i) => i.name)).toEqual(['smoother-setup']);
    const initiative = portfolio?.initiatives[0];
    expect(initiative?.exists).toBe(true);
    expect(initiative?.changes.map((c) => c.id)).toEqual(['done-change', 'wip-change']);
    expect(initiative?.changesComplete).toBe(1);
    expect(initiative?.changesTotal).toBe(2);
    expect(initiative?.tasksComplete).toBe(3);
    expect(initiative?.tasksTotal).toBe(4);
    expect(initiative?.changes.every((c) => c.store === undefined)).toBe(true);
  });

  it('surfaces a referenced name with no folder as exists: false', async () => {
    write('app/openspec/initiatives/roadmap.md', '# roadmap\n');
    change('app', 'orphan-change', 'renamed-away', '- [ ] a\n');

    const portfolio = await rollupInitiatives(path.join(tempDir, 'app'), {
      globalDataDir,
    });

    const orphan = portfolio?.initiatives.find((i) => i.name === 'renamed-away');
    expect(orphan?.exists).toBe(false);
    expect(orphan?.changes.map((c) => c.id)).toEqual(['orphan-change']);
  });

  it('finds changes across registered repos that point at a store initiative', async () => {
    // The initiative lives in the team-plans store.
    write('team-plans/openspec/initiatives/smoother-setup/goal.md', '# goal\n');
    await registerStore('team-plans', 'team-plans');
    // Two code repos, registered, each with a change pointing at it.
    await registerStore('api-server', 'api-server');
    await registerStore('web-app', 'web-app');
    change('api-server', 'add-payments-api', 'team-plans/smoother-setup', '- [x] a\n- [x] b\n');
    change('web-app', 'add-payments-ui', 'team-plans/smoother-setup', '- [x] a\n- [ ] b\n- [ ] c\n');
    change('web-app', 'other-work', null, '- [ ] a\n');
    // Legacy object metadata still resolves to the same initiative.
    write(
      'web-app/openspec/changes/legacy-change/.openspec.yaml',
      'schema: spec-driven\ninitiative:\n  store: team-plans\n  id: smoother-setup\n'
    );
    write('web-app/openspec/changes/legacy-change/tasks.md', '- [x] a\n');
    // The store's own change can use the bare name or its own prefix.
    change('team-plans', 'update-docs', 'smoother-setup', '- [x] a\n');
    change('team-plans', 'update-brand', 'team-plans/smoother-setup', '- [ ] a\n');

    const portfolio = await rollupInitiatives(path.join(tempDir, 'team-plans'), {
      globalDataDir,
    });

    const initiative = portfolio?.initiatives.find((i) => i.name === 'smoother-setup');
    const byId = Object.fromEntries((initiative?.changes ?? []).map((c) => [c.id, c]));
    expect(Object.keys(byId).sort()).toEqual([
      'add-payments-api',
      'add-payments-ui',
      'legacy-change',
      'update-brand',
      'update-docs',
    ]);
    expect(byId['add-payments-api'].store).toBe('api-server');
    expect(byId['add-payments-api'].state).toBe('complete');
    expect(byId['add-payments-ui'].store).toBe('web-app');
    expect(byId['add-payments-ui'].state).toBe('in-progress');
    expect(byId['legacy-change'].store).toBe('web-app');
    expect(byId['update-docs'].store).toBeUndefined();
    expect(initiative?.changesComplete).toBe(3);
    expect(initiative?.tasksTotal).toBe(8);
  });

  it('rolls up every registered store portfolio for the outside-a-root answer', async () => {
    write('team-plans/openspec/initiatives/smoother-setup/goal.md', '# goal\n');
    write('other-store/openspec/specs/.gitkeep', ''); // registered, no initiatives
    await registerStore('team-plans', 'team-plans');
    await registerStore('other-store', 'other-store');
    change('team-plans', 'update-docs', 'smoother-setup', '- [x] a\n');

    const portfolios = await rollupRegisteredStorePortfolios({ globalDataDir });

    expect(portfolios.map((p) => p.store)).toEqual(['team-plans']);
    expect(portfolios[0].portfolio.initiatives[0].name).toBe('smoother-setup');
    expect(portfolios[0].portfolio.initiatives[0].changes.map((c) => c.id)).toEqual([
      'update-docs',
    ]);
  });

  it('lists initiative names for agent surfaces, falling back to evergreen names', async () => {
    write('app/openspec/initiatives/roadmap.md', '# roadmap\n');
    expect(await listInitiativeNames(path.join(tempDir, 'app'))).toEqual([
      'roadmap.md',
    ]);

    write('app/openspec/initiatives/smoother-setup/goal.md', '# goal\n');
    expect(await listInitiativeNames(path.join(tempDir, 'app'))).toEqual([
      'smoother-setup',
    ]);
  });
});
