import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SKILL_NAMESPACE as NS } from '../../src/core/shared/openspec-skill.js';

/**
 * `npx skills add` of this checkout's skills/ mirror, the way a user installs
 * the beta skills without `openspec setup`, then the documented removal. Runs
 * with the real-CLI job (OPENSPEC_REAL_CLAUDE=1) on macOS, Linux, and Windows,
 * and checks Codex and Gemini CLI list the skills when they are on PATH.
 */
const enabled = process.env.OPENSPEC_REAL_CLAUDE === '1';
const SKILLS_CLI = 'skills@1.7.4';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe.skipIf(!enabled)('npx skills add with the real skills CLI', () => {
  let root: string;
  let env: NodeJS.ProcessEnv;
  const names = fs.readdirSync(path.join(repoRoot, 'skills')).filter((name) => name.startsWith(NS));

  const tool = (command: string, args: string[]) => {
    const result = spawnSync(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      encoding: 'utf8',
      shell: process.platform === 'win32',
      timeout: 240_000,
    });
    return { code: result.status, out: `${result.stdout ?? ''}${result.stderr ?? ''}` };
  };
  const onPath = (command: string) => tool(command, ['--version']).code === 0;
  const listed = (): Record<string, number | null> => ({
    codex: onPath('codex') ? (tool('codex', ['debug', 'prompt-input', 'hello']).out.match(new RegExp(`${NS}-propose`, 'g')) ?? []).length : null,
    gemini: onPath('gemini') ? (tool('gemini', ['skills', 'list']).out.match(new RegExp(`${NS}-propose`, 'g')) ?? []).length : null,
  });

  beforeAll(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-npx-skills-')));
    // Codex on Windows finds the home folder through the OS profile, not
    // USERPROFILE; on a throwaway CI runner, use the real home there.
    const realHome = process.env.CI === 'true' && process.platform === 'win32';
    const home = realHome ? os.homedir() : path.join(root, 'home dir');
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    env = { HOME: home, USERPROFILE: home, CODEX_HOME: path.join(home, '.codex'), DISABLE_TELEMETRY: '1' };
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('installs the router and every skill where the agents read them', () => {
    expect(names).toContain(NS);
    const add = tool('npx', ['-y', SKILLS_CLI, 'add', repoRoot, '-g', '-a', 'claude-code', 'codex', 'gemini-cli', '-y']);
    expect(add.code, add.out).toBe(0);
    for (const dir of [path.join(env.HOME!, '.agents', 'skills'), path.join(env.HOME!, '.claude', 'skills')]) {
      for (const name of names) expect(fs.existsSync(path.join(dir, name, 'SKILL.md')), `${dir} ${name}`).toBe(true);
      // Each skill points at the router by a relative path; it must resolve where it is installed.
      expect(fs.existsSync(path.join(dir, `${NS}-propose`, '..', NS, 'references', 'propose.md')), dir).toBe(true);
    }
    for (const [agent, seen] of Object.entries(listed())) {
      if (seen !== null) expect(seen, `${agent} lists ${NS}-propose`).toBeGreaterThan(0);
    }
  }, 600_000);

  it('removes every skill with the documented command', () => {
    const remove = tool('npx', ['-y', SKILLS_CLI, 'remove', '-g', '-y', ...names]);
    expect(remove.code, remove.out).toBe(0);
    for (const dir of [path.join(env.HOME!, '.agents', 'skills'), path.join(env.HOME!, '.claude', 'skills')]) {
      for (const name of names) expect(fs.existsSync(path.join(dir, name)), `${dir} ${name}`).toBe(false);
    }
    for (const [agent, seen] of Object.entries(listed())) {
      if (seen !== null) expect(seen, `${agent} still lists ${NS}-propose`).toBe(0);
    }
  }, 600_000);
});
