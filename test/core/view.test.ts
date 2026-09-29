import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ViewCommand } from '../../src/core/view.js';

const stripAnsi = (input: string): string => input.replace(/\u001b\[[0-9;]*m/g, '');

describe('ViewCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-view-test-'));

    originalLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    logOutput = [];
  });

  afterEach(async () => {
    console.log = originalLog;
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('shows changes with no tasks in Draft section, not Completed', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    // Empty change (no tasks.md) - should show in Draft
    await fs.mkdir(path.join(changesDir, 'empty-change'), { recursive: true });

    // Change with tasks.md but no tasks - should show in Draft
    await fs.mkdir(path.join(changesDir, 'no-tasks-change'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'no-tasks-change', 'tasks.md'), '# Tasks\n\nNo tasks yet.');

    // Change with all tasks complete - should show in Completed
    await fs.mkdir(path.join(changesDir, 'completed-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'completed-change', 'tasks.md'),
      '- [x] Done task\n'
    );

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');

    // Draft section should contain empty and no-tasks changes
    expect(output).toContain('Draft Changes');
    expect(output).toContain('empty-change');
    expect(output).toContain('no-tasks-change');

    // Completed section should only contain changes with all tasks done
    expect(output).toContain('Completed Changes');
    expect(output).toContain('completed-change');

    // Verify empty-change and no-tasks-change are in Draft section (marked with ○)
    const draftLines = logOutput
      .map(stripAnsi)
      .filter((line) => line.includes('○'));
    const draftNames = draftLines.map((line) => line.trim().replace('○ ', ''));
    expect(draftNames).toContain('empty-change');
    expect(draftNames).toContain('no-tasks-change');

    // Verify completed-change is in Completed section (marked with ✓)
    const completedLines = logOutput
      .map(stripAnsi)
      .filter((line) => line.includes('✓'));
    const completedNames = completedLines.map((line) => line.trim().replace('✓ ', ''));
    expect(completedNames).toContain('completed-change');
    expect(completedNames).not.toContain('empty-change');
    expect(completedNames).not.toContain('no-tasks-change');
  });

  it('sorts active changes by completion percentage ascending with deterministic tie-breakers', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    await fs.mkdir(path.join(changesDir, 'gamma-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'gamma-change', 'tasks.md'),
      '- [x] Done\n- [x] Also done\n- [ ] Not done\n'
    );

    await fs.mkdir(path.join(changesDir, 'beta-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'beta-change', 'tasks.md'),
      '- [x] Task 1\n- [ ] Task 2\n'
    );

    await fs.mkdir(path.join(changesDir, 'delta-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'delta-change', 'tasks.md'),
      '- [x] Task 1\n- [ ] Task 2\n'
    );

    await fs.mkdir(path.join(changesDir, 'alpha-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'alpha-change', 'tasks.md'),
      '- [ ] Task 1\n- [ ] Task 2\n'
    );

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const activeLines = logOutput
      .map(stripAnsi)
      .filter(line => line.includes('◉'));

    const activeOrder = activeLines.map(line => {
      const afterBullet = line.split('◉')[1] ?? '';
      return afterBullet.split('[')[0]?.trim();
    });

    expect(activeOrder).toEqual([
      'alpha-change',
      'beta-change',
      'delta-change',
      'gamma-change'
    ]);
  });

  it('classifies a nested glob-tasks change as Active, not Draft (#1202)', async () => {
    const openspecDir = path.join(tempDir, 'openspec');
    const changesDir = path.join(openspecDir, 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    // Project-local schema whose tasks artifact resolves a nested glob.
    const schemaDir = path.join(openspecDir, 'schemas', 'glob-tasks');
    await fs.mkdir(schemaDir, { recursive: true });
    await fs.writeFile(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: glob-tasks',
        'version: 1',
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
      ].join('\n')
    );

    const changeDir = path.join(changesDir, 'nested-change');
    await fs.mkdir(path.join(changeDir, 'backend'), { recursive: true });
    await fs.mkdir(path.join(changeDir, 'frontend'), { recursive: true });
    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: glob-tasks\n');
    await fs.writeFile(path.join(changeDir, 'backend', 'tasks.md'), '- [x] 1.1 a\n- [x] 1.2 b\n');
    await fs.writeFile(path.join(changeDir, 'frontend', 'tasks.md'), '- [x] 2.1 a\n- [ ] 2.2 b\n- [ ] 2.3 c\n');

    await new ViewCommand().execute(tempDir);
    const output = logOutput.map(stripAnsi).join('\n');

    // Active section lists the change with aggregated 3/5 progress; not Draft.
    const activeLines = logOutput.map(stripAnsi).filter(line => line.includes('◉'));
    expect(activeLines.some(line => line.includes('nested-change'))).toBe(true);
    const draftLines = logOutput.map(stripAnsi).filter(line => line.includes('○'));
    expect(draftLines.some(line => line.includes('nested-change'))).toBe(false);
    expect(output).toContain('60%');
  });

  it('keeps a change with unfinished sub-tasks in Active, not Completed (#1485)', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(path.join(changesDir, 'subtask-change'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'subtask-change', 'tasks.md'),
      '- [x] 1.1 Parent task\n  - [ ] 1.1.1 Unfinished sub-task\n'
    );

    await new ViewCommand().execute(tempDir);

    const activeLines = logOutput.map(stripAnsi).filter(line => line.includes('◉'));
    expect(activeLines.some(line => line.includes('subtask-change'))).toBe(true);
    const completedLines = logOutput.map(stripAnsi).filter(line => line.includes('✓'));
    expect(completedLines.some(line => line.includes('subtask-change'))).toBe(false);
  });

  it('aligns progress bars in Active Changes when a change name exceeds 30 characters (#1986)', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(path.join(changesDir, 'add-harp-profile-catalog'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'add-harp-profile-catalog', 'tasks.md'),
      '- [ ] Task 1\n- [ ] Task 2\n'
    );

    await fs.mkdir(path.join(changesDir, 'improve-tuner-readout-legibility'), { recursive: true });
    await fs.writeFile(
      path.join(changesDir, 'improve-tuner-readout-legibility', 'tasks.md'),
      '- [x] Task 1\n- [ ] Task 2\n'
    );

    await new ViewCommand().execute(tempDir);

    const activeLines = logOutput.map(stripAnsi).filter(line => line.includes('◉'));
    expect(activeLines).toHaveLength(2);

    const barStartIndex0 = activeLines[0].indexOf('[');
    const barStartIndex1 = activeLines[1].indexOf('[');

    expect(barStartIndex0).toBeGreaterThan(0);
    expect(barStartIndex0).toBe(barStartIndex1);
  });

  it('caps the Active Changes name column at 48 characters (#1986)', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const longName = 'a-change-name-that-is-well-beyond-the-forty-eight-column-cap';
    for (const name of ['short-change', 'improve-tuner-readout-legibility', longName]) {
      await fs.mkdir(path.join(changesDir, name), { recursive: true });
      await fs.writeFile(path.join(changesDir, name, 'tasks.md'), '- [ ] Task 1\n');
    }

    await new ViewCommand().execute(tempDir);

    const activeLines = logOutput.map(stripAnsi).filter(line => line.includes('◉'));
    const barStart = (name: string) => {
      const line = activeLines.find(l => l.includes(name));
      expect(line).toBeDefined();
      return line!.indexOf('[');
    };

    // Names within the cap share one column, padded to 48 rather than to the longest name.
    expect(barStart('short-change')).toBe(barStart('improve-tuner-readout-legibility'));
    expect(barStart('short-change')).toBe(activeLines[0].indexOf('◉') + 2 + 48 + 1);
    // A longer name stays whole and its bar starts after it.
    expect(barStart(longName)).toBeGreaterThan(barStart('short-change'));
    expect(activeLines.find(l => l.includes(longName))).toContain(longName);
  });
});

