import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('openspec validate checks task numbering (#1520)', () => {
  let projectDir: string;

  const write = async (relative: string, content: string) => {
    const file = path.join(projectDir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content, 'utf-8');
  };

  const validDelta = [
    '## ADDED Requirements',
    '',
    '### Requirement: Task validation SHALL preserve planning references',
    'The validator SHALL preserve unambiguous task references.',
    '',
    '#### Scenario: Validate a task list',
    '- **WHEN** strict validation runs',
    '- **THEN** inconsistent task numbering is reported',
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

  beforeAll(async () => {
    projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-task-numbering-e2e-'));

    await write(
      'openspec/changes/bad-numbering/specs/tasks/spec.md',
      validDelta
    );
    await write(
      'openspec/changes/bad-numbering/tasks.md',
      [
        '## 10. First release',
        '',
        '- [x] 10.1 do a thing',
        '- [x] 10.6 do another thing',
        '',
        '## 11. Register corrections',
        '',
        '- [x] 10.7 belongs to group 10',
        '- [x] 10.8 also belongs to group 10',
        '- [ ] 11.1 a real group-11 task',
        '- [ ] 11.1 a duplicate id',
        '',
      ].join('\n')
    );

    await write(
      'openspec/changes/valid-numbering/specs/tasks/spec.md',
      validDelta
    );
    await write(
      'openspec/changes/valid-numbering/tasks.md',
      [
        '# Tasks',
        '- [ ] an unnumbered task before any numbered group',
        '',
        '## 3. Implementation',
        '- [ ] 3.2a an inserted task',
        '  - [ ] 3.2.1 a nested task',
        '- [ ] 3.5 a numbering gap is allowed',
        '',
        '## Notes',
        '- [ ] an unnumbered task under an unnumbered heading',
        '',
      ].join('\n')
    );

    await write('openspec/schemas/glob-tasks/schema.yaml', globTasksSchema);
    await write(
      'openspec/changes/nested-numbering/.openspec.yaml',
      'schema: glob-tasks\n'
    );
    await write(
      'openspec/changes/nested-numbering/specs/tasks/spec.md',
      validDelta
    );
    await write(
      'openspec/changes/nested-numbering/backend/tasks.md',
      '## 2. Backend\n- [ ] 3.1 wrong group\n'
    );
    await write(
      'openspec/changes/nested-numbering/frontend/tasks.md',
      '## 4. Frontend\n- [ ] 4.1 correct group\n'
    );
  });

  afterAll(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  it('reports duplicate full ids and group mismatches under --strict', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'bad-numbering', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout);
    const issues = report.items[0].issues.filter(
      (issue: { path: string }) => issue.path === 'tasks.md'
    );
    expect(issues).toEqual([
      expect.objectContaining({
        level: 'WARNING',
        line: 8,
        message: expect.stringContaining('10.7'),
      }),
      expect.objectContaining({
        level: 'WARNING',
        line: 9,
        message: expect.stringContaining('10.8'),
      }),
      expect.objectContaining({
        level: 'WARNING',
        line: 11,
        message: expect.stringMatching(/11\.1.*duplicate/i),
      }),
    ]);
  });

  it('keeps warnings non-blocking without --strict', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'bad-numbering', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.items[0].valid).toBe(true);
    expect(
      report.items[0].issues.filter((issue: { level: string }) => issue.level === 'WARNING')
    ).toHaveLength(3);
  });

  it('allows full-depth ids, suffixes, gaps, and unnumbered sections', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'valid-numbering', '--strict'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Change 'valid-numbering' is valid");
  });

  it('applies the same warnings to bulk validation', async () => {
    const result = await runCLI(['validate', '--changes', '--strict', '--json'], {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout);
    const byId = Object.fromEntries(
      report.items.map((item: { id: string; valid: boolean }) => [item.id, item.valid])
    );
    expect(byId['bad-numbering']).toBe(false);
    expect(byId['valid-numbering']).toBe(true);
    expect(byId['nested-numbering']).toBe(false);
  });

  it('validates every task file selected by the schema glob', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'nested-numbering', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout);
    const taskIssues = report.items[0].issues.filter(
      (issue: { path: string }) => issue.path.endsWith('tasks.md')
    );
    expect(taskIssues).toEqual([
      expect.objectContaining({
        level: 'WARNING',
        path: 'backend/tasks.md',
        line: 2,
        message: expect.stringContaining('3.1'),
      }),
    ]);
  });

  it('applies the same warnings to the deprecated change validate command', async () => {
    const result = await runCLI(
      ['change', 'validate', 'bad-numbering', '--strict'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Task "10.7" is under group 11');
    expect(result.stderr).toContain('Task ID "11.1" is duplicated');
  });
});
