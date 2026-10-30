import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { SKILL_NAMESPACE as NS } from '../../src/core/shared/openspec-skill.js';
import { withPrependedPathEnv } from '../helpers/path-env.js';
import { ensureCliBuilt, runCLI } from '../helpers/run-cli.js';

/**
 * The whole beta journey through the built CLI, on whatever OS runs it (CI
 * covers macOS, Linux, and Windows): set up over an existing install, run
 * setup and update again, revert, and end byte-for-byte where it started.
 * A fake `claude` records every call; the paths contain spaces so Windows
 * argument quoting is exercised.
 */

/** Relpath → content for files, `-> target` for symlinks, '' for folders. */
function snapshot(root: string): Map<string, string> {
  const result = new Map<string, string>();
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const key = path.relative(root, full).split(path.sep).join('/');
      if (entry.isSymbolicLink()) result.set(key, `-> ${fs.readlinkSync(full)}`);
      else if (entry.isDirectory()) {
        result.set(`${key}/`, '');
        walk(full);
      } else result.set(key, fs.readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  return result;
}

function writeSkill(dir: string, name: string, body: string): void {
  fs.mkdirSync(path.join(dir, name), { recursive: true });
  fs.writeFileSync(path.join(dir, name, 'SKILL.md'), body);
}

describe('openspec setup and --revert, end to end', () => {
  let root: string;
  let home: string;
  let project: string;
  let pluginDir: string;
  let log: string;
  let env: NodeJS.ProcessEnv;
  let before: { home: Map<string, string>; project: Map<string, string> };

  const claudeCalls = (): string[][] =>
    fs.existsSync(log)
      ? fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line))
      : [];

  beforeAll(async () => {
    await ensureCliBuilt();
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-setup-journey-')));
    home = path.join(root, 'home dir');
    project = path.join(root, 'project');
    const dataHome = path.join(root, 'data dir');
    pluginDir = path.join(dataHome, 'openspec', 'claude-plugin');
    fs.mkdirSync(path.join(home, '.claude'), { recursive: true });
    fs.mkdirSync(path.join(home, '.codex'), { recursive: true });
    fs.mkdirSync(project);

    // A fake `claude` that appends its arguments to a log, for POSIX and Windows.
    const bin = path.join(root, 'bin');
    log = path.join(root, 'claude-calls.jsonl');
    fs.mkdirSync(bin);
    const recorder = path.join(bin, 'record.cjs');
    fs.writeFileSync(
      recorder,
      `require('node:fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');\n`
    );
    fs.writeFileSync(path.join(bin, 'claude'), `#!/bin/sh\nexec node ${JSON.stringify(recorder)} "$@"\n`);
    fs.chmodSync(path.join(bin, 'claude'), 0o755);
    fs.writeFileSync(path.join(bin, 'claude.cmd'), `@echo off\r\nnode "${recorder}" %*\r\n`);

    // A custom profile, so the install follows the user's workflows.
    const configHome = path.join(root, 'config');
    fs.mkdirSync(path.join(configHome, 'openspec'), { recursive: true });
    fs.writeFileSync(
      path.join(configHome, 'openspec', 'config.json'),
      JSON.stringify({ profile: 'custom', delivery: 'both', workflows: ['propose', 'explore', 'apply', 'onboard'], telemetry: { noticeSeen: true } })
    );

    env = withPrependedPathEnv(
      {
        HOME: home,
        USERPROFILE: home,
        XDG_CONFIG_HOME: configHome,
        XDG_DATA_HOME: dataHome,
        CLAUDE_CONFIG_DIR: path.join(home, '.claude'),
        OPENSPEC_TELEMETRY: '0',
      },
      bin
    );

    // Today's install: per-project skills and /opsx commands from the old layout.
    const init = await runCLI(['init', '--tools', 'claude,codex'], { cwd: project, env, timeoutMs: 60_000 });
    expect(init.exitCode, init.stderr).toBe(0);
    // ...one of them edited by the user,
    const edited = path.join(project, '.claude', 'skills', 'openspec-propose', 'SKILL.md');
    fs.appendFileSync(edited, '\n<!-- my own notes -->\n');
    // ...an old machine-level OpenSpec skill, a skill of the user's own,
    const agents = path.join(home, '.agents', 'skills');
    writeSkill(agents, 'openspec-explore', '---\nname: openspec-explore\nmetadata:\n  generatedBy: "1.14.0"\n---\nold\n');
    writeSkill(agents, 'openspec-mine', '---\nname: openspec-mine\n---\nmine\n');
    // ...and a copy `npx skills add` installed under the new names, with its symlink.
    writeSkill(agents, `${NS}-apply`, `---\nname: ${NS}-apply\nmetadata:\n  layout: "router"\n---\nfrom npx\n`);
    if (process.platform !== 'win32') {
      fs.mkdirSync(path.join(home, '.claude', 'skills'), { recursive: true });
      fs.symlinkSync(`../../.agents/skills/${NS}-apply`, path.join(home, '.claude', 'skills', `${NS}-apply`));
    }

    before = { home: snapshot(home), project: snapshot(project) };
  }, 120_000);

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('installs the beta skills and moves everything in their way', async () => {
    const setup = await runCLI(['setup'], { cwd: project, env, timeoutMs: 60_000 });
    expect(setup.exitCode, setup.stderr + setup.stdout).toBe(0);
    expect(setup.stdout).toContain('Undo all of this with `openspec setup --revert`.');

    // Claude Code: the plugin is written and registered, with the spaced path intact.
    expect(claudeCalls()).toEqual([
      ['plugin', 'marketplace', 'add', pluginDir],
      ['plugin', 'install', `${NS}@${NS}-local`],
    ]);
    expect(fs.existsSync(path.join(pluginDir, 'skills', NS, 'SKILL.md'))).toBe(true);

    // ~/.agents/skills: the router and one skill per workflow of the custom profile.
    const agents = path.join(home, '.agents', 'skills');
    for (const name of [NS, `${NS}-propose`, `${NS}-explore`, `${NS}-apply`, `${NS}-onboard`]) {
      expect(fs.readFileSync(path.join(agents, name, 'SKILL.md'), 'utf8'), name).toContain('layout: "router"');
    }
    expect(fs.existsSync(path.join(agents, 'openspec-explore'))).toBe(false);
    expect(fs.readFileSync(path.join(agents, 'openspec-mine', 'SKILL.md'), 'utf8')).toContain('mine');

    // The project's old skills and /opsx commands are out of the way.
    for (const dir of ['.claude/skills', '.agents/skills', '.claude/commands/opsx']) {
      const full = path.join(project, dir);
      const left = fs.existsSync(full) ? fs.readdirSync(full).filter((name) => /^(openspec|propose|explore|apply)/.test(name)) : [];
      expect(left, dir).toEqual([]);
    }
  }, 120_000);

  it('moves nothing on a second run and lets update refresh without bringing old skills back', async () => {
    const again = await runCLI(['setup'], { cwd: project, env, timeoutMs: 60_000 });
    expect(again.exitCode, again.stderr).toBe(0);
    expect(again.stdout).not.toContain('older OpenSpec files');

    const update = await runCLI(['update'], { cwd: project, env, timeoutMs: 60_000 });
    expect(update.stdout + update.stderr).toContain('Updated machine skills');
    expect(fs.existsSync(path.join(project, '.claude', 'skills', 'openspec-propose'))).toBe(false);
  }, 120_000);

  it('reverts to exactly where it started', async () => {
    const calls = claudeCalls().length;
    const revert = await runCLI(['setup', '--revert'], { cwd: project, env, timeoutMs: 60_000 });
    expect(revert.exitCode, revert.stderr + revert.stdout).toBe(0);

    expect(claudeCalls().slice(calls)).toEqual([
      ['plugin', 'uninstall', `${NS}@${NS}-local`],
      ['plugin', 'marketplace', 'remove', `${NS}-local`],
    ]);
    expect(fs.existsSync(pluginDir)).toBe(false);
    const differences = (now: Map<string, string>, then: Map<string, string>) =>
      [...new Set([...now.keys(), ...then.keys()])].filter((key) => now.get(key) !== then.get(key)).sort();
    expect(differences(snapshot(home), before.home), 'home').toEqual([]);
    expect(differences(snapshot(project), before.project), 'project').toEqual([]);

    const config = JSON.parse(fs.readFileSync(path.join(root, 'config', 'openspec', 'config.json'), 'utf8'));
    expect(config.machineSetup).toBeUndefined();
  }, 120_000);
});
