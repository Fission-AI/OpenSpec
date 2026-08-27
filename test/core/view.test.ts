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

  it('lists archived directories in name order without affecting current changes or task progress', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    const archiveDir = path.join(changesDir, 'archive');
    await fs.mkdir(path.join(archiveDir, '2026-01-02-zebra'), { recursive: true });
    await fs.writeFile(
      path.join(archiveDir, '2026-01-02-zebra', 'tasks.md'),
      '- [x] Done\n- [ ] Unfinished when archived\n- [ ] Another task\n'
    );
    // Archived directories need neither a proposal nor a tasks file.
    await fs.mkdir(path.join(archiveDir, '2026-01-01-alpha'));
    await fs.mkdir(path.join(archiveDir, '.hidden-change'));
    await fs.writeFile(path.join(archiveDir, 'README.md'), 'Archive notes');
    await fs.mkdir(path.join(changesDir, 'draft-change'));
    await fs.mkdir(path.join(changesDir, 'active-change'));
    await fs.writeFile(path.join(changesDir, 'active-change', 'tasks.md'), '- [x] Done\n- [ ] Pending\n');
    await fs.mkdir(path.join(changesDir, 'completed-change'));
    await fs.writeFile(path.join(changesDir, 'completed-change', 'tasks.md'), '- [x] Done\n');

    await new ViewCommand().execute(tempDir);

    const lines = logOutput.map(stripAnsi);
    const output = lines.join('\n');
    expect(output).toContain('Archived Changes: 2');
    expect(output).toContain('Draft Changes: 1');
    expect(output).toContain('Active Changes: 1 in progress');
    expect(output).toContain('Completed Changes: 1');
    expect(output).toContain('Task Progress: 1/2 (50% complete)');
    expect(output).not.toContain('.hidden-change');
    expect(output).not.toContain('README.md');

    const archiveHeading = lines.indexOf('\nArchived Changes');
    expect(archiveHeading).toBeGreaterThan(lines.indexOf('\nCompleted Changes'));
    const archivedLines = lines.filter(line => line.includes('2026-01-'));
    expect(archivedLines).toHaveLength(2);
    expect(archivedLines[0]).toContain('2026-01-01-alpha');
    expect(archivedLines[1]).toContain('2026-01-02-zebra');
    expect(archivedLines.every(line => lines.indexOf(line) > archiveHeading)).toBe(true);
  });

  it.each(['missing changes', 'missing archive', 'empty archive', 'hidden entries only'])(
    'shows a zero archive count without an archived section for %s',
    async (state) => {
      const openspecDir = path.join(tempDir, 'openspec');
      const changesDir = path.join(openspecDir, 'changes');
      const archiveDir = path.join(changesDir, 'archive');
      await fs.mkdir(openspecDir);
      if (state !== 'missing changes') {
        await fs.mkdir(changesDir);
      }
      if (state === 'empty archive' || state === 'hidden entries only') {
        await fs.mkdir(archiveDir);
      }
      if (state === 'hidden entries only') {
        await fs.mkdir(path.join(archiveDir, '.hidden-change'));
        await fs.writeFile(path.join(archiveDir, 'README.md'), 'Archive notes');
      }

      await new ViewCommand().execute(tempDir);

      const lines = logOutput.map(stripAnsi);
      expect(lines.join('\n')).toContain('Archived Changes: 0');
      expect(lines).not.toContain('\nArchived Changes');
      expect(lines.join('\n')).not.toContain('Task Progress:');
    }
  );

  it('reports an archive path that is a file instead of silently showing no archives', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
    await fs.writeFile(path.join(changesDir, 'archive'), 'Not a directory');

    await expect(new ViewCommand().execute(tempDir)).rejects.toMatchObject({ code: 'ENOTDIR' });
    expect(logOutput.map(stripAnsi).join('\n')).not.toContain('Archived Changes: 0');
  });

  it.skipIf(process.platform === 'win32')('surfaces unreadable archive directories', async ({ skip }) => {
    const archiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');
    await fs.mkdir(archiveDir, { recursive: true });
    await fs.chmod(archiveDir, 0o000);

    try {
      // Root and some filesystems do not enforce permission bits.
      let unreadable = false;
      try {
        await fs.readdir(archiveDir);
      } catch {
        unreadable = true;
      }
      if (!unreadable) skip();

      await expect(new ViewCommand().execute(tempDir)).rejects.toMatchObject({ code: 'EACCES' });
      expect(logOutput.map(stripAnsi).join('\n')).not.toContain('Archived Changes: 0');
    } finally {
      await fs.chmod(archiveDir, 0o755);
    }
  });
});
