import { afterAll, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

const tempRoots: string[] = [];

async function prepareNonEnglishSpec(): Promise<string> {
  const projectDir = await fs.mkdtemp(path.join(tmpdir(), 'openspec-i18n-validation-'));
  tempRoots.push(projectDir);
  const specDir = path.join(projectDir, 'openspec', 'specs', '日志记录');
  await fs.mkdir(specDir, { recursive: true });
  await fs.writeFile(
    path.join(specDir, 'spec.md'),
    `# 日志记录

## Purpose
记录应用程序中的重要事件，以便团队能够诊断问题、调查故障、审计活动并了解长期的系统行为。

## Requirements

### Requirement: 事件记录
系统必须记录应用程序中的重要事件。

#### Scenario: 事件发生
- **WHEN** 应用程序生成重要事件
- **THEN** 系统保存该事件
`
  );
  return projectDir;
}

afterAll(async () => {
  await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe('non-English validation (#243)', () => {
  it('passes normally with guidance but still fails in strict mode', async () => {
    const projectDir = await prepareNonEnglishSpec();

    const normal = await runCLI(
      ['validate', '日志记录', '--type', 'spec', '--no-interactive'],
      { cwd: projectDir }
    );
    expect(normal.exitCode).toBe(0);
    expect(normal.stdout).toContain('Specification');
    expect(normal.stdout).toContain('is valid');

    const normalJson = await runCLI(
      ['validate', '日志记录', '--type', 'spec', '--json', '--no-interactive'],
      { cwd: projectDir }
    );
    const report = JSON.parse(normalJson.stdout);
    expect(normalJson.exitCode).toBe(0);
    expect(report.summary.totals).toMatchObject({ passed: 1, failed: 0 });
    expect(report.items[0].valid).toBe(true);
    expect(report.items[0].issues).toContainEqual(
      expect.objectContaining({
        level: 'WARNING',
        message: expect.stringContaining('should contain SHALL or MUST'),
      })
    );

    const strict = await runCLI(
      ['validate', '日志记录', '--type', 'spec', '--strict', '--no-interactive'],
      { cwd: projectDir }
    );
    expect(strict.exitCode).toBe(1);
    const strictOutput = `${strict.stdout}${strict.stderr}`;
    expect(strictOutput).toContain('should contain SHALL or MUST');
    expect(strictOutput).toContain('has issues');
  });
});
