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

  it("keeps the user's own openspec-* skill even when it mentions another skill", async () => {
    const mine = '---\nname: openspec-propose\ndescription: our flow\n---\nOurs. Then run /openspec-apply-change.\n';
    await fs.mkdir(p('.agents', 'skills', 'openspec-propose'), { recursive: true });
    await fs.writeFile(p('.agents', 'skills', 'openspec-propose', 'SKILL.md'), mine);

    await new InitCommand({ tools: 'claude', force: true }).execute(project);

    expect(await read('.agents/skills/openspec-propose/SKILL.md')).toBe(mine);
    const list = await read('.agents/skills/.openspec-target');
    expect(list).toContain('keep openspec-propose');
    expect(list.split('\n')).not.toContain('agents');
    await settles();
  });

  it('repairs links that git checked out as files (no link support)', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    for (const skill of SKILLS) {
      const spot = p('.claude', 'skills', skill);
      const target = readlinkSync(spot);
      await fs.rm(spot);
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

  it('keeps an edited skill of a workflow the profile drops, as the user’s', async () => {
    await fs.writeFile(
      path.join(root, 'home', '.config', 'openspec', 'config.json'),
      JSON.stringify({ profile: 'custom', workflows: ['propose', 'explore', 'apply', 'archive', 'onboard'] })
    );
    await new InitCommand({ tools: 'cursor', force: true }).execute(project);
    await fs.appendFile(p('.agents', 'skills', 'openspec-onboard', 'SKILL.md'), '\nOur onboarding notes.\n');
    const edited = await read('.agents/skills/openspec-onboard/SKILL.md');
    await fs.writeFile(path.join(root, 'home', '.config', 'openspec', 'config.json'), JSON.stringify({ profile: 'core' }));

    logs = [];
    await new UpdateCommand().execute(project);

    expect(await read('.agents/skills/openspec-onboard/SKILL.md')).toBe(edited);
    expect(await read('.agents/skills/.openspec-target')).toContain('keep openspec-onboard');
    await settles();
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

  it('records a project set up with exactly the core workflows as the core profile, without delivery', async () => {
    await fs.rm(path.join(root, 'home', '.config', 'openspec', 'config.json'));
    await new InitCommand({ tools: 'claude', force: true }).execute(project);

    logs = [];
    await new UpdateCommand().execute(project);

    const config = JSON.parse(readFileSync(path.join(root, 'home', '.config', 'openspec', 'config.json'), 'utf8'));
    expect(config.profile).toBe('core');
    // Never an inferred delivery: at most the default, which changes nothing.
    expect(config.delivery ?? 'skills').toBe('skills');
    expect(logs.some((line) => line.includes('Migrated: custom profile'))).toBe(false);
  });

  it('keeps links relative', async () => {
    await new InitCommand({ tools: 'claude', force: true }).execute(project);
    const spot = p('.claude', 'skills', 'openspec-explore');
    expect(lstatSync(spot).isSymbolicLink()).toBe(true);
    expect(path.isAbsolute(readlinkSync(spot))).toBe(false);
  });
});
