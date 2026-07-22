import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InitCommand } from '../../src/core/init.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import type { GlobalConfig } from '../../src/core/global-config.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { randomUUID } from 'crypto';
import { CORE_WORKFLOWS, ALL_WORKFLOWS } from '../../src/core/profiles.js';
import { WORKFLOW_TO_SKILL_DIR } from '../../src/core/profile-sync-drift.js';
import { SKILL_NAMES, COMMAND_IDS } from '../../src/core/shared/tool-detection.js';
import { getSkillTemplates, getCommandTemplates } from '../../src/core/shared/skill-generation.js';
import { STORE_SELECTION_GUIDANCE } from '../../src/core/templates/workflows/store-selection.js';
import { getAtdTriageSkillTemplate, getOpsxAtdTriageCommandTemplate } from '../../src/core/templates/workflows/atd-triage.js';
import { getAtdContinueSkillTemplate, getOpsxAtdContinueCommandTemplate } from '../../src/core/templates/workflows/atd-continue.js';
import { getAtdApplySkillTemplate, getOpsxAtdApplyCommandTemplate } from '../../src/core/templates/workflows/atd-apply.js';
import { getAtdVerifySkillTemplate, getOpsxAtdVerifyCommandTemplate } from '../../src/core/templates/workflows/atd-verify.js';
import { getAtdCloseSkillTemplate, getOpsxAtdCloseCommandTemplate } from '../../src/core/templates/workflows/atd-close.js';

const mockState = {
  config: { featureFlags: {}, profile: 'core', delivery: 'both' } as GlobalConfig,
};

vi.mock('../../src/core/global-config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/core/global-config.js')>();
  return {
    ...actual,
    getGlobalConfig: () => ({ ...mockState.config }),
  };
});

const FACADES = [
  {
    id: 'atd-continue',
    dirName: 'atd-change-continue',
    position: 2,
    generic: 'openspec-continue-change',
    next: 'atd-change-apply',
    skill: getAtdContinueSkillTemplate(),
    command: getOpsxAtdContinueCommandTemplate(),
  },
  {
    id: 'atd-apply',
    dirName: 'atd-change-apply',
    position: 3,
    generic: 'openspec-apply-change',
    next: 'atd-change-verify',
    skill: getAtdApplySkillTemplate(),
    command: getOpsxAtdApplyCommandTemplate(),
  },
  {
    id: 'atd-verify',
    dirName: 'atd-change-verify',
    position: 4,
    generic: 'openspec-verify-change',
    next: 'atd-change-close',
    skill: getAtdVerifySkillTemplate(),
    command: getOpsxAtdVerifyCommandTemplate(),
  },
  {
    id: 'atd-close',
    dirName: 'atd-change-close',
    position: 5,
    generic: 'openspec-archive-change',
    next: 'atd-change-apply', // incomplete work routes back to apply
    skill: getAtdCloseSkillTemplate(),
    command: getOpsxAtdCloseCommandTemplate(),
  },
] as const;

/** Both delivery surfaces of a façade, which share one instruction body. */
function surfaces(f: (typeof FACADES)[number]): Array<[string, string]> {
  return [
    [`${f.id} skill`, f.skill.instructions],
    [`${f.id} command`, f.command.content],
  ];
}

