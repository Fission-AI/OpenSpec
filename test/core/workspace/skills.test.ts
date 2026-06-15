import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  generateWorkspaceAgentSkills,
  getWorkspaceSkillDirectory,
  getWorkspaceSkillToolIds,
  hasWorkspaceSkillProfileDrift,
  parseWorkspaceSkillToolsValue,
  updateWorkspaceAgentSkills,
} from '../../../src/core/workspace/skills.js';
import { saveGlobalConfig } from '../../../src/core/global-config.js';
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
    expect(parseWorkspaceSkillToolsValue('minimax-code')).toEqual(['minimax-code']);
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

  it('builds MiniMax Code workspace skill paths from the user home', () => {
    const previousHome = process.env.HOME;
    const previousUserProfile = process.env.USERPROFILE;
    const fakeHome = path.join(os.tmpdir(), 'openspec-home-alex');
    process.env.HOME = fakeHome;
    process.env.USERPROFILE = fakeHome;

    try {
      expect(getWorkspaceSkillDirectory('/repos/platform-workspace', 'minimax-code')).toBe(
        path.join(fakeHome, '.minimax', 'skills')
      );
    } finally {
      if (previousHome === undefined) {
        delete process.env.HOME;
      } else {
        process.env.HOME = previousHome;
      }
      if (previousUserProfile === undefined) {
        delete process.env.USERPROFILE;
      } else {
        process.env.USERPROFILE = previousUserProfile;
      }
    }
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

  it('generates MiniMax Code workspace skills in the user-home global target', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-root-'));
    const homeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-minimax-home-'));
    const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-config-'));
    const previousEnv = { ...process.env };

    process.env.HOME = homeRoot;
    process.env.USERPROFILE = homeRoot;
    process.env.XDG_CONFIG_HOME = configHome;

    try {
      saveGlobalConfig({ featureFlags: {}, profile: 'core', delivery: 'commands' });

      const report = await generateWorkspaceAgentSkills(workspaceRoot, ['minimax-code']);
      const skillFile = path.join(homeRoot, '.minimax', 'skills', 'openspec-explore', 'SKILL.md');

      expect(report.generated).toHaveLength(1);
      expect(report.generated[0].skills_path).toBe(path.join(homeRoot, '.minimax', 'skills'));
      expect(fs.existsSync(skillFile)).toBe(true);
      expect(fs.existsSync(path.join(workspaceRoot, '.minimax'))).toBe(false);
      expect(fs.existsSync(path.join(workspaceRoot, '.mavis'))).toBe(false);
    } finally {
      process.env = previousEnv;
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      fs.rmSync(homeRoot, { recursive: true, force: true });
      fs.rmSync(configHome, { recursive: true, force: true });
    }
  });

  it('removes MiniMax Code openspec workflow skill directories by name during workspace update', async () => {
    const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-root-'));
    const homeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-minimax-home-'));
    const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-config-'));
    const previousEnv = { ...process.env };

    process.env.HOME = homeRoot;
    process.env.USERPROFILE = homeRoot;
    process.env.XDG_CONFIG_HOME = configHome;

    try {
      saveGlobalConfig({
        featureFlags: {},
        profile: 'custom',
        delivery: 'both',
        workflows: ['explore'],
      });

      const skillsDir = path.join(homeRoot, '.minimax', 'skills');
      const extraSkill = path.join(skillsDir, 'openspec-new-change', 'SKILL.md');
      const customSkill = path.join(skillsDir, 'my-custom-skill', 'SKILL.md');
      await fs.promises.mkdir(path.dirname(extraSkill), { recursive: true });
      await fs.promises.writeFile(extraSkill, 'user edited without generated metadata');
      await fs.promises.mkdir(path.dirname(customSkill), { recursive: true });
      await fs.promises.writeFile(customSkill, 'custom content');

      const report = await updateWorkspaceAgentSkills(
        workspaceRoot,
        ['minimax-code'],
        {
          selected_agents: ['minimax-code'],
          last_applied_profile: 'custom',
          last_applied_delivery: 'both',
          last_applied_workflow_ids: ['explore', 'new'],
        }
      );

      expect(report.refreshed).toHaveLength(1);
      expect(fs.existsSync(extraSkill)).toBe(false);
      expect(fs.existsSync(customSkill)).toBe(true);
      expect(fs.existsSync(path.join(workspaceRoot, '.minimax'))).toBe(false);
      expect(fs.existsSync(path.join(workspaceRoot, '.mavis'))).toBe(false);
    } finally {
      process.env = previousEnv;
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      fs.rmSync(homeRoot, { recursive: true, force: true });
      fs.rmSync(configHome, { recursive: true, force: true });
    }
  });
});
