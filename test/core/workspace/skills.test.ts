import { describe, expect, it } from 'vitest';

import {
  getWorkspaceSkillToolIds,
  parseWorkspaceSkillToolsValue,
} from '../../../src/core/workspace/skills.js';

describe('workspace skill helpers', () => {
  it('parses workspace --tools values using the skill-capable tool set', () => {
    expect(parseWorkspaceSkillToolsValue('all')).toEqual(getWorkspaceSkillToolIds());
    expect(parseWorkspaceSkillToolsValue('none')).toEqual([]);
    expect(parseWorkspaceSkillToolsValue('Codex, claude,codex')).toEqual(['codex', 'claude']);
  });

  it('rejects invalid or mixed workspace --tools values', () => {
    expect(() => parseWorkspaceSkillToolsValue('')).toThrow(/requires a value/);
    expect(() => parseWorkspaceSkillToolsValue('all,codex')).toThrow(/Cannot combine/);
    expect(() => parseWorkspaceSkillToolsValue('codex,missing')).toThrow(/missing/);
  });
});