describe('atd workflow façades', () => {
  describe('registry parity across enumerating surfaces', () => {
    it('both generation registries cover exactly ALL_WORKFLOWS', () => {
      const skillIds = getSkillTemplates().map((e) => e.workflowId).sort();
      const commandIds = getCommandTemplates().map((e) => e.id).sort();
      const all = [...ALL_WORKFLOWS].sort();
      expect(skillIds).toEqual(all);
      expect(commandIds).toEqual(all);
    });

    it('WORKFLOW_TO_SKILL_DIR keys match ALL_WORKFLOWS and dir names match the skill registry', () => {
      expect(Object.keys(WORKFLOW_TO_SKILL_DIR).sort()).toEqual([...ALL_WORKFLOWS].sort());
      for (const entry of getSkillTemplates()) {
        expect(WORKFLOW_TO_SKILL_DIR[entry.workflowId as keyof typeof WORKFLOW_TO_SKILL_DIR]).toBe(entry.dirName);
      }
    });

    it('SKILL_NAMES and COMMAND_IDS stay consistent with the generation registries', () => {
      expect([...SKILL_NAMES].sort()).toEqual(getSkillTemplates().map((e) => e.dirName).sort());
      expect([...COMMAND_IDS].sort()).toEqual([...ALL_WORKFLOWS].sort());
    });
  });

  describe('registration of the four façades', () => {
    it.each(FACADES.map((f) => [f.id, f] as const))('%s has exactly one skill and one command entry', (_id, f) => {
      const skillEntries = getSkillTemplates([f.id]);
      expect(skillEntries).toHaveLength(1);
      expect(skillEntries[0].dirName).toBe(f.dirName);
      expect(skillEntries[0].template.name).toBe(f.dirName);

      const commandEntries = getCommandTemplates([f.id]);
      expect(commandEntries).toHaveLength(1);
      expect(commandEntries[0].template.name).toBe(f.id);
    });

    it('all five ATD workflows are core; replaced generics are not', () => {
      expect([...CORE_WORKFLOWS]).toEqual(['atd-triage', 'atd-continue', 'atd-apply', 'atd-verify', 'atd-close', 'explore', 'update']);
    });
  });

  describe('journey positions, guard, and store guidance (both delivery paths)', () => {
    for (const f of FACADES) {
      it.each(surfaces(f))(`%s names its journey position and next step`, (_name, text) => {
        expect(text).toContain(`step ${f.position} of 5`);
        expect(text).toContain('triage → continue → apply → verify → close');
        expect(text).toContain(`\`${f.next}\``);
      });

      it.each(surfaces(f))(`%s carries the ATD schema guard naming its generic workflow`, (_name, text) => {
        expect(text).toContain('**ATD schema guard**');
        expect(text).toContain('`atd-sdlc` or `atd-sdlc-lite`');
        expect(text).toContain('do not modify artifacts, code, specs, tasks, or archive state');
        expect(text).toContain(`\`${f.generic}\` workflow`);
      });

      it.each(surfaces(f))(`%s embeds the shared store-selection guidance`, (_name, text) => {
        expect(text).toContain(STORE_SELECTION_GUIDANCE);
      });
    }
  });

  describe('composition of the generic machinery', () => {
    it.each(surfaces(FACADES[0]))('%s creates artifacts through the shared status/instructions flow', (_name, text) => {
      expect(text).toContain('openspec status --change "<name>" --json');
      expect(text).toContain('openspec instructions <artifact-id> --change "<name>" --json');
      expect(text).toContain('STOP after creating ONE artifact');
    });

    it.each(surfaces(FACADES[1]))('%s executes tracked tasks through the shared apply flow', (_name, text) => {
      expect(text).toContain('openspec instructions apply --change "<name>" --json');
      expect(text).toContain('Mark task complete in the tasks file');
      expect(text).toContain('`atd-change-continue`'); // blocked state routes to the ATD continue façade
      expect(text).toContain('atd-standards');
    });

    it.each(surfaces(FACADES[1]))('%s overrides with its own command, never the uninstalled generic', (_name, text) => {
      expect(text).toContain('/opsx:atd-apply <other>');
      expect(text).not.toContain('/opsx:apply <other>');
    });

    it.each(surfaces(FACADES[2]))('%s verifies through the shared three-dimension flow plus ATD additions', (_name, text) => {
      expect(text).toContain('Verify Completeness');
      expect(text).toContain('Verify Correctness');
      expect(text).toContain('Verify Coherence');
      expect(text).toContain('acceptance-criterion ID');
      expect(text).toContain('Standards conformance');
      expect(text).toContain('Closure readiness');
    });
  });

  describe('close hard gate and single-home closure', () => {
    it.each(surfaces(FACADES[3]))('%s gates on apply state all_done with no override', (_name, text) => {
      expect(text).toContain('openspec instructions apply --change "<name>" --json');
      expect(text).toContain('`state` is `"all_done"`');
      expect(text).toContain('There is no override');
      expect(text).toContain('Do not rely on any particular task-group heading');
      expect(text).toContain('`atd-change-apply`');
    });

    it.each(surfaces(FACADES[3]))('%s never performs closure work and drops the generic override', (_name, text) => {
      expect(text).toContain('never performs publication, Jira closure, or any other closure work itself');
      // Generic archive's warn-and-confirm override must not survive into close.
      expect(text).not.toContain("Don't block archive on warnings");
      expect(text).not.toContain('confirm user wants to proceed');
      expect(text).not.toContain('Prompt user for confirmation to continue');
    });

    it.each(surfaces(FACADES[3]))('%s retains the delta-spec sync assessment and failed-sync stop', (_name, text) => {
      expect(text).toContain('Assess delta spec sync state');
      expect(text).toContain('If the sync failed, or any capability does not match, report what differs and stop');
    });

    it.each(surfaces(FACADES[3]))('%s states the merge procedure inline instead of delegating to the uninstalled sync workflow', (_name, text) => {
      expect(text).not.toContain('openspec-sync-specs');
      expect(text).toContain('perform the merge yourself, inline and synchronously');
      expect(text).toContain('ADDED requirements');
      expect(text).toContain('RENAMED requirements');
    });
  });

  describe('triage hands off to atd-change-continue', () => {
    it.each([
      ['skill', getAtdTriageSkillTemplate().instructions],
      ['command', getOpsxAtdTriageCommandTemplate().content],
    ] as const)('%s names atd-change-continue as the next step', (_name, text) => {
      expect(text).toContain('`atd-change-continue`');
      expect(text).not.toContain('continue/apply');
    });

    it('keeps the atd-triage id and atd-change-triage directory unchanged', () => {
      expect(WORKFLOW_TO_SKILL_DIR['atd-triage']).toBe('atd-change-triage');
      expect(getAtdTriageSkillTemplate().name).toBe('atd-change-triage');
    });
  });

  describe('delivery of the façades through init (core profile)', () => {
    let testDir: string;

    beforeEach(async () => {
      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'both' };
      testDir = path.join(os.tmpdir(), `openspec-atd-facades-init-${randomUUID()}`);
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('skills-only delivery installs façade skills, no commands, no generic skills', async () => {
      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'skills' };
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

      for (const f of FACADES) {
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'skills', f.dirName, 'SKILL.md')
        )).toBe(true);
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'commands', 'opsx', `${f.id}.md`)
        )).toBe(false);
      }
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'openspec-apply-change', 'SKILL.md')
      )).toBe(false);

      // Skills-only delivery must not reference uninstalled /opsx:atd-* commands.
      const applySkill = await fs.readFile(
        path.join(testDir, '.claude', 'skills', 'atd-change-apply', 'SKILL.md'),
        'utf-8'
      );
      expect(applySkill).not.toContain('/opsx:atd-');
      expect(applySkill).toContain('/atd-change-apply <other>');
    });

    it('switching to commands-only delivery removes façade skill directories', async () => {
      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'both' };
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'atd-change-close', 'SKILL.md')
      )).toBe(true);

      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'commands' };
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

      for (const f of FACADES) {
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'skills', f.dirName, 'SKILL.md')
        )).toBe(false);
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'commands', 'opsx', `${f.id}.md`)
        )).toBe(true);
      }
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'atd-change-triage', 'SKILL.md')
      )).toBe(false);
    });

    it('commands-only delivery installs façade commands, no skills, no generic commands', async () => {
      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'commands' };
      await new InitCommand({ tools: 'claude', force: true }).execute(testDir);

      for (const f of FACADES) {
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'commands', 'opsx', `${f.id}.md`)
        )).toBe(true);
        expect(await FileSystemUtils.fileExists(
          path.join(testDir, '.claude', 'skills', f.dirName, 'SKILL.md')
        )).toBe(false);
      }
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'commands', 'opsx', 'archive.md')
      )).toBe(false);
    });
  });
});
