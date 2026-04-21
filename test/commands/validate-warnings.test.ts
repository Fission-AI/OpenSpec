import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

/**
 * Tests that both `openspec change validate` and `openspec validate` display
 * WARNING-level issues alongside "is valid" and set exit codes correctly:
 * exit 0 for warnings-only, exit 1 for errors.
 */

const SPECLESS_PROPOSAL = [
  '# Change: Warn Test',
  '',
  '## Why',
  'Bug fix that needs no spec changes and is long enough for validation.',
  '',
  '## What Changes',
  '- Fix a bug',
].join('\n');

describe('change validate — requireSpecDeltas warning display', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-change-validate-warn-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');

  async function scaffoldSpeclessChange(changeId: string) {
    const changeDir = path.join(changesDir, changeId);
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), SPECLESS_PROPOSAL);
  }

  async function writeConfig(content: string) {
    await fs.writeFile(path.join(testDir, 'openspec', 'config.yaml'), content);
  }

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints "is valid" to stdout and WARNING to stderr when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('w1');

    const result = await runCLI(['change', 'validate', 'w1'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('is valid');
    expect(result.stderr).toContain('WARNING');
    expect(result.stderr).not.toContain('Next steps');
  });

  it('exits 1 and prints "has issues" when requireSpecDeltas is default (error) and no deltas', async () => {
    await scaffoldSpeclessChange('e1');

    const result = await runCLI(['change', 'validate', 'e1'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ERROR');
    expect(result.stderr).toContain('has issues');
    expect(result.stderr).toContain('Next steps');
  });

  it('prints "is valid" with no warnings when requireSpecDeltas is false', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: false\n');
    await scaffoldSpeclessChange('f1');

    const result = await runCLI(['change', 'validate', 'f1'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('is valid');
    expect(result.stderr).not.toContain('WARNING');
    expect(result.stderr).not.toContain('ERROR');
  });

  it('includes warning issues in JSON output when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('j1');

    const result = await runCLI(['change', 'validate', 'j1', '--json'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout.trim());
    expect(json.valid).toBe(true);
    const warningIssues = json.issues.filter((i: any) => i.level === 'WARNING');
    expect(warningIssues.length).toBeGreaterThan(0);
  });

  it('exits 1 and prints "has issues" with --strict when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('s1');

    const result = await runCLI(['change', 'validate', 's1', '--strict'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('WARNING');
    expect(result.stderr).toContain('has issues');
  });

  it('marks item invalid in JSON output with --strict when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('sj1');

    const result = await runCLI(['change', 'validate', 'sj1', '--json', '--strict'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    const json = JSON.parse(result.stdout.trim());
    expect(json.valid).toBe(false);
    const warningIssues = json.issues.filter((i: any) => i.level === 'WARNING');
    expect(warningIssues.length).toBeGreaterThan(0);
  });
});

describe('openspec validate — requireSpecDeltas warning display', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-validate-warn-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');

  async function scaffoldSpeclessChange(changeId: string) {
    const changeDir = path.join(changesDir, changeId);
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, 'proposal.md'), SPECLESS_PROPOSAL);
  }

  async function writeConfig(content: string) {
    await fs.writeFile(path.join(testDir, 'openspec', 'config.yaml'), content);
  }

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints "is valid" to stdout and WARNING to stderr when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('w2');

    const result = await runCLI(['validate', 'w2'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('is valid');
    expect(result.stderr).toContain('WARNING');
    expect(result.stderr).not.toContain('Next steps');
  });

  it('exits 1 and prints "has issues" when requireSpecDeltas is default (error) and no deltas', async () => {
    await scaffoldSpeclessChange('e2');

    const result = await runCLI(['validate', 'e2'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('ERROR');
    expect(result.stderr).toContain('has issues');
    expect(result.stderr).toContain('Next steps');
  });

  it('prints "is valid" with no warnings when requireSpecDeltas is false', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: false\n');
    await scaffoldSpeclessChange('f2');

    const result = await runCLI(['validate', 'f2'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('is valid');
    expect(result.stderr).not.toContain('WARNING');
    expect(result.stderr).not.toContain('ERROR');
  });

  it('includes warning issues in JSON output when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('j2');

    const result = await runCLI(['validate', 'j2', '--json'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout.trim());
    expect(json.items).toBeDefined();
    expect(json.items[0].valid).toBe(true);
    const warningIssues = json.items[0].issues.filter((i: any) => i.level === 'WARNING');
    expect(warningIssues.length).toBeGreaterThan(0);
  });

  it('exits 1 and prints "has issues" with --strict when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('s2');

    const result = await runCLI(['validate', 's2', '--strict'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('WARNING');
    expect(result.stderr).toContain('has issues');
  });

  it('marks item invalid in JSON output with --strict when requireSpecDeltas is "warn"', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('sj2');

    const result = await runCLI(['validate', 'sj2', '--json', '--strict'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    const json = JSON.parse(result.stdout.trim());
    expect(json.items[0].valid).toBe(false);
    const warningIssues = json.items[0].issues.filter((i: any) => i.level === 'WARNING');
    expect(warningIssues.length).toBeGreaterThan(0);
  });

  it('shows warnings in --changes bulk JSON output and exits 0', async () => {
    await writeConfig('schema: spec-driven\nrequireSpecDeltas: warn\n');
    await scaffoldSpeclessChange('b1');

    const result = await runCLI(['validate', '--changes', '--json'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout.trim());
    const item = json.items.find((i: any) => i.id === 'b1');
    expect(item).toBeDefined();
    expect(item.valid).toBe(true);
    const warningIssues = item.issues.filter((i: any) => i.level === 'WARNING');
    expect(warningIssues.length).toBeGreaterThan(0);
  });
});
