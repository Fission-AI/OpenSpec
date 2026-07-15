import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { ViewCommand } from '../../src/core/view.js';

const stripAnsi = (input: string): string => input.replace(/\u001b\[[0-9;]*m/g, '');

function extractSection(output: string, heading: string, nextHeadings: string[]): string {
  const lines = output.split('\n');
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  if (headingIndex === -1) {
    return '';
  }

  const nextHeadingIndex = lines.findIndex(
    (line, index) => index > headingIndex && nextHeadings.includes(line.trim())
  );
  const sectionLines = lines.slice(
    headingIndex + 1,
    nextHeadingIndex === -1 ? lines.length : nextHeadingIndex
  );

  return sectionLines.join('\n').trim();
}

function extractSectionLines(output: string, heading: string, nextHeadings: string[]): string[] {
  const section = extractSection(output, heading, nextHeadings);
  return section
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function scaffoldChange(
  changesDir: string,
  changeId: string,
  tasksContent?: string
): Promise<void> {
  const changeDir = path.join(changesDir, ...changeId.split('/'));
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
  if (tasksContent !== undefined) {
    await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
  }
}

describe('ViewCommand', () => {
  let tempDir: string;
  let originalLog: typeof console.log;
  let logOutput: string[] = [];

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-view-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

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
    await scaffoldChange(changesDir, 'empty-change');

    // Change with tasks.md but no tasks - should show in Draft
    await scaffoldChange(changesDir, 'no-tasks-change', '# Tasks\n\nNo tasks yet.');

    // Change with all tasks complete - should show in Completed
    await scaffoldChange(changesDir, 'completed-change', '- [x] Done task\n');

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');

    const draftLines = extractSectionLines(output, 'Draft Changes', [
      'Active Changes',
      'Completed Changes',
      'Specifications',
    ]);
    const completedLines = extractSectionLines(output, 'Completed Changes', ['Specifications']);

    expect(draftLines.length).toBeGreaterThan(0);
    expect(completedLines.length).toBeGreaterThan(0);

    expect(draftLines.some((line) => line.includes('empty-change'))).toBe(true);
    expect(draftLines.some((line) => line.includes('no-tasks-change'))).toBe(true);
    expect(draftLines.some((line) => line.includes('completed-change'))).toBe(false);

    expect(completedLines.some((line) => line.includes('completed-change'))).toBe(true);
    expect(completedLines.some((line) => line.includes('empty-change'))).toBe(false);
    expect(completedLines.some((line) => line.includes('no-tasks-change'))).toBe(false);
  });

  it('sorts active changes by completion percentage ascending with deterministic tie-breakers', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    await scaffoldChange(changesDir, 'gamma-change', '- [x] Done\n- [x] Also done\n- [ ] Not done\n');
    await scaffoldChange(changesDir, 'beta-change', '- [x] Task 1\n- [ ] Task 2\n');
    await scaffoldChange(changesDir, 'delta-change', '- [x] Task 1\n- [ ] Task 2\n');
    await scaffoldChange(changesDir, 'alpha-change', '- [ ] Task 1\n- [ ] Task 2\n');

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const activeLines = logOutput
      .map(stripAnsi)
      .filter(
        (line) =>
          line.includes('alpha-change') ||
          line.includes('beta-change') ||
          line.includes('delta-change') ||
          line.includes('gamma-change')
      );

    const activeOrder = activeLines.map(line => {
      return line.replace(/^.*?◉\s+/, '').split('[')[0]?.trim();
    });

    expect(activeOrder).toEqual([
      'alpha-change',
      'beta-change',
      'delta-change',
      'gamma-change'
    ]);
  });

  it('shows nested change ids discovered recursively', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });

    await scaffoldChange(changesDir, 'platform/api/add-auth', '- [ ] Task 1\n');

    const viewCommand = new ViewCommand();
    await viewCommand.execute(tempDir);

    const output = logOutput.map(stripAnsi).join('\n');
    expect(output).toContain('platform/api/add-auth');
    expect(output).toContain('Active Changes');
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
    const activeLines = logOutput.map(stripAnsi).filter(line => line.includes('nested-change'));
    expect(activeLines.some(line => line.includes('nested-change'))).toBe(true);
    const draftSection = output.includes('Draft Changes')
      ? output.slice(output.indexOf('Draft Changes'), output.includes('Active Changes') ? output.indexOf('Active Changes') : undefined)
      : '';
    expect(draftSection.includes('nested-change')).toBe(false);
    expect(output).toContain('60%');
  });
});
