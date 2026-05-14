import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  getWorkspaceSkillDirectory,
  getWorkspaceSkillToolIds,
  hasWorkspaceSkillProfileDrift,
  parseWorkspaceSkillToolsValue,
} from '../../../src/core/workspace/skills.js';
import { CORE_WORKFLOWS } from '../../../src/core/profiles.js';

function withDefaultGlobalConfig<T>(callback: () => T): T {
  const previousConfigHome = process.env.XDG_CONFIG_HOME;
  const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-skills-'));

  process.env.XDG_CONFIG_HOME = configHome;

  try {
    return callback();
  } finally {
    if (previousConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = previousConfigHome;
    }
    fs.rmSync(configHome, { recursive: true, force: true });
  }
}

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

  it('builds workspace-root skill paths with the workspace path style', () => {
    expect(getWorkspaceSkillDirectory('/repos/platform-workspace', 'codex')).toBe(
      '/repos/platform-workspace/.codex/skills'
    );
    expect(getWorkspaceSkillDirectory('D:\\repos\\platform-workspace', 'codex')).toBe(
      'D:\\repos\\platform-workspace\\.codex\\skills'
    );
  });

  it('does not report profile drift when workflow IDs match in a different order', () => {
    withDefaultGlobalConfig(() => {
      expect(
        hasWorkspaceSkillProfileDrift({
          workspace_skills: {
            selected_agents: ['codex'],
            last_applied_profile: 'core',
            last_applied_delivery: 'both',
            last_applied_workflow_ids: [...CORE_WORKFLOWS].reverse(),
          },
        })
      ).toBe(false);
    });
  });
});
