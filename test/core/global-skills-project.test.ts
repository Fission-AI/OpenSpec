import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { runGlobalSkills } from '../../src/core/global-skills.js';

const prompt = vi.hoisted(() => ({ interactive: false, answer: true, asked: 0 }));

vi.mock('../../src/utils/interactive.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/interactive.js')>();
  return { ...actual, isInteractive: () => prompt.interactive };
});

vi.mock('@inquirer/prompts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@inquirer/prompts')>();
  return {
    ...actual,
    confirm: async () => {
      prompt.asked += 1;
      return prompt.answer;
    },
  };
});

const CORE_SKILLS = [
  'openspec-propose',
  'openspec-explore',
  'openspec-apply-change',
  'openspec-update-change',
  'openspec-sync-specs',
  'openspec-archive-change',
];

/** Every file and link under a folder, as relative paths. */
async function tree(dir: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(current: string) {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const rel = path.relative(dir, full).split(path.sep).join('/');
      if (entry.isDirectory() && !entry.isSymbolicLink()) await walk(full);
      else out.push(rel);
    }
  }
  await walk(dir);
  return out.sort();
}

describe('a project using the machine-wide skills', () => {
  let root: string;
  let home: string;
  let project: string;
  let originalEnv: NodeJS.ProcessEnv;
  let logs: string[];

  beforeEach(async () => {
    originalEnv = { ...process.env };
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-global-project-')));
    home = path.join(root, 'home');
    project = path.join(root, 'project');
    await fs.mkdir(path.join(home, '.config', 'openspec'), { recursive: true });
    await fs.mkdir(project, { recursive: true });
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    process.env.XDG_CONFIG_HOME = path.join(home, '.config');
    process.env.CODEX_HOME = path.join(home, '.codex');
    delete process.env.CLAUDE_CONFIG_DIR;
    await fs.writeFile(path.join(home, '.config', 'openspec', 'config.json'), JSON.stringify({ profile: 'core' }));
    Object.assign(prompt, { interactive: false, answer: true, asked: 0 });
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
    await new InitCommand({ tools: 'claude,codex', animation: false }).execute(project);
    logs = [];
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  const p = (...segments: string[]) => path.join(project, ...segments);
  const exists = (target: string) => fs.lstat(target).then(() => true, () => false);
  const config = () => fs.readFile(p('openspec', 'config.yaml'), 'utf8');
  const projectSkills = async () => (await tree(p('.agents', 'skills'))).filter((f) => f.endsWith('SKILL.md'));
  const said = (text: string) => logs.some((line) => line.includes(text));

  it('changes nothing without a global install', async () => {
    const before = await tree(project);
    await new UpdateCommand().execute(project);
    expect(await tree(project)).toEqual(before);
    expect(said('installed globally')).toBe(false);
  });

  it("doesn't mistake a home folder set up as a project for a global install", async () => {
    await fs.mkdir(path.join(home, '.agents', 'skills', 'openspec-propose'), { recursive: true });
    await fs.writeFile(path.join(home, '.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'x\n');
    await fs.writeFile(path.join(home, '.agents', 'skills', '.openspec-target'), 'claude own-files\ncodex\n');
    Object.assign(prompt, { interactive: true });
    await new UpdateCommand().execute(project);
    expect(prompt.asked).toBe(0);
    expect(said('installed globally')).toBe(false);
  });

  it("doesn't repeat the warnings of a broken config.yaml", async () => {
    await fs.writeFile(p('openspec', 'config.yaml'), 'schema: [not, a, string]\n');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { readProjectSkillsMode } = await import('../../src/core/project-skills-mode.js');
    expect(readProjectSkillsMode(project)).toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
  });

  it('only suggests the switch when not at a terminal', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const before = await tree(project);
    await new UpdateCommand().execute(project);
    expect(await tree(project)).toEqual(before);
    expect(said('openspec update --use-global-skills')).toBe(true);
    expect(await config()).not.toMatch(/^skills:/m);
  });

  it('switches with --use-global-skills: removes OpenSpec copies, keeps an edited one, saves the choice', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await fs.appendFile(p('.agents', 'skills', 'openspec-explore', 'SKILL.md'), '\nTeam note.\n');
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(await projectSkills()).toEqual(['openspec-explore/SKILL.md']);
    for (const skill of CORE_SKILLS.filter((s) => s !== 'openspec-explore')) {
      expect(await exists(p('.claude', 'skills', skill))).toBe(false);
    }
    expect(said('Kept')).toBe(true);
    expect(await config()).toMatch(/^skills: global$/m);
    // The file's other content and comments survive.
    expect(await config()).toMatch(/^schema: spec-driven$/m);
    expect(await config()).toContain('# ');
    // The global install is untouched.
    expect(await exists(path.join(home, '.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
  });

  it('lists the switch in a dry run and writes nothing', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const before = await tree(project);
    const plan = await new UpdateCommand({ dryRun: true, useGlobalSkills: true }).plan(project);
    expect(plan.changes.map((c) => `${c.action} ${c.path}`)).toContain('delete .agents/skills/openspec-propose/SKILL.md');
    expect(plan.changes.map((c) => `${c.action} ${c.path}`)).toContain('update openspec/config.yaml');
    expect(await tree(project)).toEqual(before);
  });

  it('notes the choice in a plain dry run without making it', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const plan = await new UpdateCommand({ dryRun: true }).plan(project);
    expect(plan.notes.map((n) => n.code)).toContain('global-skills');
    expect(plan.changes).toEqual([]);
  });

  it('asks at a terminal; yes switches', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    Object.assign(prompt, { interactive: true, answer: true });
    await new UpdateCommand().execute(project);
    expect(prompt.asked).toBe(1);
    expect(await projectSkills()).toEqual([]);
    expect(await config()).toMatch(/^skills: global$/m);
  });

  it('asks at a terminal; no keeps the project skills and never asks again', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    Object.assign(prompt, { interactive: true, answer: false });
    await new UpdateCommand().execute(project);
    expect(await projectSkills()).toHaveLength(CORE_SKILLS.length);
    expect(await config()).toMatch(/^skills: project$/m);
    await new UpdateCommand().execute(project);
    expect(prompt.asked).toBe(1);
    // The flag still switches later.
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(await projectSkills()).toEqual([]);
    expect(await config()).toMatch(/^skills: global$/m);
  });

  it("doesn't offer when the global install misses one of the project's tools", async () => {
    await runGlobalSkills({ toolIds: ['codex'] });
    Object.assign(prompt, { interactive: true });
    await new UpdateCommand().execute(project);
    expect(prompt.asked).toBe(0);
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(said('Not switched')).toBe(true);
    expect(await projectSkills()).toHaveLength(CORE_SKILLS.length);
  });

  it('tells a teammate without a global install what to run, and writes nothing', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    // A teammate's machine: a fresh home folder.
    const teammate = path.join(root, 'teammate');
    await fs.mkdir(path.join(teammate, '.config', 'openspec'), { recursive: true });
    process.env.HOME = teammate;
    process.env.USERPROFILE = teammate;
    process.env.XDG_CONFIG_HOME = path.join(teammate, '.config');
    const before = await tree(project);
    logs = [];
    await new UpdateCommand().execute(project);
    expect(said('openspec init --global --tools claude,codex')).toBe(true);
    expect(await tree(project)).toEqual(before);
    expect(await tree(teammate)).toEqual([]);
    logs = [];
    await new InitCommand({ tools: 'claude', animation: false }).execute(project);
    expect(said('openspec init --global')).toBe(true);
    expect(await projectSkills()).toEqual([]);
    expect(await exists(p('.claude', 'skills', 'openspec-propose'))).toBe(false);
    expect(await tree(teammate)).toEqual([]);
  });

  it("doesn't switch when config.yaml can't be saved", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await fs.writeFile(p('openspec', 'config.yaml'), '- a\n- b\n');
    const before = await tree(project);
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(said('Not switched')).toBe(true);
    expect(await tree(project)).toEqual(before);
    const plan = await new UpdateCommand({ dryRun: true, useGlobalSkills: true }).plan(project);
    expect(plan.failures.map((f) => f.tool)).toContain('openspec');
  });

  it("records the project's tools in a form OpenSpec 2.0 doesn't read as tools", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(await fs.readFile(p('.agents', 'skills', '.openspec-target'), 'utf8')).toBe('global claude\nglobal codex\n');
    // 2.0 reads the first word of each line as a tool id.
    const { readSkillToolList } = await import('../../src/core/shared-skill-target.js');
    expect(readSkillToolList(project)).toEqual([]);
  });

  it("never switches through a .agents link out of the project", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const team = path.join(root, 'team');
    await fs.rename(p('.agents'), team);
    await fs.symlink(team, p('.agents'), process.platform === 'win32' ? 'junction' : 'dir');
    const before = await tree(team);
    // The rest of the update then fails for Claude Code, as 2.0 does here.
    await expect(new UpdateCommand({ useGlobalSkills: true }).execute(project)).rejects.toThrow(/Claude Code/);
    expect(said('Not switched')).toBe(true);
    expect(await tree(team)).toEqual(before);
    expect(await config()).not.toMatch(/^skills:/m);
  });

  it('never saves the choice through a config.yaml link', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const outside = path.join(root, 'team-config.yaml');
    await fs.rename(p('openspec', 'config.yaml'), outside);
    await fs.symlink(outside, p('openspec', 'config.yaml'));
    const text = await fs.readFile(outside, 'utf8');
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(await fs.readFile(outside, 'utf8')).toBe(text);
    expect(await projectSkills()).toHaveLength(CORE_SKILLS.length);
  });

  it("doesn't offer the switch when a tool can't use machine-wide skills", async () => {
    await new InitCommand({ tools: 'claude,codex,atomcode', animation: false }).execute(project);
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    Object.assign(prompt, { interactive: true });
    await new UpdateCommand().execute(project);
    expect(prompt.asked).toBe(0);
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(said("AtomCode can't use machine-wide skills")).toBe(true);
    expect(await projectSkills()).toHaveLength(CORE_SKILLS.length);
  });

  it('refuses to make a home folder holding the global install a project', async () => {
    await runGlobalSkills({ toolIds: ['codex'] });
    await fs.mkdir(path.join(home, 'openspec'), { recursive: true });
    await expect(new InitCommand({ tools: 'cursor', animation: false }).execute(home)).rejects.toThrow(/can't also be a project/);
  });

  it("refuses to update a project in the home folder that holds the global install", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    // A project made in the home folder some other way (an older release).
    await fs.mkdir(path.join(home, 'openspec'), { recursive: true });
    await fs.writeFile(path.join(home, 'openspec', 'config.yaml'), 'schema: spec-driven\n');
    const before = await tree(path.join(home, '.agents'));
    await expect(new UpdateCommand({ useGlobalSkills: true }).execute(home)).rejects.toThrow(/can't also be a project/);
    expect(await tree(path.join(home, '.agents'))).toEqual(before);
  });

  it('marks a --use-global-skills run that did not switch', async () => {
    await runGlobalSkills({ toolIds: ['codex'] });
    const command = new UpdateCommand({ useGlobalSkills: true });
    await command.execute(project);
    expect(command.globalSkillsFailed).toBe(true);
  });

  it('reports a switch that could not remove some links, and keeps the record', async () => {
    if (process.platform === 'win32') return;
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await fs.chmod(p('.claude', 'skills'), 0o555);
    const command = new UpdateCommand({ useGlobalSkills: true });
    try {
      await command.execute(project);
    } finally {
      await fs.chmod(p('.claude', 'skills'), 0o755);
    }
    expect(command.globalSkillsFailed).toBe(true);
    expect(said("Couldn't remove Claude Code's project copies")).toBe(true);
    expect(await fs.readFile(p('.agents', 'skills', '.openspec-target'), 'utf8')).toContain('global claude');
    // The next update finishes the job.
    await new UpdateCommand().execute(project);
    expect(await exists(p('.claude', 'skills', 'openspec-propose'))).toBe(false);
  });

  it("won't set up a tool that can't use machine-wide skills in a switched project", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    await expect(new InitCommand({ tools: 'easycode', animation: false }).execute(project)).rejects.toThrow(/can't use machine-wide skills/);
    expect(await fs.readFile(p('.agents', 'skills', '.openspec-target'), 'utf8')).not.toContain('easycode');
  });

  it("says plainly when a switched project's skills aren't installed on this machine", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    const teammate = path.join(root, 'teammate2');
    await fs.mkdir(path.join(teammate, '.config', 'openspec'), { recursive: true });
    process.env.HOME = teammate;
    process.env.USERPROFILE = teammate;
    process.env.XDG_CONFIG_HOME = path.join(teammate, '.config');
    logs = [];
    await new InitCommand({ tools: 'claude', animation: false }).execute(project);
    expect(said('Skills: not installed on this machine yet')).toBe(true);
    expect(said('Install the skills for this machine first')).toBe(true);
    expect(said('/openspec-propose')).toBe(false);
  });

  it('records a skill kept during the switch, so it is reported once and survives the way back', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await fs.appendFile(p('.agents', 'skills', 'openspec-explore', 'SKILL.md'), '\nTeam note.\n');
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(await fs.readFile(p('.agents', 'skills', '.openspec-target'), 'utf8')).toContain('keep openspec-explore');
    logs = [];
    await new UpdateCommand().execute(project);
    expect(said('Kept')).toBe(false);
    await fs.writeFile(p('openspec', 'config.yaml'), (await config()).replace(/^skills: global$/m, 'skills: project'));
    await new UpdateCommand().execute(project);
    expect(await fs.readFile(p('.agents', 'skills', 'openspec-explore', 'SKILL.md'), 'utf8')).toContain('Team note.');
  });

  it('writes no record for a skills: global project whose tools keep their own files', async () => {
    const solo = path.join(root, 'solo');
    await fs.mkdir(solo, { recursive: true });
    await new InitCommand({ tools: 'minimax-code', animation: false }).execute(solo);
    await fs.appendFile(path.join(solo, 'openspec', 'config.yaml'), 'skills: global\n');
    logs = [];
    await new UpdateCommand().execute(solo);
    expect(await exists(path.join(solo, '.agents', 'skills', '.openspec-target'))).toBe(false);
    expect(said("Skills come from this machine's global install")).toBe(false);
  });

  it('keeps the tool record when a --use-global-skills switch back to global is refused', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    await fs.writeFile(p('openspec', 'config.yaml'), (await config()).replace(/^skills: global$/m, 'skills: project'));
    // The global install goes away; switching again is refused.
    await runGlobalSkills({ toolIds: [] });
    logs = [];
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(said('Not switched')).toBe(true);
    expect(said('No configured tools found')).toBe(false);
    expect(await projectSkills()).toHaveLength(CORE_SKILLS.length);
  });

  it("keeps a switched project's Copilot cloud files when another tool keeps its own skills", async () => {
    const mixed = path.join(root, 'mixed');
    await fs.mkdir(mixed, { recursive: true });
    await new InitCommand({ tools: 'github-copilot,minimax-code', animation: false, copilotCloud: true }).execute(mixed);
    const cloud = (await tree(path.join(mixed, '.github'))).filter((f) => !f.startsWith('skills/'));
    expect(cloud.length).toBeGreaterThan(0);
    await runGlobalSkills({ toolIds: ['github-copilot'] });
    logs = [];
    await new UpdateCommand({ useGlobalSkills: true }).execute(mixed);
    await new UpdateCommand().execute(mixed);
    expect((await tree(path.join(mixed, '.github'))).filter((f) => !f.startsWith('skills/'))).toEqual(cloud);
    expect(said('Detected new tool')).toBe(false);
    expect(said('Copilot cloud agent file')).toBe(false);
  });

  it('counts a tool that reads ~/.agents/skills itself as covered by the global install', async () => {
    const cur = path.join(root, 'cursor-project');
    await fs.mkdir(cur, { recursive: true });
    await new InitCommand({ tools: 'cursor', animation: false }).execute(cur);
    await runGlobalSkills({ toolIds: ['claude'] });
    logs = [];
    await new UpdateCommand().execute(cur);
    expect(said('openspec update --use-global-skills')).toBe(true);
  });

  it("refuses a switch that would take away a skill the global install doesn't have", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    // The project has verify; the global install was made with the core set.
    await fs.writeFile(path.join(home, '.config', 'openspec', 'config.json'), JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'verify'] }));
    await new UpdateCommand().execute(project);
    expect(await exists(p('.agents', 'skills', 'openspec-verify-change', 'SKILL.md'))).toBe(true);
    const command = new UpdateCommand({ useGlobalSkills: true });
    await command.execute(project);
    expect(command.globalSkillsFailed).toBe(true);
    expect(said("don't include openspec-verify-change")).toBe(true);
    expect(await exists(p('.agents', 'skills', 'openspec-verify-change', 'SKILL.md'))).toBe(true);
    // After update --global, it switches.
    await runGlobalSkills({});
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    expect(await projectSkills()).toEqual([]);
  });

  it("switches when the global install matches the profile, even if the project still has an old extra skill", async () => {
    await fs.writeFile(path.join(home, '.config', 'openspec', 'config.json'), JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore', 'apply', 'update', 'sync', 'archive', 'onboard'] }));
    await new UpdateCommand().execute(project);
    expect(await exists(p('.agents', 'skills', 'openspec-onboard', 'SKILL.md'))).toBe(true);
    // Back to core; the global install is made with it.
    await fs.writeFile(path.join(home, '.config', 'openspec', 'config.json'), JSON.stringify({ profile: 'core' }));
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const command = new UpdateCommand({ useGlobalSkills: true });
    await command.execute(project);
    expect(command.globalSkillsFailed).toBe(false);
    expect(await projectSkills()).toEqual([]);
  });

  it('goes back to project skills with skills: project', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    const yaml = (await config()).replace(/^skills: global$/m, 'skills: project');
    await fs.writeFile(p('openspec', 'config.yaml'), yaml);
    await new UpdateCommand().execute(project);
    expect(await projectSkills()).toHaveLength(CORE_SKILLS.length);
    expect(await exists(p('.claude', 'skills', 'openspec-propose'))).toBe(true);
  });

  it('settles once switched: the next update writes nothing', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await new UpdateCommand({ useGlobalSkills: true }).execute(project);
    const before = await tree(project);
    const plan = await new UpdateCommand({ dryRun: true }).plan(project);
    expect(plan.changes).toEqual([]);
    await new UpdateCommand().execute(project);
    expect(await tree(project)).toEqual(before);
  });
});
