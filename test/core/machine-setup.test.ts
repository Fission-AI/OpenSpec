import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  detectMachineAgents,
  formatMachineRevert,
  formatMachineSetup,
  refreshMachineSetup,
  revertMachineSetup,
  setupMachine,
} from '../../src/core/machine-setup.js';
import { getGlobalConfig, saveGlobalConfig } from '../../src/core/global-config.js';
import { SKILL_NAMESPACE as NS } from '../../src/core/shared/openspec-skill.js';
import { UpdateCommand } from '../../src/core/update.js';

describe('machine setup', () => {
  let root: string;
  let home: string;
  let env: NodeJS.ProcessEnv;
  const keys = ['XDG_CONFIG_HOME', 'XDG_DATA_HOME', 'HOME', 'USERPROFILE', 'CLAUDE_CONFIG_DIR'] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  const runClaude = vi.fn((_args: string[]) => ({ ok: true, output: '' }));

  function read(...segments: string[]): string {
    return fs.readFileSync(path.join(...segments), 'utf8');
  }

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-machine-'));
    home = path.join(root, 'home');
    fs.mkdirSync(home);
    // Everything OpenSpec and the agents read lives under the temp root.
    process.env.XDG_CONFIG_HOME = path.join(root, 'config');
    process.env.XDG_DATA_HOME = path.join(root, 'data');
    // Windows reads the home folder from USERPROFILE, so sandbox both.
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    delete process.env.CLAUDE_CONFIG_DIR;
    env = { ...process.env };
    runClaude.mockClear();
  });

  afterEach(() => {
    // Assign key by key: replacing process.env detaches it from the real
    // environment, and os.homedir() would then ignore HOME.
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  /** A skill folder as an older OpenSpec (or someone else) would have left it. */
  function writeSkill(dir: string, name: string, body: string): void {
    fs.mkdirSync(path.join(dir, name), { recursive: true });
    fs.writeFileSync(path.join(dir, name, 'SKILL.md'), body);
  }
  const OLD = (name: string) => `---\nname: ${name}\nmetadata:\n  generatedBy: "1.14.0"\n---\nold ${name}\n`;

  it('finds no agents on a bare machine and installs nothing', async () => {
    expect(detectMachineAgents({ homedir: home, env })).toEqual([]);
    const result = await setupMachine({ homedir: home, env, runClaude });
    expect(result.claudePlugin).toBeUndefined();
    expect(result.sharedSkills).toBeUndefined();
    expect(runClaude).not.toHaveBeenCalled();
    expect(formatMachineSetup(result)).toContain('No coding agents found');
  });

  it('detects agents from the folders they create, honoring CLAUDE_CONFIG_DIR', () => {
    fs.mkdirSync(path.join(home, '.codex'));
    fs.mkdirSync(path.join(root, 'claude-config'));
    const agents = detectMachineAgents({ homedir: home, env: { ...env, CLAUDE_CONFIG_DIR: path.join(root, 'claude-config') } });
    expect(agents.map((agent) => [agent.id, agent.route])).toEqual([
      ['claude', 'claude-plugin'],
      ['codex', 'shared-skills'],
    ]);
  });

  it('installs a Claude Code plugin with the router and one skill per workflow, and registers it', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    const result = await setupMachine({ homedir: home, env, runClaude });

    const dir = path.join(root, 'data', 'openspec', 'claude-plugin');
    expect(result.claudePlugin).toMatchObject({ dir, registered: true });
    expect(JSON.parse(read(dir, '.claude-plugin', 'plugin.json')).name).toBe(NS);
    expect(JSON.parse(read(dir, '.claude-plugin', 'marketplace.json')).plugins[0]).toMatchObject({
      name: NS,
      source: './',
    });

    // Skills only, no separate commands: `/openspec-beta:propose` is the propose skill.
    expect(fs.existsSync(path.join(dir, 'commands'))).toBe(false);
    expect(fs.readdirSync(path.join(dir, 'skills')).sort()).toEqual([NS, ...result.workflows].sort());
    expect(read(dir, 'skills', NS, 'SKILL.md')).toContain(`| \`references/propose.md\` | \`/${NS}:propose\` |`);
    const propose = read(dir, 'skills', 'propose', 'SKILL.md');
    expect(propose).toMatch(/^name: propose$/m);
    expect(propose).toContain(`\`../${NS}/references/propose.md\``);
    for (const id of result.workflows) {
      const steps = read(dir, 'skills', NS, 'references', `${id}.md`);
      expect(steps, id).not.toContain('/opsx:');
      expect(steps, id).not.toContain(`/${NS}-`);
      expect(steps, id).not.toContain('**Before you start**\n');
    }
    expect(read(dir, 'skills', NS, 'references', 'propose.md')).toContain(`/${NS}:apply`);

    expect(runClaude.mock.calls.map(([args]) => args)).toEqual([
      ['plugin', 'marketplace', 'add', dir],
      ['plugin', 'install', `${NS}@${NS}-local`],
    ]);
    expect(getGlobalConfig().machineSetup).toMatchObject({ claudePlugin: true, sharedSkills: false });
  });

  it('keeps the plugin files and prints the manual commands when registration fails', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    const failing = vi.fn(() => ({ ok: false, output: 'spawn claude ENOENT' }));
    const result = await setupMachine({ homedir: home, env, runClaude: failing });

    expect(result.claudePlugin).toMatchObject({ registered: false, error: 'spawn claude ENOENT' });
    expect(fs.existsSync(path.join(result.claudePlugin!.dir, 'skills', NS, 'SKILL.md'))).toBe(true);
    const text = formatMachineSetup(result);
    expect(text).toContain(`claude plugin marketplace add ${result.claudePlugin!.dir}`);
    expect(text).toContain(`claude plugin install ${NS}@${NS}-local`);
    expect(failing).toHaveBeenCalledTimes(1);
  });

  it('installs the router and one skill per workflow in ~/.agents/skills, spelled for Codex', async () => {
    fs.mkdirSync(path.join(home, '.codex'));
    const result = await setupMachine({ homedir: home, env, runClaude });

    const dir = path.join(home, '.agents', 'skills');
    expect(result.sharedSkills?.installed.sort()).toEqual([NS, ...result.workflows.map((id) => `${NS}-${id}`)].sort());
    expect(read(dir, NS, 'SKILL.md')).toMatch(new RegExp(`^name: ${NS}$`, 'm'));
    expect(read(dir, `${NS}-propose`, 'SKILL.md')).toMatch(new RegExp(`^name: ${NS}-propose$`, 'm'));
    // A planning workflow skill states the plan-only boundary where it is invoked.
    expect(read(dir, `${NS}-propose`, 'SKILL.md')).toContain('This workflow plans only');
    expect(read(dir, `${NS}-apply`, 'SKILL.md')).not.toContain('This workflow plans only');
    const steps = read(dir, NS, 'references', 'propose.md');
    expect(steps).toContain(`/${NS}-apply ($${NS}-apply in Codex)`);
    expect(steps).not.toContain('/opsx:');
    expect(runClaude).not.toHaveBeenCalled();
  });

  it('moves the skills an older OpenSpec wrote into a backup, and leaves everyone else\'s alone', async () => {
    fs.mkdirSync(path.join(home, '.gemini'));
    const dir = path.join(home, '.agents', 'skills');
    writeSkill(dir, 'openspec-onboard', OLD('openspec-onboard'));
    writeSkill(dir, 'openspec-propose', OLD('openspec-propose'));
    writeSkill(dir, 'openspec-mine', '---\nname: openspec-mine\n---\nhand-written\n');
    writeSkill(dir, 'other-tool', '---\nname: other-tool\n  generatedBy: "x"\n---\n');

    const result = await setupMachine({ homedir: home, env, runClaude, migrate: true });

    expect(result.moved.map(({ from }) => path.basename(from)).sort()).toEqual(['openspec-onboard', 'openspec-propose']);
    const propose = result.moved.find(({ from }) => from.endsWith('openspec-propose'))!;
    expect(read(propose.to, 'SKILL.md')).toBe(OLD('openspec-propose'));
    expect(fs.existsSync(path.join(dir, 'openspec-propose'))).toBe(false);
    expect(read(dir, `${NS}-propose`, 'SKILL.md')).toContain(`../${NS}/references/propose.md`);
    expect(fs.existsSync(path.join(dir, 'openspec-onboard'))).toBe(false);
    expect(read(dir, 'openspec-mine', 'SKILL.md')).toContain('hand-written');
    expect(fs.existsSync(path.join(dir, 'other-tool', 'SKILL.md'))).toBe(true);
    expect(getGlobalConfig().machineSetup?.backups).toEqual([result.backupDir]);
    expect(formatMachineSetup(result)).toContain('openspec setup --revert');

    // A second run leaves the new layout alone: it has the layout marker.
    const again = await setupMachine({ homedir: home, env, runClaude, migrate: true });
    expect(again.moved).toEqual([]);
    expect(getGlobalConfig().machineSetup?.backups).toEqual([result.backupDir]);
  });

  it('moves a project\'s older skills and /opsx command files when run inside it', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    const project = path.join(root, 'project');
    writeSkill(path.join(project, '.claude', 'skills'), 'openspec-apply-change', OLD('openspec-apply-change'));
    const command = path.join(project, '.claude', 'commands', 'opsx', 'propose.md');
    fs.mkdirSync(path.dirname(command), { recursive: true });
    fs.writeFileSync(command, 'old command');

    const result = await setupMachine({ homedir: home, env, runClaude, migrate: true, projectPath: project });

    expect(result.moved.map(({ from }) => from).sort()).toEqual(
      [command, path.join(project, '.claude', 'skills', 'openspec-apply-change')].sort()
    );
    expect(fs.existsSync(command)).toBe(false);
    expect(fs.existsSync(path.join(project, '.claude', 'skills', 'openspec-apply-change'))).toBe(false);

    await revertMachineSetup({ homedir: home, env, runClaude });
    expect(fs.readFileSync(command, 'utf8')).toBe('old command');
    expect(read(project, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md')).toBe(OLD('openspec-apply-change'));
  });

  it('backs up a copy npx installed under the same names, so revert brings it back', async () => {
    fs.mkdirSync(path.join(home, '.codex'));
    const dir = path.join(home, '.agents', 'skills');
    // npx skills add strips generatedBy; the layout marker stays.
    const npxCopy = `---\nname: ${NS}-propose\nmetadata:\n  layout: "router"\n---\nfrom npx\n`;
    writeSkill(dir, `${NS}-propose`, npxCopy);

    const result = await setupMachine({ homedir: home, env, runClaude, migrate: true });
    expect(result.moved.map(({ from }) => from)).toEqual([path.join(dir, `${NS}-propose`)]);
    expect(read(dir, `${NS}-propose`, 'SKILL.md')).toContain(`../${NS}/references/propose.md`);

    await revertMachineSetup({ homedir: home, env, runClaude });
    expect(read(dir, `${NS}-propose`, 'SKILL.md')).toBe(npxCopy);
    expect(fs.readdirSync(dir)).toEqual([`${NS}-propose`]);
  });

  it('can revert a setup that failed after the backup', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    const dir = path.join(home, '.agents', 'skills');
    writeSkill(dir, 'openspec-propose', OLD('openspec-propose'));
    // A file where the plugin folder goes makes the install fail after the backup.
    const pluginDir = path.join(root, 'data', 'openspec', 'claude-plugin');
    fs.mkdirSync(path.dirname(pluginDir), { recursive: true });
    fs.writeFileSync(pluginDir, 'in the way');

    await expect(setupMachine({ homedir: home, env, runClaude, migrate: true })).rejects.toThrow();
    expect(fs.existsSync(path.join(dir, 'openspec-propose'))).toBe(false);
    expect(getGlobalConfig().machineSetup?.backups).toHaveLength(1);

    fs.rmSync(pluginDir);
    await revertMachineSetup({ homedir: home, env, runClaude });
    expect(read(dir, 'openspec-propose', 'SKILL.md')).toBe(OLD('openspec-propose'));
  });

  it('moves across disks by copying when a rename cannot', async () => {
    fs.mkdirSync(path.join(home, '.codex'));
    const dir = path.join(home, '.agents', 'skills');
    writeSkill(dir, 'openspec-propose', OLD('openspec-propose'));
    const rename = vi.spyOn(fs.promises, 'rename').mockRejectedValue(Object.assign(new Error('cross-device'), { code: 'EXDEV' }));
    try {
      const result = await setupMachine({ homedir: home, env, runClaude, migrate: true });
      expect(read(result.moved[0].to, 'SKILL.md')).toBe(OLD('openspec-propose'));
      await revertMachineSetup({ homedir: home, env, runClaude });
    } finally {
      rename.mockRestore();
    }
    expect(read(dir, 'openspec-propose', 'SKILL.md')).toBe(OLD('openspec-propose'));
  });

  it('upgrades one beta to the next in place: newer files, turned-off workflows gone, nothing moved', async () => {
    fs.mkdirSync(path.join(home, '.codex'));
    saveGlobalConfig({ ...getGlobalConfig(), profile: 'custom', workflows: ['propose', 'apply', 'onboard'] });
    await setupMachine({ homedir: home, env, runClaude, migrate: true });
    const dir = path.join(home, '.agents', 'skills');
    expect(fs.existsSync(path.join(dir, `${NS}-onboard`))).toBe(true);
    // As an older beta left it.
    const propose = path.join(dir, `${NS}-propose`, 'SKILL.md');
    fs.writeFileSync(propose, read(propose).replace(/generatedBy: ".*"/, 'generatedBy: "0.0.1-beta.1"'));

    saveGlobalConfig({ ...getGlobalConfig(), profile: 'custom', workflows: ['propose', 'apply'] });
    const upgraded = await setupMachine({ homedir: home, env, runClaude, migrate: true });

    expect(upgraded.moved).toEqual([]);
    expect(upgraded.sharedSkills?.removed).toEqual([`${NS}-onboard`]);
    expect(read(propose)).not.toContain('0.0.1-beta.1');
    expect(fs.readdirSync(dir).sort()).toEqual([NS, `${NS}-apply`, `${NS}-propose`].sort());
  });

  it('moves skills from an earlier namespace and unregisters its plugin, so a rename is clean', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    fs.mkdirSync(path.join(home, '.codex'));
    const dir = path.join(home, '.agents', 'skills');
    const earlier = (name: string) =>
      `---\nname: ${name}\nmetadata:\n  layout: "router"\n  generatedBy: "0.0.1"\n---\nearlier\n`;
    writeSkill(dir, 'openspec-alpha', earlier('openspec-alpha'));
    writeSkill(dir, 'openspec-alpha-propose', earlier('openspec-alpha-propose'));
    saveGlobalConfig({
      ...getGlobalConfig(),
      machineSetup: { version: '0.0.1', claudePlugin: true, pluginName: 'openspec-alpha', sharedSkills: true },
    });

    const result = await setupMachine({ homedir: home, env, runClaude, migrate: true });

    expect(result.moved.map(({ from }) => path.basename(from)).sort()).toEqual(['openspec-alpha', 'openspec-alpha-propose']);
    expect(runClaude.mock.calls.map(([args]) => args).slice(0, 2)).toEqual([
      ['plugin', 'uninstall', 'openspec-alpha@openspec-alpha-local'],
      ['plugin', 'marketplace', 'remove', 'openspec-alpha-local'],
    ]);
    expect(getGlobalConfig().machineSetup?.pluginName).toBe(NS);
  });

  it('does not migrate on a refresh', async () => {
    fs.mkdirSync(path.join(home, '.codex'));
    await setupMachine({ homedir: home, env, runClaude, migrate: true });
    writeSkill(path.join(home, '.agents', 'skills'), 'openspec-legacy', OLD('openspec-legacy'));
    const refreshed = await refreshMachineSetup({ homedir: home, env, runClaude });
    expect(refreshed?.moved).toEqual([]);
    expect(fs.existsSync(path.join(home, '.agents', 'skills', 'openspec-legacy'))).toBe(true);
  });

  it('reverts: unregisters the plugin, removes what it wrote, and restores the backup', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    fs.mkdirSync(path.join(home, '.codex'));
    const dir = path.join(home, '.agents', 'skills');
    writeSkill(dir, 'openspec-propose', OLD('openspec-propose'));
    writeSkill(dir, 'openspec-mine', '---\nname: openspec-mine\n---\nhand-written\n');
    const setup = await setupMachine({ homedir: home, env, runClaude, migrate: true });
    runClaude.mockClear();

    const reverted = await revertMachineSetup({ homedir: home, env, runClaude });

    expect(runClaude.mock.calls.map(([args]) => args)).toEqual([
      ['plugin', 'uninstall', `${NS}@${NS}-local`],
      ['plugin', 'marketplace', 'remove', `${NS}-local`],
    ]);
    expect(reverted).toMatchObject({ pluginRemoved: true, restored: [path.join(dir, 'openspec-propose')], skipped: [] });
    expect(fs.existsSync(setup.claudePlugin!.dir)).toBe(false);
    expect(fs.readdirSync(dir).sort()).toEqual(['openspec-mine', 'openspec-propose']);
    expect(read(dir, 'openspec-propose', 'SKILL.md')).toBe(OLD('openspec-propose'));
    expect(fs.existsSync(setup.backupDir!)).toBe(false);
    expect(getGlobalConfig().machineSetup).toBeUndefined();
    expect(formatMachineRevert(reverted)).toContain('Restored');

    expect(await revertMachineSetup({ homedir: home, env, runClaude })).toBeNull();
    expect(formatMachineRevert(null)).toContain('nothing to revert');
  });

  it('writes nothing on a dry run', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    fs.mkdirSync(path.join(home, '.codex'));
    const result = await setupMachine({ homedir: home, env, runClaude, dryRun: true });

    expect(result.workflows).toContain('propose');
    expect(result.claudePlugin).toBeDefined();
    expect(result.sharedSkills).toBeDefined();
    expect(fs.existsSync(path.join(root, 'data'))).toBe(false);
    expect(fs.existsSync(path.join(home, '.agents'))).toBe(false);
    expect(getGlobalConfig().machineSetup).toBeUndefined();
    expect(runClaude).not.toHaveBeenCalled();
    expect(formatMachineSetup(result, { dryRun: true })).toContain('Run `openspec setup` to install.');
  });

  it('refreshes only after setup, rewriting files without registering again', async () => {
    fs.mkdirSync(path.join(home, '.claude'));
    expect(await refreshMachineSetup({ homedir: home, env })).toBeNull();

    const first = await setupMachine({ homedir: home, env, runClaude });
    const skillFile = path.join(first.claudePlugin!.dir, 'skills', NS, 'SKILL.md');
    fs.writeFileSync(skillFile, 'stale');
    runClaude.mockClear();

    const refreshed = await refreshMachineSetup({ homedir: home, env, runClaude });
    expect(refreshed?.claudePlugin?.registered).toBe(true);
    expect(read(skillFile)).toMatch(new RegExp(`^name: ${NS}$`, 'm'));
    expect(runClaude).not.toHaveBeenCalled();
  });

  it('lets `openspec update` refresh the machine install outside any OpenSpec project', async () => {
    fs.mkdirSync(path.join(home, '.codex'));
    await setupMachine({ homedir: home, env, runClaude });
    const skillFile = path.join(home, '.agents', 'skills', NS, 'SKILL.md');
    fs.writeFileSync(skillFile, 'stale');
    const project = path.join(root, 'not-openspec');
    fs.mkdirSync(project);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      await new UpdateCommand().execute(project);
    } finally {
      log.mockRestore();
    }
    expect(read(skillFile)).toMatch(new RegExp(`^name: ${NS}$`, 'm'));
  });
});
