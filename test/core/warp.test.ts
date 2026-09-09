import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { InitCommand } from '../../src/core/init.js';
import { UpdateCommand } from '../../src/core/update.js';
import { AI_TOOLS } from '../../src/core/config.js';
import { getAvailableTools } from '../../src/core/available-tools.js';
import { resolveCommandSurfaceCapability } from '../../src/core/command-surface.js';
import { CommandAdapterRegistry } from '../../src/core/command-generation/registry.js';
import type { GlobalConfig } from '../../src/core/global-config.js';
import { LEGACY_GLOBAL_SLASH_COMMAND_PATHS } from '../../src/core/legacy-cleanup.js';
import { ALL_WORKFLOWS, CORE_WORKFLOWS } from '../../src/core/profiles.js';
import { getSkillTemplates } from '../../src/core/shared/skill-generation.js';
import { getConfiguredTools, getToolSkillStatus } from '../../src/core/shared/tool-detection.js';

const mockState = { config: {} as GlobalConfig };

vi.mock('../../src/core/global-config.js', async (importOriginal) => ({
  ...await importOriginal<typeof import('../../src/core/global-config.js')>(),
  getGlobalConfig: () => ({ ...mockState.config }),
  saveGlobalConfig: vi.fn(),
}));

describe('Warp integration', () => {
  let tempDir: string;
  let projectPath: string;

  const skillPath = (name: string) => path.join(projectPath, '.warp', 'skills', name, 'SKILL.md');
  const installedSkills = async () =>
    (await fs.readdir(path.join(projectPath, '.warp', 'skills'))).sort();

  async function writeProjectFile(relativePath: string, content: string) {
    const filePath = path.join(projectPath, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, content);
  }

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-warp-'));
    projectPath = path.join(tempDir, 'project');
    await fs.mkdir(projectPath);
    mockState.config = { profile: 'core', delivery: 'both' };
    vi.stubEnv('XDG_CONFIG_HOME', path.join(tempDir, 'config'));
    vi.stubEnv('XDG_DATA_HOME', path.join(tempDir, 'data'));
    vi.stubEnv('USERPROFILE', path.join(tempDir, 'home'));
    vi.spyOn(os, 'homedir').mockReturnValue(path.join(tempDir, 'home'));
    vi.spyOn(LEGACY_GLOBAL_SLASH_COMMAND_PATHS.codex, 'resolvePromptDir')
      .mockReturnValue(path.join(tempDir, 'codex-prompts'));
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('registers Warp as a skill-invocable tool without a command adapter', () => {
    expect(AI_TOOLS.find((tool) => tool.value === 'warp')).toMatchObject({
      name: 'Warp', skillsDir: '.warp', available: true,
    });
    expect(resolveCommandSurfaceCapability('warp')).toBe('skills-invocable');
    expect(CommandAdapterRegistry.get('warp')).toBeUndefined();
  });

  it.each(['both', 'skills', 'commands'] as const)(
    'initializes core skills with %s delivery and advertises invocable skill names',
    async (delivery) => {
      mockState.config.delivery = delivery;
      await new InitCommand({ tools: 'warp', force: true }).execute(projectPath);

      expect(await installedSkills()).toEqual(
        getSkillTemplates(CORE_WORKFLOWS).map(({ dirName }) => dirName).sort()
      );
      for (const { dirName } of getSkillTemplates(CORE_WORKFLOWS)) {
        const content = await fs.readFile(skillPath(dirName), 'utf8');
        const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
        expect(frontmatter).not.toBeNull();
        expect(parse(frontmatter![1])).toMatchObject({ name: dirName, description: expect.any(String) });
        expect(content).not.toMatch(/\/opsx[:\-]|\$openspec-/);
      }
      expect(await fs.readFile(skillPath('openspec-propose'), 'utf8')).toContain('/openspec-apply-change');
      expect(await fs.readdir(path.join(projectPath, '.warp'))).toEqual(['skills']);
      expect((await fs.readdir(projectPath)).sort()).toEqual(['.warp', 'openspec']);
      expect(getConfiguredTools(projectPath)).toEqual(['warp']);
      expect(getToolSkillStatus(projectPath, 'warp').configured).toBe(true);
      const output = vi.mocked(console.log).mock.calls.flat().join('\n');
      expect(output).toContain('/openspec-propose');
      expect(output).not.toContain('/opsx:');
    }
  );

  it('installs the full workflow set and rewrites onboarding references', async () => {
    mockState.config = { profile: 'custom', workflows: [...ALL_WORKFLOWS], delivery: 'both' };
    await new InitCommand({ tools: 'warp', force: true }).execute(projectPath);

    expect(await installedSkills()).toEqual(getSkillTemplates().map(({ dirName }) => dirName).sort());
    const onboarding = await fs.readFile(skillPath('openspec-onboard'), 'utf8');
    expect(onboarding).toContain('/openspec-new-change');
    expect(onboarding).toContain('/openspec-apply-change');
    expect(onboarding).not.toMatch(/\/opsx[:\-]|\$openspec-/);
  });

  it('refreshes and prunes skills for a custom commands-only profile without touching other files', async () => {
    mockState.config = { profile: 'custom', workflows: [...ALL_WORKFLOWS], delivery: 'both' };
    const preserved = {
      'WARP.md': '# My Warp instructions\n',
      'AGENTS.md': '# Shared instructions\n',
      '.warp/settings.json': '{"theme":"dark"}\n',
      '.warp/skills/my-skill/SKILL.md': '# My skill\n',
      '.claude/settings.json': '{"permissions":{}}\n',
      '.agents/skills/my-skill/SKILL.md': '# Shared custom skill\n',
    };
    for (const [filePath, content] of Object.entries(preserved)) {
      await writeProjectFile(filePath, content);
    }
    await new InitCommand({ tools: 'warp', force: true }).execute(projectPath);
    for (const [filePath, content] of Object.entries(preserved)) {
      expect(await fs.readFile(path.join(projectPath, filePath), 'utf8')).toBe(content);
    }
    await fs.writeFile(skillPath('openspec-apply-change'), '# stale content\n');
    mockState.config = { profile: 'custom', workflows: ['apply'], delivery: 'commands' };

    await new UpdateCommand({ force: true }).execute(projectPath);

    expect(await installedSkills()).toEqual(['my-skill', 'openspec-apply-change']);
    expect(await fs.readFile(skillPath('openspec-apply-change'), 'utf8')).toContain('name: openspec-apply-change');
    expect((await fs.readdir(path.join(projectPath, '.warp'))).sort()).toEqual(['settings.json', 'skills']);
    for (const [filePath, content] of Object.entries(preserved)) {
      expect(await fs.readFile(path.join(projectPath, filePath), 'utf8')).toBe(content);
    }
    expect(await fs.readdir(path.join(projectPath, '.claude'))).toEqual(['settings.json']);
    expect(await fs.readdir(path.join(projectPath, '.agents', 'skills'))).toEqual(['my-skill']);
    expect(getConfiguredTools(projectPath)).toContain('warp');
  });

  it('refreshes outdated skills without force and stays current after commands-only reinitialization', async () => {
    await new InitCommand({ tools: 'warp', force: true }).execute(projectPath);
    const original = await fs.readFile(skillPath('openspec-explore'), 'utf8');
    const outdated = original.replace(/generatedBy: "[^"]+"/, 'generatedBy: "0.0.1"');
    expect(outdated).not.toBe(original);
    await fs.writeFile(skillPath('openspec-explore'), outdated);

    await new UpdateCommand().execute(projectPath);
    expect(await fs.readFile(skillPath('openspec-explore'), 'utf8')).toBe(original);

    mockState.config.delivery = 'commands';
    await new InitCommand({ tools: 'warp', force: true }).execute(projectPath);
    expect(await installedSkills()).toEqual(
      getSkillTemplates(CORE_WORKFLOWS).map(({ dirName }) => dirName).sort()
    );
    vi.mocked(console.log).mockClear();

    await new UpdateCommand().execute(projectPath);

    expect(vi.mocked(console.log).mock.calls.flat().join('\n')).toContain('up to date');
    expect(await fs.readFile(skillPath('openspec-explore'), 'utf8')).toBe(original);
  });

  it.each(['.warp', 'WARP.md'])('detects %s as Warp without treating it as configured', async (signal) => {
    if (signal === '.warp') await fs.mkdir(path.join(projectPath, signal));
    else await writeProjectFile(signal, '# Warp rules\n');

    expect(getAvailableTools(projectPath).map((tool) => tool.value)).toContain('warp');
    expect(getConfiguredTools(projectPath)).not.toContain('warp');
  });

  it('does not infer Warp from shared or other tool instructions', async () => {
    await writeProjectFile('AGENTS.md', '# Shared rules\n');
    await writeProjectFile('.agents/skills/openspec-propose/SKILL.md', '# Use /openspec-propose\n');
    await writeProjectFile('.claude/settings.json', '{}\n');

    expect(getAvailableTools(projectPath).map((tool) => tool.value)).not.toContain('warp');
    expect(getConfiguredTools(projectPath)).not.toContain('warp');
  });
});
