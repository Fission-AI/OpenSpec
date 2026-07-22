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
import { getSkillTemplates, getCommandTemplates } from '../../src/core/shared/skill-generation.js';
import { getAtdTriageSkillTemplate, getOpsxAtdTriageCommandTemplate } from '../../src/core/templates/workflows/atd-triage.js';

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

describe('atd-triage workflow delivery', () => {
  it('is a core workflow with a skill-dir mapping', () => {
    expect(CORE_WORKFLOWS).toContain('atd-triage');
    expect(ALL_WORKFLOWS).toContain('atd-triage');
    expect(WORKFLOW_TO_SKILL_DIR['atd-triage']).toBe('atd-change-triage');
  });

  it('is registered in both generation registries', () => {
    const skillEntry = getSkillTemplates(['atd-triage']);
    expect(skillEntry).toHaveLength(1);
    expect(skillEntry[0].dirName).toBe('atd-change-triage');
    expect(skillEntry[0].template.name).toBe('atd-change-triage');

    const commandEntry = getCommandTemplates(['atd-triage']);
    expect(commandEntry).toHaveLength(1);
    expect(commandEntry[0].template.name).toBe('atd-triage');
  });

  describe('instruction content contracts (both delivery paths)', () => {
    const surfaces = [
      ['skill', getAtdTriageSkillTemplate().instructions],
      ['command', getOpsxAtdTriageCommandTemplate().content],
    ] as const;

    it.each(surfaces)('%s carries the sidecar rules', (_name, text) => {
      expect(text).toContain('--schema <chosen> --json');
      expect(text).toContain('`change.path`');
      expect(text).toContain('NEVER assume the');
      expect(text).toContain('NEVER create or modify `ticket.md`');
      expect(text).toContain('triage.md');
    });

    it.each(surfaces)('%s enforces monotonic confirmation and uncertainty→full', (_name, text) => {
      expect(text).toContain('full is mandatory');
      expect(text).toContain('decline and quote the failed or uncertain conditions');
      expect(text).toContain('Uncertainty is never lite');
      expect(text).toContain('strengthen');
    });

    it.each(surfaces)('%s carries risk-not-linecount and the documentation rule', (_name, text) => {
      expect(text).toContain('Risk, never line count');
      expect(text).toContain('authorization condition');
      expect(text).toContain('SQL WHERE clause');
      expect(text).toContain('financial calculation');
      expect(text).toContain('localized corrections');
      expect(text).toContain('stay lite-eligible');
      expect(text).toContain('No new functional or technical documentation');
    });

    it.each(surfaces)('%s requires the bounded preflight', (_name, text) => {
      expect(text).toContain('Bounded codebase preflight');
      expect(text).toContain('owning component');
      expect(text).toContain('entry points and call path');
      expect(text).toContain('lighter than an analysis document');
    });

    it.each(surfaces)('%s documents the escalation append format', (_name, text) => {
      expect(text).toContain('## Escalations');
      expect(text).toContain('trigger, previous schema, new schema, reason');
    });
  });

  describe('init installs triage by default (core profile, no selection)', () => {
    let testDir: string;

    beforeEach(async () => {
      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'both' };
      testDir = path.join(os.tmpdir(), `openspec-atd-triage-init-${randomUUID()}`);
      await fs.mkdir(testDir, { recursive: true });
    });

    afterEach(async () => {
      await fs.rm(testDir, { recursive: true, force: true });
    });

    it('creates skill and command artifacts for the claude tool', async () => {
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'atd-change-triage', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'commands', 'opsx', 'atd-triage.md')
      )).toBe(true);
    });

    it('respects skills-only delivery (skill yes, command no)', async () => {
      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'skills' };
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'atd-change-triage', 'SKILL.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'commands', 'opsx', 'atd-triage.md')
      )).toBe(false);
    });

    it('respects commands-only delivery (command yes, skill no)', async () => {
      mockState.config = { featureFlags: {}, profile: 'core', delivery: 'commands' };
      const initCommand = new InitCommand({ tools: 'claude', force: true });
      await initCommand.execute(testDir);

      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'commands', 'opsx', 'atd-triage.md')
      )).toBe(true);
      expect(await FileSystemUtils.fileExists(
        path.join(testDir, '.claude', 'skills', 'atd-change-triage', 'SKILL.md')
      )).toBe(false);
    });
  });

  describe('routing record handling in both schemas', () => {
    const flat = (s: string) => s.replace(/\s+/g, ' ');

    it('both ticket instructions fold the triage routing record when present', async () => {
      const { resolveSchema } = await import('../../src/core/artifact-graph/resolver.js');
      for (const schemaName of ['atd-sdlc', 'atd-sdlc-lite']) {
        const schema = resolveSchema(schemaName);
        const ticket = flat(schema.artifacts.find(a => a.id === 'ticket')?.instruction ?? '');
        expect(ticket, schemaName).toContain('routing record (recommendation, condition evaluations, confirmed choice)');
      }
    });

    it('full schema proceeds normally without a sidecar; lite treats it as a mandatory gate', async () => {
      const { resolveSchema } = await import('../../src/core/artifact-graph/resolver.js');
      const fullTicket = flat(resolveSchema('atd-sdlc').artifacts.find(a => a.id === 'ticket')?.instruction ?? '');
      const liteTicket = flat(resolveSchema('atd-sdlc-lite').artifacts.find(a => a.id === 'ticket')?.instruction ?? '');

      expect(fullTicket).toContain('proceed normally');
      expect(liteTicket).toContain('self-triage at ticket intake');
      expect(liteTicket).toContain('never allowed');
      // semantic gate: structurally complete but failing sidecars escalate
      expect(liteTicket).toContain('no FAIL, no UNCERTAIN');
      expect(liteTicket).toContain('recommendation is `atd-sdlc-lite`');
      expect(liteTicket).toContain('confirmed choice is `atd-sdlc-lite`');
    });
  });

  describe('sidecar is not an artifact output (graph-level)', () => {
    it('no artifact in either schema generates triage.md', async () => {
      const { resolveSchema } = await import('../../src/core/artifact-graph/resolver.js');
      for (const schemaName of ['atd-sdlc', 'atd-sdlc-lite']) {
        const schema = resolveSchema(schemaName);
        for (const artifact of schema.artifacts) {
          expect(artifact.generates, `${schemaName}/${artifact.id}`).not.toContain('triage');
        }
      }
    });

    it('writing triage.md leaves the ticket artifact pending in both schemas', async () => {
      const { resolveSchema } = await import('../../src/core/artifact-graph/resolver.js');
      const { ArtifactGraph } = await import('../../src/core/artifact-graph/graph.js');
      const { detectCompleted } = await import('../../src/core/artifact-graph/state.js');

      for (const schemaName of ['atd-sdlc', 'atd-sdlc-lite']) {
        const changeDir = path.join(os.tmpdir(), `atd-triage-sidecar-${randomUUID()}`);
        await fs.mkdir(changeDir, { recursive: true });
        try {
          await fs.writeFile(path.join(changeDir, '.openspec.yaml'), `schema: ${schemaName}\n`);
          await fs.writeFile(path.join(changeDir, 'triage.md'), '# Triage: abc-1');

          const graph = ArtifactGraph.fromSchema(resolveSchema(schemaName));
          const completed = detectCompleted(graph, changeDir);
          expect(completed.has('ticket'), schemaName).toBe(false);
          expect(graph.getNextArtifacts(completed), schemaName).toEqual(['ticket']);
        } finally {
          await fs.rm(changeDir, { recursive: true, force: true });
        }
      }
    });
  });
});
