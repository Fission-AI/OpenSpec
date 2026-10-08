import { afterAll, describe, it, expect, beforeAll } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { tmpdir } from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * The scenario-loss check (#1477) only runs when a command hands the validator
 * its main specs root, so these exercise the wiring through the real CLI —
 * every entry point, and the exit code each one reports.
 */
describe('openspec validate reports scenarios a MODIFIED block would drop (#1477)', () => {
  const tempRoots: string[] = [];
  let projectDir: string;

  const write = async (relative: string, content: string) => {
    const file = path.join(projectDir, relative);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, content);
  };

  beforeAll(async () => {
    const base = await fs.mkdtemp(path.join(tmpdir(), 'openspec-scenario-loss-e2e-'));
    tempRoots.push(base);
    projectDir = path.join(base, 'project');
    await fs.mkdir(projectDir, { recursive: true });

    await write(
      'openspec/specs/widgets/spec.md',
      `# widgets Specification\n\n## Purpose\nDefine widget behavior for the end-to-end check.\n\n## Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported\n`
    );
    await write(
      'openspec/changes/drops-a-scenario/proposal.md',
      `# Drops a scenario\n\n## Why\nExercise the check.\n\n## What Changes\n- Rewrite one scenario\n`
    );
    await write(
      'openspec/changes/drops-a-scenario/specs/widgets/spec.md',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n`
    );
    await write(
      'openspec/changes/keeps-every-scenario/proposal.md',
      `# Keeps every scenario\n\n## Why\nControl case.\n\n## What Changes\n- Reword the requirement\n`
    );
    await write(
      'openspec/changes/keeps-every-scenario/specs/widgets/spec.md',
      `## MODIFIED Requirements\n\n### Requirement: Widget state\nThe system SHALL report the widget state promptly.\n\n#### Scenario: Existing scenario\n- **WHEN** queried\n- **THEN** the state is reported\n\n#### Scenario: Second scenario\n- **WHEN** idle\n- **THEN** idle is reported\n`
    );
  });

  afterAll(async () => {
    await Promise.all(tempRoots.map((dir) => fs.rm(dir, { recursive: true, force: true })));
  });

  it('fails `validate <change>` with exit code 1 and names the dropped scenario', async () => {
    const result = await runCLI(['validate', '--type', 'change', 'drops-a-scenario'], { cwd: projectDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('MODIFIED "Widget state" omits scenario(s)');
    expect(result.stderr).toContain('"Second scenario"');
  });

  it('fails the same way under --strict, and reports it in --json', async () => {
    const result = await runCLI(
      ['validate', '--type', 'change', 'drops-a-scenario', '--strict', '--json'],
      { cwd: projectDir }
    );

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout);
    const issue = report.items[0].issues.find((i: { message: string }) =>
      i.message.includes('omits scenario(s)')
    );
    expect(issue.level).toBe('ERROR');
    expect(issue.path).toBe('widgets/spec.md');
  });

  it('reports it in bulk `validate --changes`', async () => {
    const result = await runCLI(['validate', '--changes', '--json'], { cwd: projectDir });

    expect(result.exitCode).toBe(1);
    const report = JSON.parse(result.stdout);
    const byId = Object.fromEntries(
      report.items.map((item: { id: string; valid: boolean }) => [item.id, item.valid])
    );
    expect(byId['drops-a-scenario']).toBe(false);
    expect(byId['keeps-every-scenario']).toBe(true);
  });

  it('reports it through the deprecated `change validate` command', async () => {
    const result = await runCLI(['change', 'validate', 'drops-a-scenario'], { cwd: projectDir });

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('omits scenario(s)');
  });

  it('leaves a change that carries every scenario over passing', async () => {
    const result = await runCLI(['validate', '--type', 'change', 'keeps-every-scenario', '--strict'], {
      cwd: projectDir,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("Change 'keeps-every-scenario' is valid");
  });
});
