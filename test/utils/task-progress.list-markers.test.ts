import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { countTasksFromContent, parseTaskLines } from '../../src/utils/task-progress.js';
import { findTaskNumberingIssues } from '../../src/core/validation/task-numbering.js';
import { runCLI } from '../helpers/run-cli.js';

/**
 * A GFM task is a list item, and CommonMark has five list markers: `-`, `*`,
 * `+`, and the ordered `1.` and `1)`. Only `-` and `*` used to count, so an
 * unchecked `1. [ ]` or `+ [ ]` task was invisible to every progress surface,
 * and `openspec archive` reported "✓ Complete" over unfinished work.
 */
describe('task checkboxes under every CommonMark list marker', () => {
  it.each([
    ['plus', '+ [ ] 1.1 Task'],
    ['ordered with a dot', '1. [ ] 1.1 Task'],
    ['ordered with a paren', '1) [ ] 1.1 Task'],
    ['multi-digit ordered', '10. [ ] 1.1 Task'],
    ['nine-digit ordered', '123456789. [ ] 1.1 Task'],
  ])('reads a %s task', (_label, line) => {
    expect(parseTaskLines(`${line}\n`)).toEqual([{ done: false, description: '1.1 Task' }]);
  });

  it('reads the checkbox state under each marker, in either case', () => {
    const tasks = parseTaskLines('+ [x] a\n+ [X] b\n1. [x] c\n2) [X] d\n3. [ ] e\n');

    expect(tasks.map((task) => task.done)).toEqual([true, true, true, true, false]);
  });

  it('counts a file that mixes every marker', () => {
    const content = [
      '## 1. Work',
      '- [x] 1.1 Dash',
      '* [ ] 1.2 Star',
      '+ [ ] 1.3 Plus',
      '1. [x] 1.4 Ordered',
      '2) [ ] 1.5 Ordered with a paren',
      '',
    ].join('\n');

    expect(countTasksFromContent(content)).toEqual({ total: 5, completed: 2 });
  });

  it('counts ordered and plus sub-tasks at every indent, spaces or tabs', () => {
    const content = [
      '- [x] 1.1 Parent',
      '  1. [ ] 1.1.1 Child',
      '    + [ ] 1.1.1.1 Grandchild',
      '\t2) [x] 1.1.2 Tab child',
      '',
    ].join('\n');

    expect(countTasksFromContent(content)).toEqual({ total: 4, completed: 2 });
  });

  it('keeps the no-space tolerance the dash bullet already had', () => {
    // `-[x]` has always counted; the other markers follow the same rule.
    expect(countTasksFromContent('-[x] a\n+[ ] b\n1.[ ] c\n2)[x] d\n')).toEqual({
      total: 4,
      completed: 2,
    });
  });

  it('reads ordered tasks in a CRLF file', () => {
    expect(parseTaskLines('1. [ ] 1.1 First\r\n2) [x] 1.2 Second\r\n')).toEqual([
      { done: false, description: '1.1 First' },
      { done: true, description: '1.2 Second' },
    ]);
  });

  it('still ignores ordered and plus items that carry no checkbox', () => {
    expect(parseTaskLines('1. A numbered item\n+ A plus bullet\n2) Another item\n')).toEqual([]);
  });

  it('does not read a task id or an over-long number as an ordered marker', () => {
    // `1.1` is a task id, not the marker `1.`; CommonMark caps an ordered
    // marker at nine digits.
    expect(parseTaskLines('1.1 [ ] Not a list item\n1234567890. [ ] Ten digits\n')).toEqual([]);
  });

  it('checks the numbering of ordered tasks like any other task', () => {
    const issues = findTaskNumberingIssues([
      { path: 'tasks.md', content: '## 1. Work\n1. [ ] 1.1 First\n2. [ ] 2.1 Wrong group\n' },
    ]);

    expect(issues).toEqual([
      expect.objectContaining({ path: 'tasks.md', line: 3, message: expect.stringContaining('"2.1"') }),
    ]);
  });
});

describe('ordered and plus tasks through the CLI', () => {
  const temps: string[] = [];
  afterAll(async () => {
    await Promise.all(temps.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  /** A real project holding one valid change whose tasks.md is `tasks`. */
  async function projectWithTasks(tasks: string) {
    const base = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-task-markers-'));
    temps.push(base);
    const home = path.join(base, 'home');
    const project = path.join(base, 'project');
    await fs.mkdir(home, { recursive: true });
    await fs.mkdir(project, { recursive: true });
    const env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(home, '.config'),
      XDG_DATA_HOME: path.join(home, '.local', 'share'),
      OPENSPEC_NO_ANIMATION: '1',
    };
    const cli = (args: string[]) => runCLI(args, { cwd: project, env, timeoutMs: 60_000 });

    expect((await cli(['init', '--tools', 'claude'])).exitCode).toBe(0);
    expect((await cli(['new', 'change', 'add-thing'])).exitCode).toBe(0);
    const changeDir = path.join(project, 'openspec', 'changes', 'add-thing');
    await fs.mkdir(path.join(changeDir, 'specs', 'billing'), { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '# Add thing\n\n## Why\nWe need billing documented so operators and customers share one contract for invoices.\n\n## What Changes\n- **billing**: adds a requirement\n'
    );
    await fs.writeFile(
      path.join(changeDir, 'specs', 'billing', 'spec.md'),
      '## ADDED Requirements\n### Requirement: Invoice Generation\nThe system SHALL generate an invoice for every completed billing period.\n\n#### Scenario: Period closes\n- **WHEN** a billing period closes\n- **THEN** an invoice is generated\n'
    );
    await fs.writeFile(path.join(changeDir, 'tasks.md'), tasks);
    return { cli };
  }

  it.each([
    ['dash', '- [ ] 1.2 Not done\n- [ ] 1.3 Not done\n'],
    ['ordered', '1. [ ] 1.2 Not done\n2. [ ] 1.3 Not done\n'],
    ['plus', '+ [ ] 1.2 Not done\n+ [ ] 1.3 Not done\n'],
  ])(
    'counts unchecked %s tasks in list, and archive warns about them',
    async (_label, unchecked) => {
      const project = await projectWithTasks(`## 1. Work\n- [x] 1.1 Done\n${unchecked}`);

      const listed = await project.cli(['list', '--json']);
      expect(listed.exitCode).toBe(0);
      expect(JSON.parse(listed.stdout).changes[0]).toMatchObject({
        name: 'add-thing',
        completedTasks: 1,
        totalTasks: 3,
        status: 'in-progress',
      });

      const archived = await project.cli(['archive', 'add-thing', '--yes']);
      const output = archived.stdout + archived.stderr;
      expect(output).toMatch(/2 incomplete task\(s\) found/);
      expect(output).not.toMatch(/Task status: ✓ Complete/);
    },
    120_000
  );
});
