import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * End to end, the exact repro from #2227: a task wrapped onto a second line
 * came back from `openspec instructions apply` cut off at the first newline.
 */
const tempRoots: string[] = [];
afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});
const TIMEOUT = 120_000;

const TASKS = [
  '# Tasks',
  '## 1. Repro',
  '- [ ] 1.1 Implement the widget factory so it accepts a null config and',
  '      returns a default widget instead of throwing',
  '- [ ] 1.2 Implement the widget factory so it accepts a null config and \\',
  '      returns a default widget instead of throwing',
  '',
].join('\n');

const FULL_TEXT =
  'Implement the widget factory so it accepts a null config and returns a default widget instead of throwing';

describe('wrapped task text (#2227)', () => {
  it('returns the full text of a wrapped task from instructions apply', async () => {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-wrapped-tasks-e2e-'));
    tempRoots.push(base);
    const home = path.join(base, 'home');
    const project = path.join(base, 'project');
    const changeDir = path.join(project, 'openspec', 'changes', 'repro-multiline-tasks');
    await fs.mkdir(home, { recursive: true });
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), TASKS);
    const env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      OPENSPEC_NO_ANIMATION: '1',
    };

    const result = await runCLI(
      ['instructions', 'apply', '--change', 'repro-multiline-tasks', '--json'],
      { cwd: project, env, timeoutMs: 60_000 }
    );

    expect(result.exitCode).toBe(0);
    const instructions = JSON.parse(result.stdout);
    expect(instructions.progress).toEqual({ total: 2, complete: 0, remaining: 2 });
    expect(
      instructions.tasks.map((task: { description: string; line: number }) => ({
        description: task.description,
        line: task.line,
      }))
    ).toEqual([
      { description: `1.1 ${FULL_TEXT}`, line: 3 },
      { description: `1.2 ${FULL_TEXT}`, line: 5 },
    ]);
  }, TIMEOUT);
});
