import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

// A config.yaml that is not valid YAML is ignored everywhere with a warning,
// so `validate` must be the gate that fails on it (#1892).
describe('validate with an unparseable config.yaml', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-validate-config-'));
    const specDir = path.join(testDir, 'openspec', 'specs', 'alpha');
    await fs.mkdir(specDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'openspec', 'changes'), { recursive: true });
    await fs.writeFile(
      path.join(specDir, 'spec.md'),
      [
        '## Purpose',
        'This spec gives the validator one well-formed capability to check in this test.',
        '',
        '## Requirements',
        '',
        '### Requirement: Alpha SHALL respond',
        'The alpha module SHALL respond to every request.',
        '',
        '#### Scenario: Request handled',
        '- **WHEN** a request arrives',
        '- **THEN** alpha responds',
      ].join('\n')
    );
    configPath = path.join(testDir, 'openspec', 'config.yaml');
    // The reproduction from #1892: an unterminated quote in a rules item.
    await fs.writeFile(
      configPath,
      "rules:\n  proposal:\n    - 'Keep the \"Why\" section concrete: what breaks today\n"
    );
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it.each([[['--all']], [['--specs']], [['alpha']]])('fails `validate %s` with the parse error', async (args) => {
    const result = await runCLI(['validate', ...args], { cwd: testDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error: Could not parse');
    expect(result.stderr).toContain('Fix: Fix the YAML syntax in');
    expect(result.stderr).toContain(path.join('openspec', 'config.yaml'));
  });

  it('fails the same way when the config is spelled config.yml', async () => {
    const ymlPath = path.join(testDir, 'openspec', 'config.yml');
    await fs.rename(configPath, ymlPath);

    const result = await runCLI(['validate', '--all'], { cwd: testDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(path.join('openspec', 'config.yml'));
  });

  it('leaves other commands warning and carrying on', async () => {
    const result = await runCLI(['list', '--specs'], { cwd: testDir });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('alpha');
  });

  it('reports the parse error in the JSON status envelope', async () => {
    const result = await runCLI(['validate', '--all', '--json'], { cwd: testDir });

    expect(result.exitCode).toBe(1);
    const output = JSON.parse(result.stdout);
    expect(output.status).toHaveLength(1);
    expect(output.status[0]).toMatchObject({ severity: 'error', code: 'unparseable_config' });
    expect(output.status[0].message).toContain('Could not parse');
    expect(output.status[0].message).toContain(path.join('openspec', 'config.yaml'));
  });

  it('reports a config path that cannot be read as a read failure, not bad YAML', async () => {
    await fs.rm(configPath);
    await fs.mkdir(configPath);

    const result = await runCLI(['validate', '--all'], { cwd: testDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Error: Could not read');
    expect(result.stderr).toContain(path.join('openspec', 'config.yaml'));
    expect(result.stderr).not.toContain('Could not parse');
    expect(result.stderr).not.toContain('YAML syntax');

    const json = await runCLI(['validate', '--all', '--json'], { cwd: testDir });
    expect(json.exitCode).toBe(1);
    const output = JSON.parse(json.stdout);
    expect(output.status).toHaveLength(1);
    expect(output.status[0]).toMatchObject({ severity: 'error', code: 'unreadable_config' });
  });

  it('still passes once the YAML is fixed', async () => {
    await fs.writeFile(configPath, 'schema: spec-driven\n');

    const result = await runCLI(['validate', '--all'], { cwd: testDir });

    expect(result.exitCode).toBe(0);
  });
});
