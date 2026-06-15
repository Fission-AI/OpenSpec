import { describe, expect, it } from 'vitest';

import { AI_TOOLS } from '../../../src/core/config.js';
import {
  getSkillCapableToolIds,
  resolveToolSkillsDir,
  toolSupportsSkills,
} from '../../../src/core/shared/skill-paths.js';

describe('skill-paths', () => {
  it('treats tools with project-local or global skill targets as skill-capable', () => {
    const toolIds = getSkillCapableToolIds();
    expect(toolIds).toContain('claude');
    expect(toolIds).toContain('minimax-code');
    expect(toolIds).not.toContain('agents');
  });

  it('resolves project-local tools under the project root with the Agent Skills suffix', () => {
    const claude = AI_TOOLS.find((tool) => tool.value === 'claude');
    expect(claude && toolSupportsSkills(claude)).toBe(true);
    if (!claude || !toolSupportsSkills(claude)) return;

    expect(resolveToolSkillsDir('/repo/app', claude)).toBe('/repo/app/.claude/skills');
  });

  it('resolves MiniMax Code to a user-home global skills target', () => {
    const minimax = AI_TOOLS.find((tool) => tool.value === 'minimax-code');
    expect(minimax && toolSupportsSkills(minimax)).toBe(true);
    if (!minimax || !toolSupportsSkills(minimax)) return;

    expect(resolveToolSkillsDir('/repo/app', minimax, { homeDir: '/home/alex' })).toBe(
      '/home/alex/.minimax/skills'
    );
  });

  it('resolves MiniMax Code with Windows-style user homes', () => {
    const minimax = AI_TOOLS.find((tool) => tool.value === 'minimax-code');
    expect(minimax && toolSupportsSkills(minimax)).toBe(true);
    if (!minimax || !toolSupportsSkills(minimax)) return;

    expect(resolveToolSkillsDir('D:\\repos\\app', minimax, { homeDir: 'C:\\Users\\Alex' })).toBe(
      'C:\\Users\\Alex\\.minimax\\skills'
    );
  });
});

