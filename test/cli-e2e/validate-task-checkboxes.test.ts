import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('openspec validate checks task checkbox formatting (#354)', () => {
  let projectDir: string;

  const write = async (relative: string, content: string) => {
    const file = path.join(projectDir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf-8');
  };

  const validDelta = [
    '## ADDED Requirements',
    '',
    '### Requirement: Task lists SHALL be machine readable',
    'The validator SHALL report task lists that progress cannot count.',
    '',
    '#### Scenario: Validate a bullet-only task list',
    '- **WHEN** validation runs on a task file without checkboxes',
    '- **THEN** the change is reported as counting zero tasks',
    '',
  ].join('\n');

  const globTasksSchema = [
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

  // No `apply` block: the tracked-tasks artifact is found by its `tasks` id,
  // the same fallback progress counting uses.
  const implicitTasksSchema = [
    'name: implicit-tasks',
    'version: 1',
    'description: tasks artifact without an apply block',
    'artifacts:',
    '  - id: proposal',
    '    generates: proposal.md',
    '    description: Proposal',
    '    template: proposal.md',
    '    requires: []',
    '  - id: tasks',
    '    generates: tasks.md',
    '    description: Tasks',
    '    template: tasks.md',
    '    requires: [proposal]',
    '',
  ].join('\n');

  const untrackedTasksSchema = [
    'name: no-tasks-artifact',
    'version: 1',
    'description: schema without a tracked tasks artifact',
    'artifacts:',
    '  - id: proposal',
    '    generates: proposal.md',
    '    description: Proposal',
    '    template: proposal.md',
    '    requires: []',
    '',
  ].join('\n');

  beforeAll(async () => {
    projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-task-checkboxes-e2e-'));

    await write('openspec/changes/bullet-tasks/specs/tasks/spec.md', validDelta);
    await write(
      'openspec/changes/bullet-tasks/tasks.md',
      ['# Tasks', '', '## 1. Implementation', '', '- Add the parser', '- Add the tests', ''].join(
        '\n'
      )
    );

    await write('openspec/changes/checkbox-tasks/specs/tasks/spec.md', validDelta);
    await write(
      'openspec/changes/checkbox-tasks/tasks.md',
      ['## 1. Implementation', '', '- [ ] 1.1 Add the parser', '- A supporting note', ''].join('\n')
    );

    await write('openspec/schemas/glob-tasks/schema.yaml', globTasksSchema);
    await write('openspec/changes/nested-bullets/.openspec.yaml', 'schema: glob-tasks\n');
    await write('openspec/changes/nested-bullets/specs/tasks/spec.md', validDelta);
    await write('openspec/changes/nested-bullets/backend/tasks.md', '- build the api\n');
    await write('openspec/changes/nested-bullets/frontend/tasks.md', '- [ ] 2.1 build the ui\n');

    await write('openspec/changes/nested-all-bullets/.openspec.yaml', 'schema: glob-tasks\n');
    await write('openspec/changes/nested-all-bullets/specs/tasks/spec.md', validDelta);
    await write('openspec/changes/nested-all-bullets/backend/tasks.md', '- build the api\n');
    await write('openspec/changes/nested-all-bullets/frontend/tasks.md', '- build the ui\n');

    await write('openspec/schemas/implicit-tasks/schema.yaml', implicitTasksSchema);
    await write('openspec/changes/implicit-tracking/.openspec.yaml', 'schema: implicit-tasks\n');
    await write('openspec/changes/implicit-tracking/specs/tasks/spec.md', validDelta);
    await write('openspec/changes/implicit-tracking/tasks.md', '- build the api\n');

    await write('openspec/schemas/no-tasks-artifact/schema.yaml', untrackedTasksSchema);
    await write('openspec/changes/untracked-tasks/.openspec.yaml', 'schema: no-tasks-artifact\n');
    await write('openspec/changes/untracked-tasks/specs/tasks/spec.md', validDelta);
    await write('openspec/changes/untracked-tasks/tasks.md', '- an untracked bullet\n');
  });

  afterAll(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('reports a bullet-only task list and names the counting consequence', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'bullet-tasks', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.items[0].issues).toEqual([
      expect.objectContaining({
        level: 'WARNING',
        path: 'tasks.md',
        line: 5,
        message: expect.stringContaining('counts as 0 tasks'),
      }),
    ]);
  });

  it('agrees with the progress the same change reports', async () => {
    const result = await runCLI(['list', '--changes'], { cwd: projectDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/bullet-tasks\s+No tasks/);
  });

  it('keeps the warning non-blocking without --strict', async () => {
    const result = await runCLI(['validate', '--type', 'change', 'bullet-tasks', '--json'], {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).items[0].valid).toBe(true);
  });

  it('stays silent when the change has a real checklist', async () => {
    const result = await runCLI(['validate', '--type', 'change', 'checkbox-tasks', '--strict'], {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Change 'checkbox-tasks' is valid");
  });

  it('checks the whole tracked set of a custom schema, not each file alone', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'nested-bullets', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(0);
    const taskIssues = JSON.parse(result.stdout).items[0].issues.filter(
      (issue: { path: string }) => issue.path.endsWith('tasks.md')
    );
    expect(taskIssues).toEqual([]);
  });

  it('reports each nested file with a POSIX path when none of them has a checkbox', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'nested-all-bullets', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
    // Paths are normalized, so this assertion fails on a Windows separator.
    expect(JSON.parse(result.stdout).items[0].issues).toEqual([
      expect.objectContaining({ level: 'WARNING', path: 'backend/tasks.md', line: 1 }),
      expect.objectContaining({ level: 'WARNING', path: 'frontend/tasks.md', line: 1 }),
    ]);
  });

  it('ignores a tasks file no artifact tracks', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'untracked-tasks', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).items[0].issues).toEqual([]);
  });

  it('follows the tracked-tasks artifact when a schema declares no apply block', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'implicit-tracking', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout).items[0].issues).toEqual([
      expect.objectContaining({ level: 'WARNING', path: 'tasks.md', line: 1 }),
    ]);
  });

  it('surfaces the warning through the deprecated change validate command', async () => {
    const result = await runCLI(['change', 'validate', 'bullet-tasks', '--strict'], {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(1);
    // The text renderer prints level, path and message; it carries no line for
    // any issue, which is why this asserts what that surface actually emits.
    // The line lives in the JSON report, asserted above.
    expect(result.stderr).toContain('[WARNING] tasks.md:');
    expect(result.stderr).toContain('counts as 0 tasks');
  });

  it.skipIf(process.platform === 'win32')(
    'stays silent when a tracked file exists but cannot be read',
    async () => {
      // The claim is about the whole tracked set, and the checkboxes could be
      // in exactly the file that would not open.
      const dir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-task-unreadable-e2e-'));
      const writeIn = async (relative: string, content: string) => {
        const file = path.join(dir, relative);
        await fs.mkdir(path.dirname(file), { recursive: true });
        await fs.writeFile(file, content, 'utf-8');
        return file;
      };
      await writeIn('openspec/schemas/glob-tasks/schema.yaml', globTasksSchema);
      await writeIn('openspec/changes/half-read/.openspec.yaml', 'schema: glob-tasks\n');
      await writeIn('openspec/changes/half-read/specs/tasks/spec.md', validDelta);
      await writeIn('openspec/changes/half-read/backend/tasks.md', '- build the api\n');
      const locked = await writeIn(
        'openspec/changes/half-read/frontend/tasks.md',
        '- [ ] 2.1 build the ui\n'
      );
      await fs.chmod(locked, 0o000);

      try {
        // Without this the test would pass for the wrong reason: if the lock did
        // not take (root, or a filesystem that ignores the mode), the checkbox
        // in this very file would silence the warning on its own.
        await expect(fs.readFile(locked, 'utf-8')).rejects.toThrow();

        const result = await runCLI(
          ['validate', '--type', 'change', 'half-read', '--strict', '--json'],
          { cwd: dir }
        );

        expect(result.exitCode).toBe(0);
        expect(JSON.parse(result.stdout).items[0].issues).toEqual([]);
      } finally {
        await fs.chmod(locked, 0o644);
        await fs.rm(dir, { recursive: true, force: true });
      }
    }
  );

  it('applies the warning in bulk validation', async () => {
    const result = await runCLI(['validate', '--changes', '--strict', '--json'], {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(1);
    const byId = Object.fromEntries(
      JSON.parse(result.stdout).items.map((item: { id: string; valid: boolean }) => [
        item.id,
        item.valid,
      ])
    );
    expect(byId['bullet-tasks']).toBe(false);
    expect(byId['checkbox-tasks']).toBe(true);
    expect(byId['nested-bullets']).toBe(true);
    expect(byId['nested-all-bullets']).toBe(false);
    expect(byId['implicit-tracking']).toBe(false);
    expect(byId['untracked-tasks']).toBe(true);
  });
});
