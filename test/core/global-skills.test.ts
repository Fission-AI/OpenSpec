import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs, lstatSync, readlinkSync } from 'fs';
import os from 'os';
import path from 'path';
import { runGlobalSkills, readGlobalSkillTools } from '../../src/core/global-skills.js';

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
      if (entry.isSymbolicLink()) out.push(`${rel} -> ${readlinkSync(full).split(path.sep).join('/')}`);
      else if (entry.isDirectory()) await walk(full);
      else out.push(rel);
    }
  }
  await walk(dir);
  return out.sort();
}

describe('global skills (--global)', () => {
  let root: string;
  let home: string;
  let cwd: string;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: string;

  beforeEach(async () => {
    originalEnv = { ...process.env };
    originalCwd = process.cwd();
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-global-')));
    home = path.join(root, 'home');
    cwd = path.join(root, 'somewhere');
    await fs.mkdir(path.join(home, '.config', 'openspec'), { recursive: true });
    await fs.mkdir(cwd, { recursive: true });
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    process.env.XDG_CONFIG_HOME = path.join(home, '.config');
    delete process.env.CLAUDE_CONFIG_DIR;
    await fs.writeFile(path.join(home, '.config', 'openspec', 'config.json'), JSON.stringify({ profile: 'core' }));
    process.chdir(cwd);
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = originalEnv;
    await fs.rm(root, { recursive: true, force: true });
  });

  const h = (...segments: string[]) => path.join(home, ...segments);
  const exists = (p: string) => fs.lstat(p).then(() => true, () => false);

  it('writes one copy in ~/.agents/skills and links it for tools that need one', async () => {
    const result = await runGlobalSkills({ toolIds: ['claude', 'cursor'] });
    expect(result.refused).toEqual([]);
    for (const skill of CORE_SKILLS) {
      expect(lstatSync(h('.agents', 'skills', skill, 'SKILL.md')).isFile()).toBe(true);
      const link = h('.claude', 'skills', skill);
      expect(lstatSync(link).isSymbolicLink()).toBe(true);
      expect(path.resolve(path.dirname(link), readlinkSync(link))).toBe(h('.agents', 'skills', skill));
    }
    // Cursor reads ~/.agents/skills itself.
    expect(await exists(h('.cursor'))).toBe(false);
    expect(readGlobalSkillTools(home).sort()).toEqual(['claude', 'cursor']);
  });

  it('never touches the folder it runs in', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    expect(await tree(cwd)).toEqual([]);
  });

  it('settles: a second run changes nothing', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const plan = (await runGlobalSkills({ dryRun: true })).plan!;
    expect(plan.changes).toEqual([]);
    expect(plan.failures).toEqual([]);
  });

  it('writes nothing in a dry run', async () => {
    const result = await runGlobalSkills({ toolIds: ['claude'], dryRun: true });
    expect(result.plan!.changes.length).toBeGreaterThan(0);
    expect(await tree(home)).toEqual(['.config/openspec/config.json']);
  });

  it('refreshes the listed tools when no tools are named (update --global)', async () => {
    await runGlobalSkills({ toolIds: ['claude'] });
    const skill = h('.agents', 'skills', 'openspec-propose', 'SKILL.md');
    const original = await fs.readFile(skill, 'utf8');
    await fs.writeFile(skill, original.replace(/^---[\s\S]*?---/, '---\nname: openspec-propose\ndescription: old\n---'));
    const result = await runGlobalSkills({});
    expect(result.tools).toEqual(['claude']);
    expect(await fs.readFile(skill, 'utf8')).toBe(original);
    // The text it replaced was not OpenSpec's: said so.
    expect(result.install.refreshedEdited).toContain('.agents/skills/openspec-propose/SKILL.md');
  });

  it("keeps an openspec skill that was already there, such as one from npx skills", async () => {
    const theirs = h('.agents', 'skills', 'openspec-propose', 'SKILL.md');
    await fs.mkdir(path.dirname(theirs), { recursive: true });
    await fs.writeFile(theirs, '---\nname: openspec-propose\ndescription: from npx skills\n---\nTheirs.\n');
    const result = await runGlobalSkills({ toolIds: ['claude'] });
    expect(await fs.readFile(theirs, 'utf8')).toContain('Theirs.');
    expect(result.install.kept).toContain('.agents/skills/openspec-propose');
    // Claude Code still gets a link to it, so the skill it loads is the user's.
    expect(lstatSync(h('.claude', 'skills', 'openspec-explore')).isSymbolicLink()).toBe(true);
    const plan = (await runGlobalSkills({ dryRun: true })).plan!;
    expect(plan.changes).toEqual([]);
  });

  it('leaves skills npx skills installed to it, and says how to hand them over', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    // npx skills add -g writes over the same folders and records them in its lock.
    const npxText = '---\nname: openspec-propose\ndescription: from npx skills\n---\nnpx.\n';
    await fs.writeFile(h('.agents', 'skills', 'openspec-propose', 'SKILL.md'), npxText);
    await fs.writeFile(
      h('.agents', '.skill-lock.json'),
      JSON.stringify({ version: 3, skills: { 'openspec-propose': { source: 'Fission-AI/OpenSpec' } } })
    );
    const result = await runGlobalSkills({});
    expect(await fs.readFile(h('.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'utf8')).toBe(npxText);
    expect(result.leftToNpx).toEqual(['openspec-propose']);
    expect(result.install.refreshedEdited).toEqual([]);
    // Settles, and once npx skills removes it, OpenSpec installs its own again.
    expect((await runGlobalSkills({ dryRun: true })).plan!.changes).toEqual([]);
    await fs.rm(h('.agents', 'skills', 'openspec-propose'), { recursive: true });
    await fs.writeFile(h('.agents', '.skill-lock.json'), JSON.stringify({ version: 3, skills: {} }));
    await runGlobalSkills({});
    expect(await fs.readFile(h('.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'utf8')).toContain('openspec');
    expect(await fs.readFile(h('.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'utf8')).not.toBe(npxText);
  });

  it("keeps a skill of the user's in a tool's home folder", async () => {
    const mine = h('.claude', 'skills', 'openspec-propose', 'SKILL.md');
    await fs.mkdir(path.dirname(mine), { recursive: true });
    await fs.writeFile(mine, 'Mine.\n');
    const result = await runGlobalSkills({ toolIds: ['claude'] });
    expect(await fs.readFile(mine, 'utf8')).toBe('Mine.\n');
    expect(result.install.kept).toContain('.claude/skills/openspec-propose');
  });

  it('refuses tools with no known home skills folder, and writes nothing for them', async () => {
    const result = await runGlobalSkills({ toolIds: ['easycode', 'codex'] });
    expect(result.refused).toEqual(['easycode']);
    expect(result.tools).toEqual(['codex']);
    expect(await exists(h('.easycode'))).toBe(false);
    expect(await exists(h('.easycode-user'))).toBe(false);
  });

  it("follows CLAUDE_CONFIG_DIR, like the skills CLI", async () => {
    const claudeHome = path.join(root, 'claude-config');
    process.env.CLAUDE_CONFIG_DIR = claudeHome;
    await runGlobalSkills({ toolIds: ['claude'] });
    expect(lstatSync(path.join(claudeHome, 'skills', 'openspec-propose')).isSymbolicLink()).toBe(true);
    expect(await exists(h('.claude'))).toBe(false);
  });

  it("fails a tool whose home skills folder links elsewhere, and writes nothing there", async () => {
    const dotfiles = path.join(root, 'dotfiles', 'claude-skills');
    await fs.mkdir(dotfiles, { recursive: true });
    await fs.mkdir(h('.claude'), { recursive: true });
    await fs.symlink(dotfiles, h('.claude', 'skills'), process.platform === 'win32' ? 'junction' : 'dir');
    const result = await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    expect([...result.install.toolFailures.keys()]).toEqual(['claude']);
    expect(await tree(path.join(root, 'dotfiles'))).toEqual([]);
    // Codex still gets the shared copy.
    expect(await exists(h('.agents', 'skills', 'openspec-propose', 'SKILL.md'))).toBe(true);
  });

  it("drops a tool's links when it is no longer set up, and keeps the rest", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'kiro'] });
    const result = await runGlobalSkills({ toolIds: ['kiro'] });
    expect(result.dropped).toEqual(['claude']);
    expect(await exists(h('.claude', 'skills', 'openspec-propose'))).toBe(false);
    expect(lstatSync(h('.kiro', 'skills', 'openspec-propose')).isSymbolicLink()).toBe(true);
    expect(readGlobalSkillTools(home)).toEqual(['kiro']);
  });

  it("refuses a home folder that was set up as a project, and doesn't count it as a global install", async () => {
    // What running a project `init` in the home folder leaves behind.
    await fs.mkdir(h('.agents', 'skills', 'openspec-propose'), { recursive: true });
    await fs.writeFile(h('.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'Project skill.\n');
    await fs.writeFile(h('.agents', 'skills', '.openspec-target'), 'claude own-files\n');
    expect(readGlobalSkillTools(home)).toEqual([]);
    await expect(runGlobalSkills({ toolIds: ['claude'] })).rejects.toThrow(/home folder was set up/);
    expect(await fs.readFile(h('.agents', 'skills', 'openspec-propose', 'SKILL.md'), 'utf8')).toBe('Project skill.\n');
  });

  it('leaves no trace once removed', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    await runGlobalSkills({ toolIds: [] });
    expect(await tree(home)).toEqual(['.config/openspec/config.json']);
    expect(await exists(h('.agents'))).toBe(false);
  });

  it('saves an edit beside a global skill before refreshing it, and says so in a dry run', async () => {
    await runGlobalSkills({ toolIds: ['codex'] });
    const skill = h('.agents', 'skills', 'openspec-propose', 'SKILL.md');
    await fs.appendFile(skill, '\nMy note.\n');
    const edited = await fs.readFile(skill, 'utf8');
    const plan = (await runGlobalSkills({ dryRun: true })).plan!;
    expect(plan.notes.map((n) => n.code)).toContain('edited-skills');
    expect(await fs.readFile(skill, 'utf8')).toBe(edited);
    const result = await runGlobalSkills({});
    expect(await fs.readFile(`${skill}.bak`, 'utf8')).toBe(edited);
    expect(result.install.backedUp).toEqual(['.agents/skills/openspec-propose/SKILL.md.bak']);
    expect((await runGlobalSkills({ dryRun: true })).plan!.changes).toEqual([]);
  });

  it("lists a tool the real run would fail on in the dry run", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const dotfiles = path.join(root, 'dotfiles', 'skills');
    await fs.mkdir(dotfiles, { recursive: true });
    await fs.rm(h('.claude', 'skills'), { recursive: true });
    await fs.symlink(dotfiles, h('.claude', 'skills'), process.platform === 'win32' ? 'junction' : 'dir');
    const plan = (await runGlobalSkills({ dryRun: true })).plan!;
    expect(plan.failures.map((f) => f.tool)).toEqual(['claude']);
  });

  it('changes nothing when every tool named has no home skills folder', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const before = await tree(home);
    await expect(runGlobalSkills({ toolIds: ['atomcode'] })).rejects.toThrow(/nothing was changed/);
    expect(await tree(home)).toEqual(before);
  });

  it("still refreshes its own copy when npx skills only installed a skill in a tool's folder", async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    // npx skills recorded the skill, but its copy went to ~/.claude/skills.
    await fs.writeFile(
      h('.agents', '.skill-lock.json'),
      JSON.stringify({ version: 3, skills: { 'openspec-propose': { source: 'Fission-AI/OpenSpec' } } })
    );
    const result = await runGlobalSkills({});
    expect(result.leftToNpx).toEqual([]);
    expect(await fs.readFile(h('.agents', 'skills', '.openspec-target'), 'utf8')).not.toContain('keep openspec-propose');
  });

  it('explains a ~/.agents that links outside the home folder, and writes nothing', async () => {
    const elsewhere = path.join(root, 'dotfiles-agents');
    await fs.mkdir(elsewhere, { recursive: true });
    await fs.symlink(elsewhere, h('.agents'), process.platform === 'win32' ? 'junction' : 'dir');
    await expect(runGlobalSkills({ toolIds: ['codex'] })).rejects.toThrow(/links outside your home folder/);
    expect(await tree(elsewhere)).toEqual([]);
  });

  it('removes the global install with no tools, keeping an edited skill', async () => {
    await runGlobalSkills({ toolIds: ['claude', 'codex'] });
    const edited = h('.agents', 'skills', 'openspec-explore', 'SKILL.md');
    await fs.appendFile(edited, '\nMy note.\n');
    await runGlobalSkills({ toolIds: [] });
    expect(await fs.readFile(edited, 'utf8')).toContain('My note.');
    expect(await exists(h('.agents', 'skills', 'openspec-propose'))).toBe(false);
    expect(await exists(h('.claude', 'skills', 'openspec-propose'))).toBe(false);
    expect(readGlobalSkillTools(home)).toEqual([]);
  });
});
