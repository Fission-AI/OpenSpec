import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { runCLI } from '../helpers/run-cli.js';

describe('validate command enriched human output', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-validate-enriched-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');
  const bin = path.join(projectRoot, 'bin', 'openspec.js');


  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  const writeArchiveBlocker = async () => {
    const mainDir = path.join(testDir, 'openspec', 'specs', 'widgets');
    const changeDir = path.join(changesDir, 'c-archive');
    const deltaDir = path.join(changeDir, 'specs', 'widgets');
    await fs.mkdir(mainDir, { recursive: true });
    await fs.mkdir(deltaDir, { recursive: true });
    await fs.writeFile(path.join(mainDir, 'spec.md'), `# Widgets Specification

## Purpose
Define how widgets report their existing state consistently to all callers.

## Requirements

### Requirement: Existing state
The system SHALL report the existing state.

#### Scenario: Query state
- **WHEN** queried
- **THEN** the state is reported
`);
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '# Widget update\n\n## Why\nUpdate widgets.\n\n## What Changes\n- Update state reporting\n'
    );
    await fs.writeFile(path.join(deltaDir, 'spec.md'), `## MODIFIED Requirements

### Requirement: Future state
The system SHALL report the future state.

#### Scenario: Query state
- **WHEN** queried
- **THEN** the state is reported
`);
  };

  const entryPoints = [
    ['validate', 'c-archive'],
    ['change', 'validate', 'c-archive'],
    ['validate', '--changes'],
    ['validate', '--all'],
  ];

  for (const strict of [false, true]) {
    for (const args of entryPoints) {
      const invocation = [...args, ...(strict ? ['--strict'] : [])];

      it(`shows non-blocking archive advice for ${invocation.join(' ')}`, async () => {
        await writeArchiveBlocker();

        const result = await runCLI([...invocation, '--no-interactive'], { cwd: testDir });

        expect(result.exitCode).toBe(0);
        expect(result.stderr).toContain('ℹ [INFO] widgets/spec.md: Archive would refuse this delta:');
        expect(result.stderr).toContain('Future state');
        expect(result.stderr).not.toContain('Next steps:');
        expect(result.stdout).toMatch(/is valid|0 failed/);
      });

      it(`keeps archive advice structured and non-blocking for ${invocation.join(' ')} --json`, async () => {
        await writeArchiveBlocker();

        const result = await runCLI([...invocation, '--json', '--no-interactive'], { cwd: testDir });

        expect(result.exitCode).toBe(0);
        const output = JSON.parse(result.stdout);
        const report = args[0] === 'change'
          ? output
          : output.items.find((item: { id: string }) => item.id === 'c-archive');
        expect(report.valid).toBe(true);
        expect(report.issues).toContainEqual(expect.objectContaining({
          level: 'INFO',
          path: 'widgets/spec.md',
          message: expect.stringContaining('Archive would refuse this delta:'),
        }));
        expect(result.stderr).not.toContain('Archive would refuse this delta:');
        if (args[0] !== 'change') expect(output.summary.totals.failed).toBe(0);
      });
    }
  }

  it('preserves INFO severity in the deprecated command when another delta is invalid', async () => {
    await writeArchiveBlocker();
    const invalidDir = path.join(changesDir, 'c-archive', 'specs', 'broken');
    await fs.mkdir(invalidDir, { recursive: true });
    await fs.writeFile(
      path.join(invalidDir, 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Missing scenario\nThe system SHALL do something.\n'
    );

    const result = await runCLI(['change', 'validate', 'c-archive', '--no-interactive'], { cwd: testDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ℹ [INFO] widgets/spec.md: Archive would refuse this delta:');
    expect(result.stderr).toContain('[ERROR]');
    expect(result.stderr).toContain('Next steps:');
  });

  it('prints Next steps footer and guidance on invalid change', async () => {
    const changeContent = `# Test Change\n\n## Why\nThis is a sufficiently long explanation to pass the why length requirement for validation purposes.\n\n## What Changes\nThere are changes proposed, but no delta specs provided yet.`;
    const changeId = 'c-next-steps';
    const changePath = path.join(changesDir, changeId);
    await fs.mkdir(changePath, { recursive: true });
    await fs.writeFile(path.join(changePath, 'proposal.md'), changeContent);

    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      let code = 0;
      let stderr = '';
      try {
        execFileSync('node', [bin, 'change', 'validate', changeId], { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e: any) {
        code = e?.status ?? 1;
        stderr = e?.stderr?.toString?.() ?? '';
      }
      expect(code).not.toBe(0);
      expect(stderr).toContain('has issues');
      expect(stderr).toContain('Next steps:');
      expect(stderr).toContain('openspec change show');
    } finally {
      process.chdir(originalCwd);
    }
  });
});


