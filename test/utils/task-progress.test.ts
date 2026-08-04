import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
  countTasksFromContent,
  getTaskProgressForChange,
  parseTaskLines,
} from '../../src/utils/task-progress.js';
import { resolveArtifactOutputs } from '../../src/core/artifact-graph/index.js';

/**
 * #1202 — task progress is resolved through the tracked-tasks artifact's
 * `generates` glob (the same file-resolution `openspec status` uses), not a
 * fixed `changes/<name>/tasks.md` path.
 */
describe('getTaskProgressForChange (#1202 tracked-tasks resolution)', () => {
  let projectRoot: string;
  let changesDir: string;

  const GLOB_SCHEMA = [
    'name: glob-tasks',
    'version: 1',
    'description: tasks artifact uses a nested glob',
    'artifacts:',
    '  - id: proposal',
    '    generates: proposal.md',
    '    description: Proposal',
    '    template: proposal.md',
    '    requires: []',
    '  - id: tasks',
    '    generates: "**/tasks.md"',
    '    description: Nested tasks',
    '    template: tasks.md',
    '    requires: [proposal]',
    'apply:',
    '  requires: [tasks]',
    '  tracks: "**/tasks.md"',
    '',
  ].join('\n');

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-taskprogress-'));
    changesDir = path.join(projectRoot, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true });
  });

  async function writeGlobSchema(): Promise<void> {
    const schemaDir = path.join(projectRoot, 'openspec', 'schemas', 'glob-tasks');
    await fs.mkdir(schemaDir, { recursive: true });
    await fs.writeFile(path.join(schemaDir, 'schema.yaml'), GLOB_SCHEMA, 'utf-8');
  }

  async function writeChange(name: string, files: Record<string, string>, schema = 'glob-tasks'): Promise<string> {
    const changeDir = path.join(changesDir, name);
    await fs.mkdir(changeDir, { recursive: true });
    if (schema) {
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), `schema: ${schema}\n`, 'utf-8');
    }
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(changeDir, rel);
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content, 'utf-8');
    }
    return changeDir;
  }

  it('aggregates checkboxes across nested tasks.md files matched by the glob', async () => {
    await writeGlobSchema();
    await writeChange('globchange', {
      'backend/tasks.md': '- [x] 1.1 a\n- [x] 1.2 b\n',
      'frontend/tasks.md': '- [x] 2.1 a\n- [ ] 2.2 b\n- [ ] 2.3 c\n',
    });

    const progress = await getTaskProgressForChange(changesDir, 'globchange', projectRoot);
    expect(progress).toEqual({ total: 5, completed: 3 });
  });

  it('resolves the same set of files status resolves (resolution-mechanism parity)', async () => {
    await writeGlobSchema();
    const changeDir = await writeChange('globchange', {
      'backend/tasks.md': '- [x] a\n- [x] b\n',
      'frontend/tasks.md': '- [x] a\n- [ ] b\n- [ ] c\n',
    });

    // `status` detects the tasks artifact via resolveArtifactOutputs(changeDir, generates).
    const statusFiles = resolveArtifactOutputs(changeDir, '**/tasks.md');
    expect(statusFiles).toHaveLength(2);

    // The helper's aggregate equals the checkbox sum over exactly those files.
    let total = 0;
    let completed = 0;
    for (const file of statusFiles) {
      const content = await fs.readFile(file, 'utf-8');
      total += (content.match(/^[-*]\s+\[[\sx]\]/gim) ?? []).length;
      completed += (content.match(/^[-*]\s+\[x\]/gim) ?? []).length;
    }
    const progress = await getTaskProgressForChange(changesDir, 'globchange', projectRoot);
    expect(progress).toEqual({ total, completed });
  });

  it('scopes resolution to the change dir (excludes archive/ and sibling changes)', async () => {
    await writeGlobSchema();
    await writeChange('target', { 'backend/tasks.md': '- [x] a\n- [ ] b\n' });
    // Decoys that must NOT be counted.
    await fs.mkdir(path.join(changesDir, 'archive', 'old'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'archive', 'old', 'tasks.md'), '- [x] x\n- [x] y\n', 'utf-8');
    await writeChange('sibling', { 'backend/tasks.md': '- [x] s1\n- [x] s2\n' });

    const progress = await getTaskProgressForChange(changesDir, 'target', projectRoot);
    expect(progress).toEqual({ total: 2, completed: 1 });
  });

  it('identifies the tracked artifact by apply.tracks even when it is not named "tasks"', async () => {
    const schemaDir = path.join(projectRoot, 'openspec', 'schemas', 'custom-track');
    await fs.mkdir(schemaDir, { recursive: true });
    await fs.writeFile(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: custom-track',
        'version: 1',
        'artifacts:',
        '  - id: proposal',
        '    generates: proposal.md',
        '    description: Proposal',
        '    template: proposal.md',
        '    requires: []',
        '  - id: checklist',
        '    generates: "work/*.md"',
        '    description: Work checklist',
        '    template: tasks.md',
        '    requires: [proposal]',
        'apply:',
        '  requires: [checklist]',
        '  tracks: "work/*.md"',
        '',
      ].join('\n'),
      'utf-8'
    );
    await writeChange('customchange', { 'work/a.md': '- [x] a\n- [ ] b\n' }, 'custom-track');

    const progress = await getTaskProgressForChange(changesDir, 'customchange', projectRoot);
    expect(progress).toEqual({ total: 2, completed: 1 });
  });

  it('falls back to a single top-level tasks.md when the schema cannot be resolved (no crash)', async () => {
    await writeChange('badschema', { 'tasks.md': '- [x] a\n- [ ] b\n' }, 'does-not-exist');

    const progress = await getTaskProgressForChange(changesDir, 'badschema', projectRoot);
    expect(progress).toEqual({ total: 2, completed: 1 });
  });

  it('counts a single top-level tasks.md unchanged under the default schema', async () => {
    // No project-local schema, no .openspec.yaml -> default spec-driven (tracks tasks.md).
    await writeChange('plain', { 'tasks.md': '- [x] a\n- [x] b\n- [ ] c\n' }, '');

    const progress = await getTaskProgressForChange(changesDir, 'plain', projectRoot);
    expect(progress).toEqual({ total: 3, completed: 2 });
  });

  it('reports zero tasks when no file matches the tracked glob', async () => {
    await writeGlobSchema();
    await writeChange('notasks', {}); // schema set, but no tasks.md anywhere

    const progress = await getTaskProgressForChange(changesDir, 'notasks', projectRoot);
    expect(progress).toEqual({ total: 0, completed: 0 });
  });

  it('counts indented sub-tasks, so a change with unfinished sub-tasks is not "Complete"', async () => {
    await writeChange(
      'nested',
      {
        'tasks.md': [
          '## 1. Implementation',
          '- [x] 1.1 Parent task',
          '  - [ ] 1.1.1 Unfinished sub-task',
          '    - [x] 1.1.1.1 Deeper sub-task',
          '- [x] 1.2 Second parent',
          '',
        ].join('\n'),
      },
      ''
    );

    const progress = await getTaskProgressForChange(changesDir, 'nested', projectRoot);
    expect(progress).toEqual({ total: 4, completed: 3 });
  });
});

