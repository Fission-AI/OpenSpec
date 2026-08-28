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

  it.each([true, false])('resolves custom tracking configuration (enabled: %s)', async (tracked) => {
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'custom');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      `name: custom
version: 1
artifacts:
  - id: implementation
    generates: checklist.md
    description: Implementation checklist
    template: checklist.md
    requires: []
apply:
  requires: [implementation]
${tracked ? '  tracks: checklist.md\n' : ''}`
    );
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: custom\n');
    const checklist = path.join(changeDir, 'checklist.md');
    fs.writeFileSync(checklist, '- [x] Finished task\n- [ ] Pending task\n');

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.contextFiles).toEqual({ implementation: [fs.realpathSync.native(checklist)] });
    expect(instructions.tasks).toEqual(tracked ? [
      { id: '1', description: 'Finished task', done: true },
      { id: '2', description: 'Pending task', done: false },
    ] : []);
    expect(instructions.progress).toEqual(tracked
      ? { total: 2, complete: 1, remaining: 1 }
      : { total: 0, complete: 0, remaining: 0 });
    expect(instructions.state).toBe('ready');
  });

  it.each(['missing', 'empty'])('returns no task evidence for a %s tracking file', async (kind) => {
    if (kind === 'empty') writeTasks('');

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.tasks).toEqual([]);
    expect(instructions.progress).toEqual({ total: 0, complete: 0, remaining: 0 });
    expect(instructions.state).toBe('blocked');
    expect(instructions.instruction).toContain(kind === 'missing' ? 'Missing artifacts: tasks' : 'contains no tasks');
  });

  it('returns existing spec and design paths even when their files contain no evidence', async () => {
    writeTasks('- [x] Finished task\n');
    const spec = path.join(changeDir, 'specs', 'demo', 'spec.md');
    const design = path.join(changeDir, 'design.md');
    fs.writeFileSync(spec, '');
    fs.writeFileSync(design, '');

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.contextFiles.specs).toEqual([fs.realpathSync.native(spec)]);
    expect(instructions.contextFiles.design).toEqual([fs.realpathSync.native(design)]);
    expect(instructions.state).toBe('all_done');
  });

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
    expect(instructions.progress).toEqual({ total: 1, complete: 1, remaining: 0 });
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

  it('does not call a change done while a bare checkbox is still unchecked', async () => {
    writeTasks('## 1. Implementation\n- [x] 1.1 Real task\n- [ ]\n');

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.progress).toEqual({ total: 2, complete: 1, remaining: 1 });
    expect(instructions.state).toBe('ready');
  });
});
