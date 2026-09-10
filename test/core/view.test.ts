import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
    vi.stubEnv('XDG_DATA_HOME', path.join(tempDir, 'data'));
    vi.stubEnv('XDG_CONFIG_HOME', path.join(tempDir, 'config'));

    originalLog = console.log;
    console.log = (...args: any[]) => {
      logOutput.push(args.join(' '));
    };

    logOutput = [];
  });

  afterEach(async () => {
    console.log = originalLog;
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('shows workflow states for legacy active changes without changing task progress', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    for (const name of ['planning', 'implementing']) {
      await fs.mkdir(path.join(changesDir, name), { recursive: true });
      await fs.writeFile(path.join(changesDir, name, 'tasks.md'), '- [x] Done\n- [ ] Pending\n');
    }
    await fs.writeFile(path.join(changesDir, 'implementing', 'proposal.md'), '# Proposal\n');

    await new ViewCommand().execute(tempDir);

    const lines = logOutput.map(stripAnsi);
    const planningIndex = lines.findIndex(line => line.includes('◉') && line.includes('planning'));
    const implementingIndex = lines.findIndex(line => line.includes('◉') && line.includes('implementing'));
    expect(lines[planningIndex + 1]).toBe('    └─ [spec-driven] proposal→ specs design tasks✓');
    expect(lines[implementingIndex + 1]).toBe('    └─ [spec-driven] proposal✓ specs→ design→ tasks✓');
    expect(lines[planningIndex]).toContain('50%');
    expect(lines[implementingIndex]).toContain('50%');
    expect(lines.join('\n')).toContain('Task Progress: 2/4 (50% complete)');
  });

  it('distinguishes skipped specs from completed and blocked artifacts', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'refactor');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\nskip_specs: true\n');
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Refactor\n');

    await new ViewCommand().execute(tempDir);

    expect(logOutput.map(stripAnsi)).toContain(
      '    └─ [spec-driven] proposal✓ specs (skipped) design→ tasks✓'
    );
  });

  it.each([
    ['malformed YAML', 'schema: [', 'Invalid YAML'],
    ['invalid metadata', 'schema: 123\n', 'Invalid metadata'],
    ['unknown schema', 'schema: missing-workflow\n', "Unknown schema 'missing-workflow'"],
  ])('warns about %s without hiding changes or breaking the dashboard', async (_name, metadata, error) => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    for (const name of ['broken', 'healthy']) {
      await fs.mkdir(path.join(changesDir, name), { recursive: true });
      await fs.writeFile(path.join(changesDir, name, 'tasks.md'), '- [ ] Pending\n');
    }
    await fs.writeFile(path.join(changesDir, 'broken', '.openspec.yaml'), metadata);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await new ViewCommand().execute(tempDir);

    const lines = logOutput.map(stripAnsi);
    expect(lines.filter(line => line.includes('◉'))).toHaveLength(2);
    expect(lines.filter(line => line.includes('└─'))).toEqual([
      '    └─ [spec-driven] proposal→ specs design tasks✓',
    ]);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(stripAnsi(String(warn.mock.calls[0][0]))).toContain('Could not load workflow status for "broken":');
    expect(stripAnsi(String(warn.mock.calls[0][0]))).toContain(error);
    expect(lines.join('\n')).toContain('Task Progress: 0/2 (0% complete)');
  });

  it('renders terminal controls in workflow errors as inert text', async () => {
    const changeDir = path.join(tempDir, 'openspec', 'changes', 'broken');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Pending\n');
    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      JSON.stringify({ schema: 'missing\u001b[2J\u009bH\r\nFORGED' })
    );
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    await new ViewCommand().execute(tempDir);

    expect(warn).toHaveBeenCalledTimes(1);
    expect(stripAnsi(String(warn.mock.calls[0][0]))).toContain("Unknown schema 'missing?[2J?H??FORGED'");
    expect(logOutput.map(stripAnsi).join('\n')).toContain('Task Progress: 0/1 (0% complete)');
  });

  it('renders terminal controls in every artifact state without changing workflow semantics', async () => {
    const openspecDir = path.join(tempDir, 'openspec');
    const schemaDir = path.join(openspecDir, 'schemas', 'custom');
    const changeDir = path.join(openspecDir, 'changes', 'display-controls');
    const ready = '設計\u001b[2J';
    const blocked = 'blocked\u009bH';
    const skipped = 'specs\r\n';
    const done = 'tasks\b\u0007';
    const artifact = (id: string, generates: string, requires: string[] = []) => ({
      id, generates, requires, description: 'Test artifact', template: 'template.md',
    });
    await fs.mkdir(schemaDir, { recursive: true });
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(schemaDir, 'schema.yaml'), JSON.stringify({
      name: 'custom',
      version: 1,
      artifacts: [
        artifact(ready, 'design.md'),
        artifact(blocked, 'review.md', [ready]),
        artifact(skipped, 'specs/**/*.md'),
        artifact(done, 'tasks.md'),
      ],
      apply: { requires: [done], tracks: 'tasks.md' },
    }));
    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: custom\nskip_specs: true\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '- [ ] Pending\n');

    await new ViewCommand().execute(tempDir);

    expect(logOutput.map(stripAnsi)).toContain(
      '    └─ [custom] 設計?[2J→ blocked?H specs?? (skipped) tasks??✓'
    );
    expect(logOutput.map(stripAnsi).join('\n')).toContain('Task Progress: 0/1 (0% complete)');
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
    expect(output).not.toContain('└─');
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

  it.each(['metadata', 'project config'])('uses a nested glob-tasks workflow from %s (#1202)', async (schemaSource) => {
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
    if (schemaSource === 'metadata') {
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: glob-tasks\n');
      await fs.writeFile(path.join(openspecDir, 'config.yaml'), 'schema: spec-driven\n');
    } else {
      await fs.writeFile(path.join(openspecDir, 'config.yaml'), 'schema: glob-tasks\n');
    }
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
    expect(output).toContain('└─ [glob-tasks] proposal→ tasks✓');
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
});
