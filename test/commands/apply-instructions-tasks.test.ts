import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { generateApplyInstructions } from '../../src/commands/workflow/instructions.js';
import { getTaskProgressForChange } from '../../src/utils/task-progress.js';

/**
 * The apply task list and task progress read the same tasks file, so they must
 * see the same tasks - including indented sub-tasks, which the apply parser
 * used to drop.
 */
describe('generateApplyInstructions task list', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-apply-tasks-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');
    fs.mkdirSync(path.join(changeDir, 'specs', 'demo'), { recursive: true });
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '## Why\nx\n');
    fs.writeFileSync(
      path.join(changeDir, 'specs', 'demo', 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Demo\nThe system SHALL demo.\n\n#### Scenario: Works\n- **WHEN** run\n- **THEN** works\n'
    );
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function writeTasks(content: string): void {
    fs.writeFileSync(path.join(changeDir, 'tasks.md'), content);
  }

  it('lists indented sub-tasks alongside their parents', async () => {
    writeTasks(
      [
        '## 1. Implementation',
        '- [x] 1.1 Parent task',
        '  - [ ] 1.1.1 Unfinished sub-task',
        '- [ ] 1.2 Second parent',
        '',
      ].join('\n')
    );

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.tasks.map((task) => task.description)).toEqual([
      '1.1 Parent task',
      '1.1.1 Unfinished sub-task',
      '1.2 Second parent',
    ]);
    expect(instructions.progress).toEqual({ total: 3, complete: 1, remaining: 2 });
  });

  it('reports the totals openspec list reports for the same change', async () => {
    writeTasks(
      ['## 1. Implementation', '- [x] 1.1 Parent task', '  - [ ] 1.1.1 Unfinished sub-task', ''].join(
        '\n'
      )
    );

    const instructions = await generateApplyInstructions(tempDir, 'my-change');
    // `openspec list` reads progress through getTaskProgressForChange, not the
    // apply parser. The two must not disagree about the same file.
    const listProgress = await getTaskProgressForChange(
      path.join(tempDir, 'openspec', 'changes'),
      'my-change',
      tempDir
    );

    expect(listProgress).toEqual({ total: 2, completed: 1 });
    expect(instructions.progress.total).toBe(listProgress.total);
    expect(instructions.progress.complete).toBe(listProgress.completed);
  });

  it('reports a file of text-less checkboxes as having nothing to work on', async () => {
    writeTasks('## 1. Implementation\n- [x]\n');

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    // As before the shared parser: apply points at regenerating the file
    // rather than listing a blank row an agent cannot act on.
    expect(instructions.tasks).toEqual([]);
    expect(instructions.state).toBe('blocked');
    expect(instructions.instruction).toContain('contains no tasks');
  });

  it('counts a text-less checkbox toward progress even though it lists none', async () => {
    // Progress must not disagree with `openspec list` or archive's gate just
    // because a line carries no text an agent could act on: hiding the row is
    // presentation, dropping it from the count would understate the work left.
    writeTasks('## 1. Implementation\n- [x] 1.1 Real task\n- [ ]   \n');

    const instructions = await generateApplyInstructions(tempDir, 'my-change');
    const listProgress = await getTaskProgressForChange(
      path.join(tempDir, 'openspec', 'changes'),
      'my-change',
      tempDir
    );

    expect(instructions.tasks.map((task) => task.description)).toEqual(['1.1 Real task']);
    expect(instructions.progress).toEqual({ total: 2, complete: 1, remaining: 1 });
    expect(instructions.state).toBe('ready');
    expect(listProgress).toEqual({ total: 2, completed: 1 });
  });

  it('lists a task written with an unrecognised marker as remaining work (#1761)', async () => {
    // Before the fix the apply parser dropped the line, so the agent was told
    // every task was complete and the change was ready to archive.
    writeTasks(
      ['## 1. Implementation', '- [x] 1.1 Done', '- [~] 1.2 Deferred', '- [] 1.3 Empty box', ''].join(
        '\n'
      )
    );

    const instructions = await generateApplyInstructions(tempDir, 'my-change');
    const listProgress = await getTaskProgressForChange(
      path.join(tempDir, 'openspec', 'changes'),
      'my-change',
      tempDir
    );

    expect(instructions.tasks.map((task) => task.description)).toEqual([
      '1.1 Done',
      '1.2 Deferred',
      '1.3 Empty box',
    ]);
    expect(instructions.progress).toEqual({ total: 3, complete: 1, remaining: 2 });
    expect(instructions.state).toBe('ready');
    expect(listProgress).toEqual({ total: 3, completed: 1 });
  });

  it('does not call a change done while a bare checkbox is still unchecked', async () => {
    writeTasks('## 1. Implementation\n- [x] 1.1 Real task\n- [ ]\n');

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.progress).toEqual({ total: 2, complete: 1, remaining: 1 });
    expect(instructions.state).toBe('ready');
  });
});
