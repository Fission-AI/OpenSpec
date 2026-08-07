import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('openspec validate --archived checks archived task completion (#205)', () => {
  let projectDir: string;

  const write = async (relative: string, content: string) => {
    const file = path.join(projectDir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf-8');
  };

  beforeAll(async () => {
    projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-archived-tasks-e2e-'));

    // Fully completed archived change.
    await write(
      'openspec/changes/archive/2026-01-01-done-change/tasks.md',
      ['# Tasks', '', '- [x] 1.1 do a', '- [x] 1.2 do b', ''].join('\n')
    );

    // Archived change with an unchecked nested sub-task.
    await write(
      'openspec/changes/archive/2026-01-02-incomplete-change/tasks.md',
      [
        '# Tasks',
        '',
        '- [x] 1.1 do a',
        '- [ ] 1.2 do b',
        '  - [ ] 1.2.1 nested unfinished work',
        '',
      ].join('\n')
    );

    // An active change with unchecked tasks must NOT be scanned by --archived.
    await write(
      'openspec/changes/active-change/tasks.md',
      ['# Tasks', '', '- [ ] 1.1 still in progress', ''].join('\n')
    );
  });

  afterAll(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('fails when an archived change has unchecked tasks and passes the complete one', async () => {
    const result = await runCLI(['validate', '--archived', '--json'], {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout);
    const byId = Object.fromEntries(
      report.items.map((item: { id: string; valid: boolean }) => [item.id, item.valid])
    );

    // Only archived changes are considered; the active change is absent.
    expect(byId['active-change']).toBeUndefined();
    expect(byId['2026-01-01-done-change']).toBe(true);
    expect(byId['2026-01-02-incomplete-change']).toBe(false);

    const incomplete = report.items.find(
      (item: { id: string }) => item.id === '2026-01-02-incomplete-change'
    );
    // The unchecked nested sub-task counts, so 2 of 3 tasks are open.
    expect(incomplete.issues[0]).toEqual(
      expect.objectContaining({
        level: 'ERROR',
        path: 'tasks',
        message: expect.stringContaining('2 incomplete tasks (1/3 completed)'),
      })
    );
  });

  it('exits 0 when every archived change is complete', async () => {
    await fs.rm(
      path.join(
        projectDir,
        'openspec/changes/archive/2026-01-02-incomplete-change'
      ),
      { recursive: true, force: true }
    );

    const result = await runCLI(['validate', '--archived'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('✓ archived/2026-01-01-done-change');
  });

  it('exits 0 with a friendly message when there is no archive directory', async () => {
    const emptyDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-no-archive-e2e-'));
    await fs.mkdir(path.join(emptyDir, 'openspec', 'changes'), { recursive: true });
    await fs.mkdir(path.join(emptyDir, 'openspec', 'specs'), { recursive: true });

    const result = await runCLI(['validate', '--archived'], { cwd: emptyDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No archived changes found.');
    await fs.rm(emptyDir, { recursive: true, force: true });
  });
});
