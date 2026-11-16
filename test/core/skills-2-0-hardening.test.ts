import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs, readFileSync, lstatSync, readlinkSync } from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { classifySkillLinkSpot, createSkillLink, skillLinkText } from '../../src/core/shared/skill-links.js';
import { getConfiguredTools } from '../../src/core/shared/tool-detection.js';
import { detectLegacyArtifacts } from '../../src/core/legacy-cleanup.js';
import { hasProjectConfigDrift } from '../../src/core/profile-sync-drift.js';
import { CORE_WORKFLOWS } from '../../src/core/profiles.js';
import { releasedCodexPrompt } from '../helpers/released-codex-prompt.js';

vi.mock('../../src/utils/interactive.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/utils/interactive.js')>();
  return { ...actual, isInteractive: () => false };
});

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/released-output');
const linkType = process.platform === 'win32' ? 'junction' : 'dir';
const SKILLS = [
  'openspec-propose',
  'openspec-explore',
  'openspec-apply-change',
  'openspec-update-change',
  'openspec-sync-specs',
  'openspec-archive-change',
];

/**
 * Regressions from the adversarial review of OpenSpec 2.0: each case is a
 * project a real user could have, and each must neither lose the user's work
 * nor leave the project in a state update can't settle.
 */
describe('OpenSpec 2.0 skills: hardening', () => {
  let root: string;
  let project: string;
  let originalEnv: NodeJS.ProcessEnv;
  let logs: string[];

  beforeEach(async () => {
    originalEnv = { ...process.env };
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-2-0-')));
    project = path.join(root, 'project');
    await fs.mkdir(path.join(project, 'openspec'), { recursive: true });
    process.env.HOME = path.join(root, 'home');
    process.env.USERPROFILE = path.join(root, 'home');
    process.env.CODEX_HOME = path.join(root, 'home', '.codex');
    process.env.XDG_CONFIG_HOME = path.join(root, 'home', '.config');
    await fs.mkdir(path.join(root, 'home', '.config', 'openspec'), { recursive: true });
    await fs.writeFile(path.join(root, 'home', '.config', 'openspec', 'config.json'), JSON.stringify({ profile: 'core' }));
    logs = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      logs.push(args.map(String).join(' '));
    });
  });

  afterEach(async () => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    await fs.rm(root, { recursive: true, force: true });
  });

  const p = (...segments: string[]) => path.join(project, ...segments);
  const exists = (rel: string) => fs.access(p(rel)).then(() => true, () => false);
  const read = (rel: string) => fs.readFile(p(rel), 'utf8');
  async function settles(): Promise<void> {
    logs = [];
    await new UpdateCommand().execute(project);
    expect(logs.some((line) => line.includes('up to date')), logs.join('\n')).toBe(true);
  }

  it("leaves the shared skills alone when a tool's skills folder is a link to them", async () => {
    // What many 1.x users did by hand to share one set of skills.
    await new InitCommand({ tools: 'cursor,claude', force: true }).execute(project);
    await fs.rm(p('.claude', 'skills'), { recursive: true });
    await fs.symlink(path.join('..', '.agents', 'skills'), p('.claude', 'skills'), linkType);

    await new UpdateCommand().execute(project);

    for (const skill of SKILLS) expect(await exists(`.agents/skills/${skill}/SKILL.md`), skill).toBe(true);
    await settles();
  });

  it('leaves the shared skills alone when .agents/skills is a link to a tool folder', async () => {
    await fs.mkdir(p('.claude', 'skills'), { recursive: true });
    await fs.mkdir(p('.agents'), { recursive: true });
    await fs.symlink(path.join('..', '.claude', 'skills'), p('.agents', 'skills'), linkType);

    await new InitCommand({ tools: 'claude', force: true }).execute(project);

    for (const skill of SKILLS) expect(await exists(`.agents/skills/${skill}/SKILL.md`), skill).toBe(true);
    await settles();
  });

  it('repairs links that git checked out as files (no link support)', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    for (const skill of SKILLS) {
      const spot = p('.claude', 'skills', skill);
      const target = path.relative(path.dirname(spot), p('.agents', 'skills', skill));
      await fs.rm(spot, { recursive: true });
      await fs.writeFile(spot, target);
    }
    expect(getConfiguredTools(project)).toContain('claude');

    await new UpdateCommand().execute(project);

    for (const skill of SKILLS) {
      expect(await read(`.claude/skills/${skill}/SKILL.md`), skill).toContain(`name: ${skill}`);
    }
    await settles();
  });

  it("never writes through the user's link at .agents/skills/openspec-*", async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    const team = path.join(root, 'team-skills', 'explore');
    await fs.mkdir(team, { recursive: true });
    await fs.writeFile(path.join(team, 'SKILL.md'), 'our team explore\n');
    await fs.rm(p('.agents', 'skills', 'openspec-explore'), { recursive: true });
    await fs.symlink(team, p('.agents', 'skills', 'openspec-explore'), linkType);

    await new UpdateCommand().execute(project);

    expect(readFileSync(path.join(team, 'SKILL.md'), 'utf8')).toBe('our team explore\n');
    await settles();
  });

  it('settles when every skill the profile wants is the user’s own', async () => {
    for (const skill of SKILLS) {
      await fs.mkdir(p('.agents', 'skills', skill), { recursive: true });
      await fs.writeFile(p('.agents', 'skills', skill, 'SKILL.md'), `---\nname: ${skill}\n---\nmine\n`);
    }
    await new InitCommand({ tools: 'cursor', force: true }).execute(project);

    await settles();
    await settles();
  });

  it('rebuilds the shared copy when .agents/ is missing but the links are there', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    await fs.rm(p('.agents'), { recursive: true });
    expect(getConfiguredTools(project)).toContain('claude');

    await new UpdateCommand().execute(project);

    for (const skill of SKILLS) expect(await exists(`.claude/skills/${skill}/SKILL.md`), skill).toBe(true);
    await settles();
  });

  it('treats OS junk beside a plain copy as nothing of the user’s', async () => {
    const shared = p('.agents', 'skills', 'openspec-explore');
    await fs.mkdir(shared, { recursive: true });
    await fs.writeFile(path.join(shared, 'SKILL.md'), 'skill text\n');
    const copy = p('.claude', 'skills', 'openspec-explore');
    await fs.mkdir(copy, { recursive: true });
    await fs.writeFile(path.join(copy, 'SKILL.md'), 'skill text\n');
    for (const junk of ['.DS_Store', '._SKILL.md', 'Thumbs.db', 'desktop.ini']) await fs.writeFile(path.join(copy, junk), 'x');

    expect(classifySkillLinkSpot(copy, shared, 'skill text\n')).toBe('copy');
  });

  it('copies only SKILL.md where a link cannot be made', async () => {
    const shared = p('.agents', 'skills', 'openspec-explore');
    await fs.mkdir(shared, { recursive: true });
    await fs.writeFile(path.join(shared, 'SKILL.md'), 'skill text\n');
    await fs.writeFile(path.join(shared, '.DS_Store'), 'x');
    const spot = p('.claude', 'skills', 'openspec-explore');

    expect(createSkillLink(spot, shared, () => { throw new Error('no links here'); })).toBe('copy');
    expect((await fs.readdir(spot)).sort()).toEqual(['SKILL.md']);
  });

  it('writes links through .agents as named, so a linked .agents can move', async () => {
    await fs.mkdir(p('shared-agents', 'skills', 'openspec-explore'), { recursive: true });
    await fs.symlink('shared-agents', p('.agents'), linkType);
    await fs.mkdir(p('.claude', 'skills'), { recursive: true });

    expect(skillLinkText(p('.claude', 'skills', 'openspec-explore'), p('.agents', 'skills', 'openspec-explore'))).toBe(
      path.join('..', '..', '.agents', 'skills', 'openspec-explore')
    );
  });

  it('never offers an edited Codex prompt in the home folder for cleanup', async () => {
    const prompts = path.join(root, 'home', '.codex', 'prompts');
    await fs.mkdir(prompts, { recursive: true });
    const released = readFileSync(path.join(FIXTURES, 'v1.0.0-codex-prompt-opsx-new.md'), 'utf8');
    await fs.writeFile(path.join(prompts, 'opsx-new.md'), released);
    await fs.writeFile(path.join(prompts, 'opsx-apply.md'), `${released}\nOur step.\n`);

    const detection = await detectLegacyArtifacts(project);

    expect(detection.globalSlashCommandFiles.map((file) => path.basename(file))).toEqual(['opsx-new.md']);
  });

  it('removes the untouched skills a profile change drops, and keeps none as the user’s', async () => {
    await new InitCommand({ tools: 'cursor', force: true }).execute(project);
    await fs.writeFile(
      path.join(root, 'home', '.config', 'openspec', 'config.json'),
      JSON.stringify({ profile: 'custom', workflows: ['explore'] })
    );

    await new UpdateCommand().execute(project);

    expect((await fs.readdir(p('.agents', 'skills'))).sort()).toEqual(['.openspec-target', 'openspec-explore']);
    expect(await read('.agents/skills/.openspec-target')).not.toContain('keep');
    await settles();
  });

  const setProfile = (config: object) =>
    fs.writeFile(path.join(root, 'home', '.config', 'openspec', 'config.json'), JSON.stringify(config));

  it('removes a file at an excluded built-in skill’s name', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    await fs.writeFile(p('.agents', 'skills', 'openspec-onboard'), '../../team/openspec-onboard');

    await new UpdateCommand({ force: true }).execute(project);

    expect(await exists('.agents/skills/openspec-onboard')).toBe(false);
    await settles();
  });

  it.skipIf(process.platform === 'linux')(
    'leaves the shared skills alone when a tool folder links to them in other letter case',
    async () => {
      // macOS and Windows folders ignore case, so .Agents is .agents.
      await new InitCommand({ tools: 'cursor,claude', force: true }).execute(project);
      await fs.rm(p('.claude', 'skills'), { recursive: true });
      await fs.symlink(path.join('..', '.Agents', 'skills'), p('.claude', 'skills'), linkType);

      await new UpdateCommand({ force: true }).execute(project);

      for (const skill of SKILLS) expect(await exists(`.agents/skills/${skill}/SKILL.md`), skill).toBe(true);
      await settles();
    }
  );

  it('stops reporting profile drift once a dropped, edited skill is kept', async () => {
    await setProfile({ profile: 'custom', workflows: ['propose', 'explore', 'apply', 'archive', 'onboard'] });
    await new InitCommand({ tools: 'cursor', force: true }).execute(project);
    await fs.appendFile(p('.agents', 'skills', 'openspec-onboard', 'SKILL.md'), '\nOur notes.\n');
    await setProfile({ profile: 'core' });

    await new UpdateCommand().execute(project);

    expect(hasProjectConfigDrift(project, [...CORE_WORKFLOWS], 'skills')).toBe(false);
    logs = [];
    await new UpdateCommand().execute(project);
    expect(logs.join('\n')).not.toContain('not in profile');
  });

  it('recognizes its own skill whatever skills sat beside it', async () => {
    await setProfile({ profile: 'custom', workflows: ['onboard', 'explore', 'apply', 'archive'] });
    await new InitCommand({ tools: 'cursor', force: true }).execute(project);
    // The user removes a skill by hand, so onboard's text matches no set
    // installed now.
    await fs.rm(p('.agents', 'skills', 'openspec-explore'), { recursive: true });
    await setProfile({ profile: 'custom', workflows: ['apply', 'archive'] });

    await new UpdateCommand().execute(project);

    expect(await exists('.agents/skills/openspec-onboard')).toBe(false);
    expect(await read('.agents/skills/.openspec-target')).not.toContain('keep');
    await settles();
  });

  it('plans exactly what it does for a skill folder holding an empty subfolder', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    const spot = p('.claude', 'skills', 'openspec-explore');
    await fs.rm(spot, { recursive: true });
    await fs.mkdir(path.join(spot, 'scripts'), { recursive: true });
    await fs.copyFile(p('.agents', 'skills', 'openspec-explore', 'SKILL.md'), path.join(spot, 'SKILL.md'));

    const plan = await new UpdateCommand({ force: true, dryRun: true }).plan(project);
    await new UpdateCommand({ force: true }).execute(project);

    // The user's subfolder makes the folder theirs: kept, in the plan and on disk.
    expect(plan.changes.filter((change) => change.path.includes('openspec-explore'))).toEqual([]);
    expect(lstatSync(spot).isDirectory()).toBe(true);
    expect(lstatSync(path.join(spot, 'scripts')).isDirectory()).toBe(true);
  });

  it('sets up a tool that reads .agents/skills even when its old skills folder links outside', async () => {
    const dotfiles = path.join(root, 'dotfiles', 'cursor-skills', 'my-skill');
    await fs.mkdir(dotfiles, { recursive: true });
    await fs.writeFile(path.join(dotfiles, 'SKILL.md'), 'mine\n');
    await fs.mkdir(p('.cursor'), { recursive: true });
    await fs.symlink(path.dirname(dotfiles), p('.cursor', 'skills'), linkType);

    await new InitCommand({ tools: 'cursor', force: true }).execute(project);

    expect(await exists('.agents/skills/openspec-propose/SKILL.md')).toBe(true);
    expect(await fs.readdir(path.dirname(dotfiles))).toEqual(['my-skill']);
    await settles();
  });

  it('reports no command files that aren’t there when a tool folder links outside', async () => {
    const outside = path.join(root, 'outside-cursor');
    await fs.mkdir(outside, { recursive: true });
    await fs.symlink(outside, p('.cursor'), linkType);

    await new InitCommand({ tools: 'cursor', force: true }).execute(project);

    expect(logs.join('\n')).not.toContain('command files in place');
    expect(await fs.readdir(outside)).toEqual([]);
  });

  it('refreshes a fallback copy left at an older text, without --force', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    // A skill's text no longer changes with the profile, so the older text is
    // one a release wrote.
    const older = readFileSync(
      path.join(FIXTURES, 'v1.16.0-claude-skills', 'openspec-apply-change', 'SKILL.md'),
      'utf8'
    );
    const spot = p('.claude', 'skills', 'openspec-apply-change');
    await fs.rm(spot, { recursive: true });
    await fs.mkdir(spot);
    await fs.writeFile(path.join(spot, 'SKILL.md'), older);
    expect(older).not.toBe(await read('.agents/skills/openspec-apply-change/SKILL.md'));

    await new UpdateCommand().execute(project);

    expect(lstatSync(spot).isSymbolicLink()).toBe(process.platform !== 'win32');
    await settles();
  });

  it('keeps a fallback copy equal to the shared copy (where links can’t be made)', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    const spot = p('.claude', 'skills', 'openspec-explore');
    await fs.rm(spot, { recursive: true });
    await fs.mkdir(spot);
    await fs.copyFile(p('.agents', 'skills', 'openspec-explore', 'SKILL.md'), path.join(spot, 'SKILL.md'));

    const plan = await new UpdateCommand({ force: true, dryRun: true }).plan(project);
    await new UpdateCommand({ force: true }).execute(project);

    expect(plan.changes.filter((change) => change.path.includes('openspec-explore'))).toEqual([]);
    expect(lstatSync(spot).isDirectory()).toBe(true);
    await settles();
  });

  it('links a skill whose folder was left empty', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    const spot = p('.claude', 'skills', 'openspec-explore');
    await fs.rm(spot, { recursive: true });
    await fs.mkdir(spot);
    await fs.writeFile(path.join(spot, '.DS_Store'), 'x');

    await new UpdateCommand().execute(project);

    expect(lstatSync(spot).isSymbolicLink()).toBe(process.platform !== 'win32');
    await settles();
  });

  it('init for one tool also cleans up the generated commands of a tool already set up', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    await fs.mkdir(p('.claude', 'commands', 'opsx'), { recursive: true });
    await fs.copyFile(
      path.join(FIXTURES, 'v1.0.0-claude-command-opsx-explore.md'),
      p('.claude', 'commands', 'opsx', 'explore.md')
    );

    await new InitCommand({ tools: 'cursor', force: true }).execute(project);

    expect(await exists('.claude/commands/opsx/explore.md')).toBe(false);
    await settles();
  });

  it.skipIf(process.platform === 'win32')('init for one tool reports a failure in another set-up tool’s skills folder', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    // Claude needs a link it can't write: its skills folder is read-only.
    await fs.rm(p('.claude', 'skills', 'openspec-explore'));
    await fs.chmod(p('.claude', 'skills'), 0o555);
    // Its generated command files must survive the failure, as in update.
    await fs.mkdir(p('.claude', 'commands', 'opsx'), { recursive: true });
    await fs.copyFile(
      path.join(FIXTURES, 'v1.0.0-claude-command-opsx-explore.md'),
      p('.claude', 'commands', 'opsx', 'explore.md')
    );
    try {
      await expect(new InitCommand({ tools: 'cursor', force: true }).execute(project)).rejects.toThrow(
        'Claude Code (already set up here)'
      );
      expect(await exists('.agents/skills/openspec-propose/SKILL.md')).toBe(true);
      expect(await exists('.claude/commands/opsx/explore.md')).toBe(true);
    } finally {
      await fs.chmod(p('.claude', 'skills'), 0o755);
    }
  });

  it('init --tools none touches no tool already set up', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    await fs.mkdir(p('.claude', 'commands', 'opsx'), { recursive: true });
    await fs.copyFile(
      path.join(FIXTURES, 'v1.0.0-claude-command-opsx-explore.md'),
      p('.claude', 'commands', 'opsx', 'explore.md')
    );
    const before = await read('.claude/skills/openspec-explore/SKILL.md');

    await new InitCommand({ tools: 'none', force: true }).execute(project);

    expect(await exists('.claude/commands/opsx/explore.md')).toBe(true);
    expect(await read('.claude/skills/openspec-explore/SKILL.md')).toBe(before);
  });

  it('lists an edited Codex prompt it keeps while removing the untouched ones', async () => {
    await new InitCommand({ tools: 'codex', force: true }).execute(project);
    const prompts = path.join(root, 'home', '.codex', 'prompts');
    await fs.mkdir(prompts, { recursive: true });
    await fs.writeFile(path.join(prompts, 'opsx-explore.md'), releasedCodexPrompt('opsx-explore.md'));
    await fs.writeFile(path.join(prompts, 'opsx-apply.md'), `${releasedCodexPrompt('opsx-apply.md')}\nMY EDIT\n`);

    logs = [];
    await new UpdateCommand({ force: true }).execute(project);

    expect(await fs.access(path.join(prompts, 'opsx-explore.md')).then(() => true, () => false)).toBe(false);
    expect(readFileSync(path.join(prompts, 'opsx-apply.md'), 'utf8')).toContain('MY EDIT');
    expect(logs.join('\n')).toContain('Kept 1 prompt file in your home folder');
    expect(logs.join('\n')).toContain(path.join(prompts, 'opsx-apply.md'));
  });

  it('never adds the retired delivery key when saving the config', async () => {
    const { configSetCommand } = await import('../../src/commands/config.js');
    configSetCommand('profile', 'custom', {});
    const saved = JSON.parse(readFileSync(path.join(root, 'home', '.config', 'openspec', 'config.json'), 'utf8'));
    expect(saved.profile).toBe('custom');
    expect('delivery' in saved).toBe(false);
  });

  it('lists an edited Codex prompt under --force even when no untouched prompt is left', async () => {
    await new InitCommand({ tools: 'codex', force: true }).execute(project);
    const prompts = path.join(root, 'home', '.codex', 'prompts');
    await fs.mkdir(prompts, { recursive: true });
    await fs.writeFile(path.join(prompts, 'opsx-apply.md'), `${releasedCodexPrompt('opsx-apply.md')}\nMY EDIT\n`);

    logs = [];
    await new UpdateCommand({ force: true }).execute(project);
    const forced = logs.join('\n');
    expect(forced).toContain('Kept 1 prompt file in your home folder');
    expect(forced).toContain(path.join(prompts, 'opsx-apply.md'));
    expect(forced.match(/Kept 1 prompt file in your home folder/g)).toHaveLength(1);
    expect(readFileSync(path.join(prompts, 'opsx-apply.md'), 'utf8')).toContain('MY EDIT');

    // A plain update stays quiet about another project's prompts.
    logs = [];
    await new UpdateCommand().execute(project);
    expect(logs.join('\n')).not.toContain('prompt file in your home folder');
  });

  it('records a project set up with exactly the core workflows as the core profile, without delivery', async () => {
    await fs.rm(path.join(root, 'home', '.config', 'openspec', 'config.json'));
    await new InitCommand({ tools: 'claude', force: true }).execute(project);

    logs = [];
    await new UpdateCommand().execute(project);

    const config = JSON.parse(readFileSync(path.join(root, 'home', '.config', 'openspec', 'config.json'), 'utf8'));
    expect(config.profile).toBe('core');
    // Never an inferred delivery: at most the default, which changes nothing.
    expect(config.delivery).toBeUndefined();
    expect(logs.some((line) => line.includes('Migrated: custom profile'))).toBe(false);
  });

  it('keeps links relative', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    const spot = p('.claude', 'skills', 'openspec-explore');
    expect(lstatSync(spot).isSymbolicLink()).toBe(process.platform !== 'win32');
    if (lstatSync(spot).isSymbolicLink()) expect(path.isAbsolute(readlinkSync(spot))).toBe(false);
  });
});
