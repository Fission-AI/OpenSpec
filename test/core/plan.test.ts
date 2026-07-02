import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { readPlanStages, rollupPlan } from '../../src/core/plan.js';
import {
  readStoreRegistryState,
  writeStoreRegistryState,
} from '../../src/core/store/foundation.js';

describe('plan folder', () => {
  let tempDir: string;
  let globalDataDir: string;
  let savedXdgDataHome: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-plan-'));
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

  function change(root: string, id: string, planRef: string | null, tasks: string): void {
    const metadata =
      planRef === null
        ? 'schema: spec-driven\n'
        : `schema: spec-driven\nplan: ${planRef}\n`;
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

  it('splits numbered stages from unnumbered context', async () => {
    write('app/openspec/plan/00_goal/goal.md', '# goal\n');
    write('app/openspec/plan/01_requirements/personas.md', '# who\n');
    write('app/openspec/plan/notes/cut.md', '# parked\n');
    write('app/openspec/plan/vision.md', '# vision\n');

    const shape = await readPlanStages(path.join(tempDir, 'app'));

    expect(shape?.stages.map((s) => s.name)).toEqual(['00_goal', '01_requirements']);
    expect(shape?.stages.map((s) => s.files)).toEqual([1, 1]);
    expect(shape?.context).toEqual(['notes', 'vision.md']);
  });

  it('returns null when there is no plan folder', async () => {
    fs.mkdirSync(path.join(tempDir, 'app', 'openspec'), { recursive: true });
    expect(await readPlanStages(path.join(tempDir, 'app'))).toBeNull();
    expect(await rollupPlan(path.join(tempDir, 'app'), { globalDataDir })).toBeNull();
  });

  it('rolls up local changes that point at the plan with plan: local', async () => {
    write('app/openspec/plan/00_goal/goal.md', '# goal\n');
    change('app', 'done-change', 'local', '- [x] a\n- [x] b\n');
    change('app', 'wip-change', 'local', '- [x] a\n- [ ] b\n');
    change('app', 'unrelated', null, '- [ ] a\n'); // no plan line -> not included

    const plan = await rollupPlan(path.join(tempDir, 'app'), { globalDataDir });

    expect(plan?.changes.map((c) => c.id)).toEqual(['done-change', 'wip-change']);
    expect(plan?.changesComplete).toBe(1);
    expect(plan?.changesTotal).toBe(2);
    expect(plan?.tasksComplete).toBe(3);
    expect(plan?.tasksTotal).toBe(4);
    expect(plan?.changes.every((c) => c.store === undefined)).toBe(true);
  });

  it('finds changes across registered repos that point at a store plan', async () => {
    // The plan lives in the team-plans store.
    write('team-plans/openspec/plan/00_goal/goal.md', '# goal\n');
    await registerStore('team-plans', 'team-plans');
    // Two code repos, registered, each with a change pointing at team-plans.
    await registerStore('api-server', 'api-server');
    await registerStore('web-app', 'web-app');
    change('api-server', 'add-payments-api', 'team-plans', '- [x] a\n- [x] b\n');
    change('web-app', 'add-payments-ui', 'team-plans', '- [x] a\n- [ ] b\n- [ ] c\n');
    change('web-app', 'other-work', null, '- [ ] a\n');
    // The store's own change can use 'local' or its own id.
    change('team-plans', 'update-docs', 'local', '- [x] a\n');

    const plan = await rollupPlan(path.join(tempDir, 'team-plans'), { globalDataDir });

    const byId = Object.fromEntries((plan?.changes ?? []).map((c) => [c.id, c]));
    expect(Object.keys(byId).sort()).toEqual([
      'add-payments-api',
      'add-payments-ui',
      'update-docs',
    ]);
    expect(byId['add-payments-api'].store).toBe('api-server');
    expect(byId['add-payments-api'].state).toBe('complete');
    expect(byId['add-payments-ui'].store).toBe('web-app');
    expect(byId['add-payments-ui'].state).toBe('in-progress');
    expect(byId['update-docs'].store).toBeUndefined();
    expect(plan?.changesComplete).toBe(2);
    expect(plan?.tasksTotal).toBe(6);
  });
});
