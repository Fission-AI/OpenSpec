import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';
import { cleanupTempPath } from '../helpers/temp-cleanup.js';

/**
 * Flag handling that lives in the CLI layer rather than in the command class,
 * so it can only be exercised through the real argument parser.
 */
describe('openspec sync / list --status (CLI surface)', () => {
  let tempDir: string;
  let env: NodeJS.ProcessEnv;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-sync-cli-'));
    await fs.mkdir(path.join(tempDir, 'openspec', 'changes'), { recursive: true });
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
    await fs.writeFile(path.join(tempDir, 'openspec', 'project.md'), '# Demo\n');
    // Keep root resolution off any store registry on the host machine.
    env = { ...process.env, XDG_DATA_HOME: path.join(tempDir, 'xdg-data') };
  });

  afterEach(async () => {
    await cleanupTempPath(tempDir);
  });

  it('rejects --status combined with --specs', async () => {
    const result = await runCLI(['list', '--specs', '--status', 'shipped'], {
      cwd: tempDir,
      env,
    });

    // Silently ignoring it would print the full spec list as though the filter
    // had matched everything.
    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('cannot be combined with --specs');
  });

  it('rejects an unknown --status value', async () => {
    const result = await runCLI(['list', '--status', 'bogus'], {
      cwd: tempDir,
      env,
    });

    expect(result.exitCode).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain("Unknown --status 'bogus'");
  });

  it('exits 0 from sync --check when nothing declares a status', async () => {
    const result = await runCLI(['sync', '--check'], { cwd: tempDir, env });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('nothing to check');
  });

  it('registers sync in --help', async () => {
    const result = await runCLI(['--help'], { cwd: tempDir, env });

    expect(result.stdout).toContain('sync');
  });
});
