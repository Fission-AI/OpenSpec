import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AI_TOOLS } from '../../../src/core/config.js';
import { resolveHomeSharedSkillsDir, resolveHomeSkillsReach } from '../../../src/core/shared/home-skill-paths.js';

const home = path.join(path.sep, 'home', 'me');
const reach = (toolId: string, env: NodeJS.ProcessEnv = {}) => resolveHomeSkillsReach(toolId, { home, env });

describe('home skills folders', () => {
  it('puts the one real copy in ~/.agents/skills', () => {
    expect(resolveHomeSharedSkillsDir(home)).toBe(path.join(home, '.agents', 'skills'));
  });

  it('knows how a global install reaches every tool with project skills', () => {
    // Tools the skills CLI has no home folder for: set up per project.
    const none = ['atomcode', 'dsh', 'costrict', 'devin', 'easycode', 'gigacode', 'gsd', 'oh-my-pi', 'codeassistant', 'veai'];
    for (const tool of AI_TOOLS.filter((t) => t.skillsDir)) {
      expect(reach(tool.value).kind === 'none', tool.value).toBe(none.includes(tool.value));
    }
  });

  it('matches the skills CLI 1.8.1 home folders', () => {
    const linked = (toolId: string) => {
      const r = reach(toolId);
      return r.kind === 'link' ? path.relative(home, r.dir).split(path.sep).join('/') : r.kind;
    };
    expect(linked('claude')).toBe('.claude/skills');
    expect(linked('antigravity')).toBe('.gemini/config/skills');
    expect(linked('auggie')).toBe('.augment/skills');
    expect(linked('crush')).toBe('.config/crush/skills');
    expect(linked('devin')).toBe('none');
    expect(linked('forgecode')).toBe('.forge/skills');
    expect(linked('roocode')).toBe('.roo/skills');
    expect(linked('codeartsagent')).toBe('.codeartsdoer/skills');
    for (const shared of ['codex', 'cursor', 'gemini', 'github-copilot', 'opencode', 'agents']) {
      expect(linked(shared)).toBe('shared');
    }
  });

  it('follows the same environment overrides as the skills CLI', () => {
    const r = reach('claude', { CLAUDE_CONFIG_DIR: '/work/claude' });
    expect(r).toEqual({ kind: 'link', dir: path.join('/work/claude', 'skills'), base: '/work/claude' });
    // The skills CLI uses ~/.config/crush whatever XDG_CONFIG_HOME says.
    const crush = reach('crush', { XDG_CONFIG_HOME: '/xdg' });
    expect(crush.kind === 'link' && crush.dir).toBe(path.join(home, '.config', 'crush', 'skills'));
    const hermes = reach('hermes', { HERMES_HOME: '  ' });
    expect(hermes.kind === 'link' && hermes.dir).toBe(path.join(home, '.hermes', 'skills'));
  });

  it('never resolves a tool folder against the current folder', () => {
    const dir = (toolId: string, env: NodeJS.ProcessEnv) => {
      const r = reach(toolId, env);
      return r.kind === 'link' ? r.dir : r.kind;
    };
    expect(dir('claude', { CLAUDE_CONFIG_DIR: 'claude-rel' })).toBe(path.join(home, '.claude', 'skills'));
    expect(dir('claude', { CLAUDE_CONFIG_DIR: '~/.claude-work' })).toBe(path.join(home, '.claude-work', 'skills'));
    expect(dir('grok', { GROK_HOME: './g' })).toBe(path.join(home, '.grok', 'skills'));
  });
});
