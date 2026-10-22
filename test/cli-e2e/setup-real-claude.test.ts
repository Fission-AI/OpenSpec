import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SKILL_NAMESPACE as NS } from '../../src/core/shared/openspec-skill.js';
import { ensureCliBuilt, runCLI } from '../helpers/run-cli.js';

/**
 * `openspec setup` and `--revert` against the real Claude Code CLI, in a
 * throwaway home and Claude config, plus discovery checks with the real Codex
 * and Gemini CLIs when they are on PATH. Opt-in (OPENSPEC_REAL_CLAUDE=1): CI
 * installs pinned versions and runs it on macOS, Linux, and Windows. None of
 * these checks needs a login.
 */
const enabled = process.env.OPENSPEC_REAL_CLAUDE === '1';

describe.skipIf(!enabled)('openspec setup with the real Claude Code CLI', () => {
  let root: string;
  let env: NodeJS.ProcessEnv;
  const plugin = `${NS}@${NS}-local`;

  const tool = (command: string, args: string[]) => {
    const result = spawnSync(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      shell: process.platform === 'win32',
      timeout: 120_000,
    });
    return { code: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  };
  const claude = (args: string[]) => tool('claude', args);
  const onPath = (command: string) => tool(command, ['--version']).code === 0;
  /** The openspec-beta skills an agent reports, or null when it is not installed. */
  const agentSees = (): Record<string, number | null> => ({
    codex: onPath('codex') ? (tool('codex', ['debug', 'prompt-input', 'hello']).out.match(new RegExp(`${NS}-propose`, 'g')) ?? []).length : null,
    gemini: onPath('gemini') ? (tool('gemini', ['skills', 'list']).out.match(new RegExp(`${NS}-propose`, 'g')) ?? []).length : null,
  });
  const installed = () => {
    const list = claude(['plugin', 'list', '--json']);
    expect(list.code, list.out).toBe(0);
    return (JSON.parse(list.out.slice(list.out.indexOf('['))) as Array<{ id: string; enabled: boolean }>).filter(
      (entry) => entry.id === plugin
    );
  };

  beforeAll(async () => {
    await ensureCliBuilt();
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-real-claude-')));
    const home = path.join(root, 'home dir');
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    env = {
      HOME: home,
      USERPROFILE: home,
      XDG_CONFIG_HOME: path.join(root, 'config'),
      XDG_DATA_HOME: path.join(root, 'data dir'),
      CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
      CODEX_HOME: path.join(home, '.codex'),
      OPENSPEC_TELEMETRY: '0',
    };
  }, 120_000);

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  // CI names the agents it installed, so a failed install fails here instead of skipping.
  it('has every required agent CLI on PATH', () => {
    for (const agent of (process.env.OPENSPEC_REQUIRE_AGENTS ?? '').split(',').filter(Boolean)) {
      expect(onPath(agent), `${agent} on PATH`).toBe(true);
    }
  });

  it('registers the plugin, and Claude Code loads its skills', async () => {
    const setup = await runCLI(['setup'], { cwd: root, env, timeoutMs: 180_000 });
    expect(setup.exitCode, setup.stdout + setup.stderr).toBe(0);
    expect(installed()).toEqual([expect.objectContaining({ id: plugin, enabled: true })]);

    const details = claude(['plugin', 'details', plugin]);
    expect(details.code, details.out).toBe(0);
    for (const skill of [NS, 'propose', 'explore', 'apply', 'archive']) {
      expect(details.out, skill).toMatch(new RegExp(`\\b${skill}\\b`));
    }

    // Codex and Gemini CLI read ~/.agents/skills.
    for (const [agent, seen] of Object.entries(agentSees())) {
      if (seen !== null) expect(seen, `${agent} lists ${NS}-propose`).toBeGreaterThan(0);
    }
  }, 240_000);

  it('reverts: the plugin is gone from Claude Code and from disk', async () => {
    const revert = await runCLI(['setup', '--revert'], { cwd: root, env, timeoutMs: 180_000 });
    expect(revert.exitCode, revert.stdout + revert.stderr).toBe(0);
    expect(installed()).toEqual([]);
    expect(fs.existsSync(path.join(root, 'data dir', 'openspec', 'claude-plugin'))).toBe(false);
    expect(fs.existsSync(path.join(env.HOME!, '.agents', 'skills', NS))).toBe(false);
    for (const [agent, seen] of Object.entries(agentSees())) {
      if (seen !== null) expect(seen, `${agent} still lists ${NS}-propose`).toBe(0);
    }
  }, 240_000);
});
