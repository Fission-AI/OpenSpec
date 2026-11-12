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
    await runGlobalSkills({ toolIds: ['claude'] });
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
