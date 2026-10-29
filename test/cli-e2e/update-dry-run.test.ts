import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

/**
 * `update --dry-run --json` is read by agents and OpenSpec Desktop through a
 * pipe, so stdout must hold exactly one JSON document - on success and on
 * failure - and the exit code must say which.
 */
describe('openspec update --dry-run --json over a pipe', () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-update-dry-run-e2e-'));
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('prints one parseable failure document and exits 1', async () => {
    const missing = path.join(tempRoot, 'not-a-project');
    await fs.mkdir(missing);

    const result = await runCLI(['update', missing, '--dry-run', '--json'], { cwd: tempRoot });

    expect(result.exitCode).toBe(1);
    const document = JSON.parse(result.stdout);
    expect(document).toMatchObject({ changes: [], notes: [], failures: [] });
    expect(document.status).toEqual([
      expect.objectContaining({ severity: 'error', code: 'update_error' }),
    ]);
  });

  it('prints one parseable plan and exits 0, writing nothing', async () => {
    const project = path.join(tempRoot, 'project');
    await fs.mkdir(project);
    const env = { HOME: tempRoot, USERPROFILE: tempRoot, XDG_CONFIG_HOME: path.join(tempRoot, 'xdg') };
    const init = await runCLI(['init', '--tools', 'claude'], { cwd: project, env });
    expect(init.exitCode).toBe(0);
    const skill = path.join(project, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
    await fs.writeFile(skill, 'hand-edited\n');

    const result = await runCLI(['update', '--dry-run', '--json'], { cwd: project, env });

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(result.stdout).changes).toContainEqual({
      path: '.claude/skills/openspec-propose/SKILL.md',
      action: 'update',
      tool: 'claude',
    });
    expect(await fs.readFile(skill, 'utf-8')).toBe('hand-edited\n');
  });

  it('refuses --json without --dry-run with exit 1 and nothing on stdout', async () => {
    const result = await runCLI(['update', '--json'], { cwd: tempRoot });

    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--json is only available with --dry-run.');
  });
});
