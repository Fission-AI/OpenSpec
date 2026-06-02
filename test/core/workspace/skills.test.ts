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

async function withDefaultGlobalConfigAsync<T>(callback: () => Promise<T>): Promise<T> {
  const previousConfigHome = process.env.XDG_CONFIG_HOME;
  const configHome = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-skills-'));

  process.env.XDG_CONFIG_HOME = configHome;

  try {
    return await callback();
  } finally {
    if (previousConfigHome === undefined) {
      delete process.env.XDG_CONFIG_HOME;
    } else {
      process.env.XDG_CONFIG_HOME = previousConfigHome;
    }
    fs.rmSync(configHome, { recursive: true, force: true });
  }
}

function writeText(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
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
      '/repos/platform-workspace/.agents/skills'
    );
    expect(getWorkspaceSkillDirectory('D:\\repos\\platform-workspace', 'codex')).toBe(
      'D:\\repos\\platform-workspace\\.agents\\skills'
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

  it('removes managed legacy Codex workspace skills after setup generation', async () => {
    await withDefaultGlobalConfigAsync(async () => {
      const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-root-'));

      try {
        const managedLegacySkill = path.join(
          workspaceRoot,
          '.codex',
          'skills',
          'openspec-apply-change',
          'SKILL.md'
        );
        const unmanagedLegacySkill = path.join(
          workspaceRoot,
          '.codex',
          'skills',
          'custom-skill',
          'SKILL.md'
        );
        writeText(managedLegacySkill, 'legacy managed\n');
        writeText(unmanagedLegacySkill, 'legacy unmanaged\n');

        const report = await generateWorkspaceAgentSkills(workspaceRoot, ['codex']);

        expect(report.failed).toEqual([]);
        expect(report.migrated_legacy_codex_skill_count).toBe(1);
        expect(report.refreshed).toEqual([
          expect.objectContaining({
            tool_id: 'codex',
          }),
        ]);
        expect(
          fs.existsSync(
            path.join(workspaceRoot, '.agents', 'skills', 'openspec-apply-change', 'SKILL.md')
          )
        ).toBe(true);
        expect(fs.existsSync(path.dirname(managedLegacySkill))).toBe(false);
        expect(fs.existsSync(unmanagedLegacySkill)).toBe(true);
      } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
    });
  });

  it('migrates managed legacy Codex workspace skills during update and preserves unmanaged legacy content', async () => {
    await withDefaultGlobalConfigAsync(async () => {
      const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-root-'));

      try {
        const managedLegacySkill = path.join(
          workspaceRoot,
          '.codex',
          'skills',
          'openspec-apply-change',
          'SKILL.md'
        );
        const unmanagedLegacySkill = path.join(
          workspaceRoot,
          '.codex',
          'skills',
          'team-skill',
          'SKILL.md'
        );
        writeText(managedLegacySkill, 'legacy managed\n');
        writeText(unmanagedLegacySkill, 'legacy unmanaged\n');

        const report = await updateWorkspaceAgentSkills(
          workspaceRoot,
          ['codex'],
          { selected_agents: ['codex'] }
        );

        expect(report.failed).toEqual([]);
        expect(report.migrated_legacy_codex_skill_count).toBe(1);
        expect(report.refreshed).toEqual([
          expect.objectContaining({
            tool_id: 'codex',
          }),
        ]);
        expect(fs.existsSync(path.dirname(managedLegacySkill))).toBe(false);
        expect(fs.existsSync(unmanagedLegacySkill)).toBe(true);
      } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
    });
  });

  it('leaves legacy Codex workspace skills untouched when .agents generation fails', async () => {
    await withDefaultGlobalConfigAsync(async () => {
      const workspaceRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-workspace-root-'));

      try {
        const managedLegacySkill = path.join(
          workspaceRoot,
          '.codex',
          'skills',
          'openspec-apply-change',
          'SKILL.md'
        );
        const blockingGeneratedSkillDir = path.join(
          workspaceRoot,
          '.agents',
          'skills',
          'openspec-apply-change'
        );
        writeText(managedLegacySkill, 'legacy managed\n');
        writeText(blockingGeneratedSkillDir, 'blocks generated skill directory\n');

        const report = await updateWorkspaceAgentSkills(
          workspaceRoot,
          ['codex'],
          { selected_agents: ['codex'] }
        );

        expect(report.migrated_legacy_codex_skill_count).toBe(0);
        expect(report.failed).toEqual([
          expect.objectContaining({
            tool_id: 'codex',
            error: expect.stringContaining('openspec-apply-change'),
          }),
        ]);
        expect(fs.existsSync(managedLegacySkill)).toBe(true);
      } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
    });
  });
});
