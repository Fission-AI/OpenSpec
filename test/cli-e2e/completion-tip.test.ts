import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { runCLI } from '../helpers/run-cli.js';

/**
 * The completions tip is a one-shot hint aimed at a human at a terminal.
 * Spawned runs — agents driving the CLI, shell pipelines, CI — have no TTY on
 * stderr, so they must leave the tip unconsumed for the next interactive run.
 * A regression here is invisible in normal use: the user simply never sees the
 * tip, because a background `openspec status` already spent it.
 */
describe('completions tip in non-interactive runs', () => {
  async function freshConfigHome(): Promise<string> {
    return fs.mkdtemp(path.join(os.tmpdir(), 'openspec-tip-e2e-'));
  }

  async function tipSeenFlag(configHome: string): Promise<unknown> {
    try {
      const raw = await fs.readFile(path.join(configHome, 'openspec', 'config.json'), 'utf-8');
      return JSON.parse(raw).completionTipSeen;
    } catch {
      return undefined;
    }
  }

  it('never prints or consumes the tip when stderr is not a terminal', async () => {
    const configHome = await freshConfigHome();

    // CI is explicitly off, so only the non-TTY guard can suppress the tip.
    const result = await runCLI(['list'], { env: { XDG_CONFIG_HOME: configHome, CI: '' } });

    expect(result.stdout).not.toContain('completion install');
    expect(result.stderr).not.toContain('completion install');
    expect(await tipSeenFlag(configHome)).toBeUndefined();
  });

  it('leaves stdout parseable on a --json run', async () => {
    const configHome = await freshConfigHome();

    const result = await runCLI(['list', '--json'], {
      env: { XDG_CONFIG_HOME: configHome, CI: '' },
    });

    expect(() => JSON.parse(result.stdout)).not.toThrow();
    expect(await tipSeenFlag(configHome)).toBeUndefined();
  });
});