describe('parseTaskLines', () => {
  it('reads bullet, checkbox state and description in document order', () => {
    const tasks = parseTaskLines('- [ ] 1.1 First\n* [x] 1.2 Second\n- [X] 1.3 Third\n');

    expect(tasks).toEqual([
      { done: false, description: '1.1 First' },
      { done: true, description: '1.2 Second' },
      { done: true, description: '1.3 Third' },
    ]);
  });

  it('includes sub-tasks at every indent depth, spaces or tabs', () => {
    const tasks = parseTaskLines(
      '- [x] 1.1 Parent\n  - [ ] 1.1.1 Child\n    - [ ] 1.1.1.1 Grandchild\n\t- [ ] 1.1.2 Tab child\n'
    );

    expect(tasks.map((task) => task.description)).toEqual([
      '1.1 Parent',
      '1.1.1 Child',
      '1.1.1.1 Grandchild',
      '1.1.2 Tab child',
    ]);
  });

  it('trims the description, including a trailing carriage return on CRLF files', () => {
    const tasks = parseTaskLines('- [ ] 1.1 First   \r\n  - [x] 1.1.1 Child\r\n');

    expect(tasks).toEqual([
      { done: false, description: '1.1 First' },
      { done: true, description: '1.1.1 Child' },
    ]);
  });

  it('keeps a checkbox with no description, which progress has always counted', () => {
    expect(parseTaskLines('- [ ]\n- [x]   \n')).toEqual([
      { done: false, description: '' },
      { done: true, description: '' },
    ]);
  });

  it('leaves non-checkbox lines, prose and headings alone', () => {
    const tasks = parseTaskLines(
      [
        '# Tasks',
        '## 1. Group',
        '- A plain bullet',
        '1. A numbered item',
        'Prose about [x] brackets.',
        '- [ ] 1.1 Only this one counts',
        '',
      ].join('\n')
    );

    expect(tasks.map((task) => task.description)).toEqual(['1.1 Only this one counts']);
  });

  describe('code fences (checkboxes inside them still count)', () => {
    it('counts a checkbox inside a fence, at any indent', () => {
      // Known limitation, unchanged for column-0 lines and extended to indented
      // ones by allowing leading whitespace: a fenced example counts as work.
      // The alternative - deciding which fences are real - loses genuine tasks
      // on unbalanced input, which silently disables archive's gate.
      const content = [
        '## 1. Work',
        '- [ ] 1.1 Real task',
        '',
        'Write tasks like this:',
        '',
        '   ```md',
        '   - [ ] 2.1 Example task',
        '   ```',
        '',
      ].join('\n');

      expect(countTasksFromContent(content)).toEqual({ total: 2, completed: 0 });
    });

    it('counts real work that follows an unterminated fence', () => {
      // One stray ``` must never hide the tasks after it.
      const content = ['- [x] 1.1 Done', '```bash', 'npm test', '- [ ] 2.1 Real work', ''].join(
        '\n'
      );

      expect(countTasksFromContent(content)).toEqual({ total: 2, completed: 1 });
    });

    it('counts a checklist whose file is wrapped in a single fence', () => {
      const content = ['```md', '- [ ] 1.1 Task one', '- [x] 1.2 Task two', '```', ''].join('\n');

      expect(countTasksFromContent(content)).toEqual({ total: 2, completed: 1 });
    });
  });
});

describe('countTasksFromContent', () => {
  it('counts every line the two previous patterns counted', () => {
    // The old patterns were /^[-*]\s+\[[\sx]\]/i (progress counting) and
    // /^[-*]\s*\[([ xX])\]\s*(.+)\s*$/ (apply list). Everything they matched
    // must still match, so no tasks.md can report less work than before.
    // `-[x]` (no space after the bullet) was matched only by the apply
    // pattern; it now counts toward progress too.
    const content = [
      '- [ ] 1.1 Space checkbox',
      '* [x] 1.2 Star bullet, done',
      '- [X] 1.3 Uppercase done',
      '- [\t] 1.4 Tab inside the brackets',
      '- [\u00A0] 1.5 Non-breaking space inside the brackets',
      '-[x] 1.6 No space after the bullet',
      '',
    ].join('\n');

    expect(countTasksFromContent(content)).toEqual({ total: 6, completed: 3 });
  });
});
