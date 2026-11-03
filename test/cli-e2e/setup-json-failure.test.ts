import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

/**
 * `openspec setup --json` and `--revert --json` are read by agents and by
 * OpenSpec Desktop through a pipe, so stdout must hold exactly one JSON
 * document on failure too, in the shape that mode returns, with the exit code
 * saying what happened. The command used to print a human error and call
 * process.exit(), which both broke the shape and risked cutting the document
 * short where pipes are asynchronous.
 */
describe('openspec setup --json over a pipe, on failure', () => {
  let tempRoot: string;
  let env: Record<string, string>;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-setup-json-e2e-'));
    // The data directory is where setup writes the plugin. A regular file in
    // its place makes the first write fail, whatever the agents on this
    // machine are, so the test forces the failure path and not a real install.
    // Claude Code is detected from its config folder, so without one setup
    // finds no agents, writes nothing and succeeds.
    await fs.mkdir(path.join(tempRoot, '.claude'), { recursive: true });
    const dataHome = path.join(tempRoot, 'data-home');
    await fs.writeFile(dataHome, 'not a directory\n');
    env = {
      HOME: tempRoot,
      USERPROFILE: tempRoot,
      XDG_DATA_HOME: dataHome,
      XDG_CONFIG_HOME: path.join(tempRoot, 'xdg-config'),
    };
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('prints one parseable failure document in the setup shape', async () => {
    const result = await runCLI(['setup', '--json'], { cwd: tempRoot, env });

    expect(result.exitCode, result.stdout + result.stderr).not.toBe(0);
    const document = JSON.parse(result.stdout);
    expect(document).toMatchObject({ agents: [], workflows: [], moved: [] });
    expect(document.status).toEqual([
      expect.objectContaining({ severity: 'error', code: 'setup_error' }),
    ]);
  });
});
