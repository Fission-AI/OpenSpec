import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { AI_TOOLS } from '../../src/core/config.js';
import {
  BETA_SKILL_NAME,
  betaReplacesTool,
  findOldNpxSkills,
  getBetaReplacedTools,
  setBetaReplacedTools,
} from '../../src/core/beta-skills.js';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';

const tool = (id: string) => AI_TOOLS.find((candidate) => candidate.value === id)!;

/** The router SKILL.md as the beta ships it: name plus the router layout marker. */
const ROUTER = `---\nname: ${BETA_SKILL_NAME}\ndescription: "OpenSpec"\nmetadata:\n  author: openspec\n  layout: "router"\n---\n\n# OpenSpec\n`;

describe('openspec-beta skills replace per-project ones', () => {
  let root: string;
  let home: string;
  let project: string;
  const keys = ['HOME', 'USERPROFILE', 'XDG_CONFIG_HOME', 'CLAUDE_CONFIG_DIR'] as const;
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  /** Everything OpenSpec wrote into the project's tool folders, with its bytes. */
  function projectFiles(): Record<string, string> {
    const out: Record<string, string> = {};
    const walk = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else out[path.relative(project, full)] = fs.readFileSync(full, 'utf8');
      }
    };
    for (const name of fs.readdirSync(project)) {
      if (name.startsWith('.') && name !== '.git') walk(path.join(project, name));
    }
    return out;
  }
  const openspecFiles = () => Object.keys(projectFiles()).filter((file) => !file.includes(BETA_SKILL_NAME));

  function installBeta(base: string, skillsDir = '.claude') {
    const dir = path.join(base, skillsDir, 'skills', BETA_SKILL_NAME);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'SKILL.md'), ROUTER);
  }
  const removeBeta = (base: string, skillsDir = '.claude') =>
    fs.rmSync(path.join(base, skillsDir, 'skills', BETA_SKILL_NAME), { recursive: true, force: true });

  const init = (tools: string) => new InitCommand({ tools, force: true }).execute(project);
  const update = (options: { dryRun?: boolean } = {}) => new UpdateCommand(options).execute(project);

  beforeEach(() => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-beta-switch-')));
    home = path.join(root, 'home');
    project = path.join(root, 'project');
    fs.mkdirSync(home);
    fs.mkdirSync(project);
    process.env.HOME = home;
    process.env.USERPROFILE = home;
    process.env.XDG_CONFIG_HOME = path.join(home, '.config');
    delete process.env.CLAUDE_CONFIG_DIR;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
    fs.rmSync(root, { recursive: true, force: true });
  });

  describe('detection', () => {
    it('sees the beta in the tool folder in the home directory, where -g installs it', () => {
      expect(betaReplacesTool(project, tool('claude'))).toBe(false);
      installBeta(home);
      expect(betaReplacesTool(project, tool('claude'))).toBe(true);
    });

    it('sees the beta inside the project, where an install without -g puts it', () => {
      installBeta(project);
      expect(betaReplacesTool(project, tool('claude'))).toBe(true);
    });

    it('honours CLAUDE_CONFIG_DIR for Claude Code', () => {
      const config = path.join(root, 'claude-config');
      fs.mkdirSync(path.join(config, 'skills', BETA_SKILL_NAME), { recursive: true });
      fs.writeFileSync(path.join(config, 'skills', BETA_SKILL_NAME, 'SKILL.md'), ROUTER);
      process.env.CLAUDE_CONFIG_DIR = config;
      expect(betaReplacesTool(project, tool('claude'))).toBe(true);
    });

    it('needs the router layout marker, not just the folder name', () => {
      const dir = path.join(home, '.claude', 'skills', BETA_SKILL_NAME);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${BETA_SKILL_NAME}\n---\nmy own skill\n`);
      expect(betaReplacesTool(project, tool('claude'))).toBe(false);
    });

    it('applies only to the tool whose folder holds the beta', () => {
      installBeta(home);
      expect(betaReplacesTool(project, tool('cursor'))).toBe(false);
    });

    it('sees the beta for a tool whose OpenSpec skills live in the home folder, where that tool reads', () => {
      const minimax = tool('minimax-code');
      expect(betaReplacesTool(project, minimax)).toBe(false);
      installBeta(home, minimax.globalSkillsDir!);
      expect(betaReplacesTool(project, minimax)).toBe(true);
    });

    // Codex, Amp, Antigravity, GSD, Zed and the universal target all read
    // .agents/skills, and ~/.agents/skills is where `npx skills add -g` keeps
    // its canonical copy.
    it('sees the beta for every .agents tool through ~/.agents/skills', () => {
      installBeta(home, '.agents');
      const agentsTools = AI_TOOLS.filter((candidate) => candidate.skillsDir === '.agents');
      expect(agentsTools.map((candidate) => candidate.value)).toEqual(
        expect.arrayContaining(['codex', 'amp', 'zed', 'agents'])
      );
      for (const candidate of agentsTools) expect(betaReplacesTool(project, candidate), candidate.value).toBe(true);
    });
  });

  describe('old skills an earlier npx skills add left', () => {
    const writeSkill = (folder: string, name: string, body: string) => {
      fs.mkdirSync(path.join(folder, name), { recursive: true });
      fs.writeFileSync(path.join(folder, name, 'SKILL.md'), body);
    };

    it('names the copies without generatedBy, the ones the skills CLI installed', () => {
      writeSkill(path.join(home, '.claude', 'skills'), 'openspec-propose', '---\nname: openspec-propose\n---\nold\n');
      writeSkill(path.join(home, '.agents', 'skills'), 'openspec-explore', '---\nname: openspec-explore\n---\nold\n');
      writeSkill(
        path.join(home, '.claude', 'skills'),
        'openspec-apply-change',
        '---\nname: openspec-apply-change\nmetadata:\n  generatedBy: "1.16.0"\n---\nours\n'
      );
      expect(findOldNpxSkills()).toEqual(['openspec-explore', 'openspec-propose']);
    });

    it('says how to remove them when the beta is in use, and deletes none of them', async () => {
      const old = path.join(home, '.claude', 'skills', 'openspec-propose');
      writeSkill(path.join(home, '.claude', 'skills'), 'openspec-propose', '---\nname: openspec-propose\n---\nold\n');
      await init('claude');
      installBeta(home);
      vi.mocked(console.log).mockClear();
      await update();
      const printed = vi.mocked(console.log).mock.calls.map((call) => call.join(' ')).join('\n');
      expect(printed).toContain('npx skills remove -g -y openspec-propose');
      expect(fs.existsSync(path.join(old, 'SKILL.md'))).toBe(true);
    });
  });

  describe('the record', () => {
    it('is kept per project in the user config, and clears when empty', () => {
      setBetaReplacedTools(project, ['claude']);
      expect(getBetaReplacedTools(project)).toEqual(['claude']);
      expect(getBetaReplacedTools(path.join(root, 'elsewhere'))).toEqual([]);
      setBetaReplacedTools(project, []);
      expect(getBetaReplacedTools(project)).toEqual([]);
      const config = JSON.parse(fs.readFileSync(path.join(home, '.config', 'openspec', 'config.json'), 'utf8'));
      expect(config.betaReplacedTools).toBeUndefined();
    });

    it('drops entries for projects that no longer exist', () => {
      const gone = path.join(root, 'gone');
      fs.mkdirSync(gone);
      setBetaReplacedTools(gone, ['claude']);
      fs.rmSync(gone, { recursive: true });
      setBetaReplacedTools(project, ['claude']);
      const config = JSON.parse(fs.readFileSync(path.join(home, '.config', 'openspec', 'config.json'), 'utf8'));
      expect(Object.keys(config.betaReplacedTools)).toEqual([fs.realpathSync(project)]);
    });

    it('writes nothing into the project', async () => {
      await init('claude');
      installBeta(home);
      const before = fs.readdirSync(project).sort();
      await update();
      expect(fs.readdirSync(project).sort()).toEqual(before);
      expect(fs.existsSync(path.join(project, '.claude', 'skills'))).toBe(true);
    });
  });

  describe('openspec update', () => {
    it('opting in removes the per-project skills and commands; opting out restores them byte for byte', async () => {
      await init('claude');
      const original = projectFiles();
      expect(Object.keys(original).length).toBeGreaterThan(0);

      installBeta(home);
      await update();
      expect(openspecFiles()).toEqual([]);
      expect(getBetaReplacedTools(project)).toEqual(['claude']);

      await update();
      expect(openspecFiles()).toEqual([]);

      removeBeta(home);
      await update();
      expect(projectFiles()).toEqual(original);
      expect(getBetaReplacedTools(project)).toEqual([]);
    });

    it('after opting out, names the other projects that still need an update', async () => {
      const other = path.join(root, 'other');
      fs.mkdirSync(other);
      await new InitCommand({ tools: 'claude', force: true }).execute(other);
      await init('claude');
      installBeta(home);
      await new UpdateCommand().execute(other);
      await update();

      removeBeta(home);
      vi.mocked(console.log).mockClear();
      await update();
      const printed = vi.mocked(console.log).mock.calls.map((call) => call.join(' ')).join('\n');
      expect(printed).toContain(`run \`openspec update\` in: ${fs.realpathSync(other)}`);
      expect(getBetaReplacedTools(other)).toEqual(['claude']);
    });

    it('never suggests running init for a tool that is using the beta', async () => {
      await init('claude,cursor');
      installBeta(home);
      vi.mocked(console.log).mockClear();
      await update();
      await update();
      const printed = vi.mocked(console.log).mock.calls.map((call) => call.join(' ')).join('\n');
      expect(printed).not.toContain('Detected new tool: Claude Code');
      expect(printed).toContain('Using the OpenSpec beta skills for Claude Code');
    });

    it('leaves a tool that cannot see the beta exactly as it was', async () => {
      await init('claude,cursor');
      const cursorBefore = Object.entries(projectFiles()).filter(([file]) => file.startsWith('.cursor'));
      installBeta(home);
      await update();
      expect(openspecFiles().filter((file) => file.startsWith('.claude'))).toEqual([]);
      expect(Object.entries(projectFiles()).filter(([file]) => file.startsWith('.cursor'))).toEqual(cursorBefore);
      expect(getBetaReplacedTools(project)).toEqual(['claude']);
    });

    // MiniMax Code keeps OpenSpec's skills in ~/.minimax/skills, for every
    // project at once, so the switch is machine-wide too.
    it('switches a tool whose skills live in the home folder for the whole machine, and back', async () => {
      const minimaxSkills = path.join(home, '.minimax', 'skills');
      const minimaxFiles = () =>
        fs.existsSync(minimaxSkills)
          ? fs.readdirSync(minimaxSkills).filter((name) => !name.startsWith(BETA_SKILL_NAME)).sort()
          : [];
      await init('minimax-code');
      const original = minimaxFiles();
      expect(original.length).toBeGreaterThan(0);
      const other = path.join(root, 'other');
      fs.mkdirSync(other);
      fs.mkdirSync(path.join(other, 'openspec'));

      installBeta(home, '.minimax');
      await update();
      expect(minimaxFiles()).toEqual([]);
      expect(getBetaReplacedTools(project)).toEqual(['minimax-code']);
      // The record is machine-wide: another project sees it too, and its update keeps it.
      expect(getBetaReplacedTools(other)).toEqual(['minimax-code']);
      await new UpdateCommand().execute(other);
      expect(getBetaReplacedTools(project)).toEqual(['minimax-code']);

      removeBeta(home, '.minimax');
      await new UpdateCommand().execute(other);
      expect(minimaxFiles()).toEqual(original);
      expect(getBetaReplacedTools(project)).toEqual([]);
    });

    it('changes nothing on a dry run', async () => {
      await init('claude');
      installBeta(home);
      const before = projectFiles();
      await update({ dryRun: true });
      expect(projectFiles()).toEqual(before);
      expect(getBetaReplacedTools(project)).toEqual([]);
    });

    it('still succeeds when the user config cannot be read', async () => {
      await init('claude');
      installBeta(home);
      const configFile = path.join(home, '.config', 'openspec', 'config.json');
      fs.mkdirSync(path.dirname(configFile), { recursive: true });
      fs.writeFileSync(configFile, '{ not json');
      await expect(update()).resolves.toBeUndefined();
      expect(openspecFiles()).toEqual([]);
      expect(fs.readFileSync(configFile, 'utf8')).toBe('{ not json');
    });
  });

  describe('openspec init', () => {
    it('writes no per-project skills for a tool that can see the beta, and update restores them once it is gone', async () => {
      installBeta(home);
      await init('claude');
      expect(openspecFiles()).toEqual([]);
      expect(fs.existsSync(path.join(project, 'openspec', 'config.yaml'))).toBe(true);
      expect(getBetaReplacedTools(project)).toEqual(['claude']);

      removeBeta(home);
      await update();
      const restored = projectFiles();

      fs.rmSync(project, { recursive: true, force: true });
      fs.mkdirSync(project);
      await init('claude');
      expect(restored).toEqual(projectFiles());
    });

    it('removes per-project skills a project already had when init runs again', async () => {
      await init('claude');
      installBeta(home);
      await init('claude');
      expect(openspecFiles()).toEqual([]);
    });

    it('points the first change at the beta skill', async () => {
      installBeta(home);
      await init('claude');
      const printed = vi.mocked(console.log).mock.calls.map((call) => call.join(' ')).join('\n');
      expect(printed).toContain(`/${BETA_SKILL_NAME}-propose`);
      expect(printed).not.toContain('/opsx:propose');
    });
  });
});
