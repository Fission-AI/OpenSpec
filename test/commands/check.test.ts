import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

describe('check command', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-check-command-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });

    // Create a simple change
    const changeDir = path.join(changesDir, 'feat-auth');
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '# Change: feat-auth\n\n## Why\nAdd auth.\n\n## What Changes\n- Add login',
      'utf-8'
    );
    await fs.writeFile(
      path.join(changeDir, 'tasks.md'),
      '- [ ] Implement `src/auth.ts`\n- [ ] Add tests in `src/auth.test.ts`',
      'utf-8'
    );

    // Create config.yaml with a passing check
    const configPath = path.join(testDir, 'openspec', 'config.yaml');
    await fs.writeFile(configPath, 'schema: spec-driven\n', 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('suggests checks when none configured', async () => {
    const result = await runCLI(['check', 'feat-auth'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No checks configured');
  });

  it('runs a passing check and exits 0', async () => {
    // Write config with a simple passing command
    const configPath = path.join(testDir, 'openspec', 'config.yaml');
    await fs.writeFile(
      configPath,
      [
        'schema: spec-driven',
        'checks:',
        '  - name: "Echo check"',
        '    command: "echo hello"',
      ].join('\n'),
      'utf-8'
    );

    const result = await runCLI(['check', 'feat-auth'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Echo check');
    expect(result.stdout).toContain('passed');
  });

  it('runs a failing check and exits 1', async () => {
    const configPath = path.join(testDir, 'openspec', 'config.yaml');
    await fs.writeFile(
      configPath,
      [
        'schema: spec-driven',
        'checks:',
        '  - name: "Fail check"',
        '    command: "node -e process.exit(1)"',
      ].join('\n'),
      'utf-8'
    );

    const result = await runCLI(['check', 'feat-auth'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stdout + result.stderr).toContain('Fail check');
    expect(result.stdout + result.stderr).toContain('failed');
  });

  it('outputs JSON when --json is passed', async () => {
    const configPath = path.join(testDir, 'openspec', 'config.yaml');
    await fs.writeFile(
      configPath,
      [
        'schema: spec-driven',
        'checks:',
        '  - name: "Echo check"',
        '    command: "echo hello"',
      ].join('\n'),
      'utf-8'
    );

    const result = await runCLI(['check', 'feat-auth', '--json'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    const json = JSON.parse(result.stdout.trim());
    expect(json.changeName).toBe('feat-auth');
    expect(Array.isArray(json.checks)).toBe(true);
    expect(json.checks[0].name).toBe('Echo check');
    expect(json.checks[0].passed).toBe(true);
    expect(json.summary.total).toBe(1);
    expect(json.summary.passed).toBe(1);
  });

  it('auto-selects single active change when no name given', async () => {
    const configPath = path.join(testDir, 'openspec', 'config.yaml');
    await fs.writeFile(
      configPath,
      [
        'schema: spec-driven',
        'checks:',
        '  - name: "Echo check"',
        '    command: "echo hello"',
      ].join('\n'),
      'utf-8'
    );

    const result = await runCLI(['check'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('feat-auth');
  });

  it('skips check when files filter does not match', async () => {
    const configPath = path.join(testDir, 'openspec', 'config.yaml');
    await fs.writeFile(
      configPath,
      [
        'schema: spec-driven',
        'checks:',
        '  - name: "Rust check"',
        '    command: "echo rust"',
        '    files:',
        '      - "**/*.rs"',
      ].join('\n'),
      'utf-8'
    );

    const result = await runCLI(['check', 'feat-auth'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('skipped');
  });

  it('shows helpful message with detected checks', async () => {
    // Create a package.json so detector finds something
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({ name: 'test' }),
      'utf-8'
    );
    await fs.writeFile(
      path.join(testDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: {} }),
      'utf-8'
    );

    const result = await runCLI(['check', 'feat-auth'], { cwd: testDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('No checks configured');
    expect(result.stdout).toContain('TypeScript type check');
  });
});
