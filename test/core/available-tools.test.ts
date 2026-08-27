import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { getAvailableTools } from '../../src/core/available-tools.js';

describe('available-tools', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-'));
    vi.stubEnv('HOME', path.join(testDir, 'home'));
    vi.stubEnv('USERPROFILE', path.join(testDir, 'home'));
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('getAvailableTools', () => {
    it('should return empty array when no tool directories exist', () => {
      const tools = getAvailableTools(testDir);
      expect(tools).toEqual([]);
    });

    it('should detect a single tool directory', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools).toHaveLength(1);
      expect(tools[0].value).toBe('claude');
      expect(tools[0].name).toBe('Claude Code');
      expect(tools[0].skillsDir).toBe('.claude');
    });

    it('should detect MiniMax Code only from managed skills in the user-home target', async () => {
      const globalSkill = path.join(
        testDir,
        'home',
        '.minimax',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(globalSkill), { recursive: true });
      await fs.writeFile(globalSkill, 'content');

      expect(getAvailableTools(testDir).map((tool) => tool.value)).toContain('minimax-code');

      await fs.rm(path.join(testDir, 'home'), { recursive: true, force: true });
      const localSkill = path.join(
        testDir,
        '.minimax',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(localSkill), { recursive: true });
      await fs.writeFile(localSkill, 'content');

      expect(getAvailableTools(testDir).map((tool) => tool.value)).not.toContain('minimax-code');
    });

    it('should detect multiple tool directories', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.windsurf'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('claude');
      expect(toolValues).toContain('cursor');
      // Windsurf was rebranded to Devin Desktop, so .windsurf detects as devin
      expect(toolValues).toContain('devin');
      expect(tools).toHaveLength(3);
    });

    it('should detect Devin Desktop when .devin directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.devin'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('devin');

      const devinTool = tools.find((t) => t.value === 'devin');
      expect(devinTool).toBeDefined();
      expect(devinTool?.name).toBe('Devin Desktop (formerly Windsurf)');
      expect(devinTool?.skillsDir).toBe('.devin');
    });

    it('should detect Devin Desktop from the legacy .windsurf directory', async () => {
      // The rebrand moved the config dir; a project set up before it still has
      // only .windsurf/, and that user must still be recognized.
      await fs.mkdir(path.join(testDir, '.windsurf'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).toContain('devin');
      expect(tools.find((t) => t.value === 'devin')?.skillsDir).toBe('.devin');
    });

    it('should not detect Devin Desktop when neither .devin nor .windsurf exists', async () => {
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).not.toContain('devin');
    });

    it('should ignore files that are not directories', async () => {
      // Create a file named .claude instead of a directory
      await fs.writeFile(path.join(testDir, '.claude'), 'not a directory');

      const tools = getAvailableTools(testDir);
      expect(tools).toEqual([]);
    });

    it('should return tools that support project-local or global skills', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).toContain('claude');
      expect(tools.every((tool) => tool.skillsDir || tool.globalSkillsDir)).toBe(true);
    });

    it('should detect the shared agents target from .agents/skills', async () => {
      await fs.mkdir(path.join(testDir, '.agents', 'skills'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('agents');
      expect(toolValues).not.toContain('codex');
      expect(toolValues).not.toContain('zed');
      expect(toolValues).not.toContain('antigravity');
    });

    it('should detect Antigravity from its legacy .agent directory', async () => {
      await fs.mkdir(path.join(testDir, '.agent'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((tool) => tool.value)).toEqual(['antigravity']);
      expect(tools[0].skillsDir).toBe('.agents');
    });

    it('should detect Antigravity from .agents/workflows', async () => {
      await fs.mkdir(path.join(testDir, '.agents', 'workflows'), { recursive: true });

      expect(getAvailableTools(testDir).map((tool) => tool.value)).toEqual(['antigravity']);
    });

    it('should retain Antigravity when another tool owns the shared skills root', async () => {
      await fs.mkdir(path.join(testDir, '.agents', 'skills'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.agents', 'workflows'), { recursive: true });
      await fs.writeFile(
        path.join(testDir, '.agents', 'skills', '.openspec-target'),
        'codex\n'
      );

      expect(getAvailableTools(testDir).map((tool) => tool.value)).toEqual([
        'antigravity',
        'codex',
      ]);
    });

    it('should detect Zed Agent from its project configuration directory', async () => {
      await fs.mkdir(path.join(testDir, '.zed'), { recursive: true });

      expect(getAvailableTools(testDir).map((tool) => tool.value)).toEqual(['zed']);
    });

    it('should not detect the shared agents target from a bare .agents directory', async () => {
      // Frameworks use `.agents/` for more than skills (rules, subagent definitions).
      // The bare root therefore says nothing about whether this project keeps agent
      // skills in the shared location, so it must not select the target.
      await fs.mkdir(path.join(testDir, '.agents', 'some-other-framework'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).not.toContain('agents');
      expect(tools.map((t) => t.value)).not.toContain('codex');
    });

    it('should detect Codex from its legacy skill directory', async () => {
      await fs.mkdir(path.join(testDir, '.codex', 'skills'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((tool) => tool.value)).toEqual(['codex']);
      expect(tools[0].skillsDir).toBe('.agents');
    });

    it('should use the shared-root marker to distinguish Codex from agents', async () => {
      await fs.mkdir(path.join(testDir, '.agents', 'skills'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.agents', 'skills', '.openspec-target'), 'codex\n');

      const tools = getAvailableTools(testDir);
      expect(tools.map((tool) => tool.value)).toContain('codex');
      expect(tools.map((tool) => tool.value)).not.toContain('agents');
      expect(tools.map((tool) => tool.value)).not.toContain('zed');
    });

    it('should use the shared-root marker to detect a configured Zed Agent target', async () => {
      await fs.mkdir(path.join(testDir, '.agents', 'skills'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.agents', 'skills', '.openspec-target'), 'zed\n');

      expect(getAvailableTools(testDir).map((tool) => tool.value)).toEqual(['zed']);
    });

    it('should preserve a global tool while reconciling a shared project root', async () => {
      const sharedSkills = path.join(testDir, '.agents', 'skills');
      const globalSkill = path.join(
        testDir,
        'home',
        '.minimax',
        'skills',
        'openspec-explore',
        'SKILL.md'
      );
      await fs.mkdir(sharedSkills, { recursive: true });
      await fs.writeFile(path.join(sharedSkills, '.openspec-target'), 'agents\n');
      await fs.mkdir(path.dirname(globalSkill), { recursive: true });
      await fs.writeFile(globalSkill, 'content');

      expect(getAvailableTools(testDir).map((tool) => tool.value)).toEqual([
        'minimax-code',
        'agents',
      ]);
    });

    it('should infer an unmarked canonical Codex tree from its invocation syntax', async () => {
      const skillFile = path.join(
        testDir,
        '.agents',
        'skills',
        'openspec-propose',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(skillFile), { recursive: true });
      await fs.writeFile(skillFile, 'Next: $openspec-apply-change');

      const tools = getAvailableTools(testDir);
      expect(tools.map((tool) => tool.value)).toEqual(['codex']);
    });

    it.each(['', 'unknown'])(
      'should preserve generic content when the shared marker is %j',
      async (marker) => {
        const skillsDir = path.join(testDir, '.agents', 'skills');
        const skillFile = path.join(skillsDir, 'openspec-propose', 'SKILL.md');
        await fs.mkdir(path.dirname(skillFile), { recursive: true });
        await fs.writeFile(skillFile, 'Next: /openspec-apply-change');
        await fs.writeFile(path.join(skillsDir, '.openspec-target'), `${marker}\n`);

        const tools = getAvailableTools(testDir);
        expect(tools.map((tool) => tool.value)).toEqual(['agents']);
      }
    );

    it('should consolidate an unmarked generic tree when legacy Codex skills also exist', async () => {
      const agentsSkill = path.join(
        testDir,
        '.agents',
        'skills',
        'openspec-propose',
        'SKILL.md'
      );
      const codexSkill = path.join(
        testDir,
        '.codex',
        'skills',
        'openspec-propose',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(agentsSkill), { recursive: true });
      await fs.mkdir(path.dirname(codexSkill), { recursive: true });
      await fs.writeFile(agentsSkill, 'Next: /openspec-apply-change');
      await fs.writeFile(codexSkill, 'Next: $openspec-apply-change');

      const tools = getAvailableTools(testDir);
      expect(tools.map((tool) => tool.value)).toEqual(['codex']);
    });

    it('should detect valid legacy Codex skills beside an escaped managed link', async () => {
      const outsideDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-legacy-outside-'));
      try {
        const legacySkills = path.join(testDir, '.codex', 'skills');
        await fs.mkdir(path.join(legacySkills, 'openspec-propose'), { recursive: true });
        await fs.writeFile(
          path.join(legacySkills, 'openspec-propose', 'SKILL.md'),
          'Next: $openspec-apply-change'
        );
        await fs.mkdir(outsideDir, { recursive: true });
        await fs.symlink(
          outsideDir,
          path.join(legacySkills, 'openspec-explore'),
          process.platform === 'win32' ? 'junction' : 'dir'
        );

        const tools = getAvailableTools(testDir);
        expect(tools.map((tool) => tool.value)).toEqual(['codex']);
      } finally {
        await fs.rm(outsideDir, { recursive: true, force: true });
      }
    });

    it('should not let an unknown legacy skill supersede the shared agents target', async () => {
      await fs.mkdir(path.join(testDir, '.agents', 'skills'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.agents', 'skills', '.openspec-target'), 'agents\n');
      const customSkill = path.join(
        testDir,
        '.codex',
        'skills',
        'openspec-personal',
        'SKILL.md'
      );
      await fs.mkdir(path.dirname(customSkill), { recursive: true });
      await fs.writeFile(customSkill, 'user skill');

      const tools = getAvailableTools(testDir);
      expect(tools.map((tool) => tool.value)).toContain('agents');
      expect(tools.map((tool) => tool.value)).not.toContain('codex');
    });

    it('should return full AIToolOption objects', async () => {
      await fs.mkdir(path.join(testDir, '.cursor'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools).toHaveLength(1);
      expect(tools[0]).toMatchObject({
        name: 'Cursor',
        value: 'cursor',
        available: true,
        skillsDir: '.cursor',
      });
    });

    it('should handle paths with spaces', async () => {
      const spacedDir = path.join(testDir, 'path with spaces');
      await fs.mkdir(spacedDir, { recursive: true });
      await fs.mkdir(path.join(spacedDir, '.claude'), { recursive: true });

      const tools = getAvailableTools(spacedDir);
      expect(tools).toHaveLength(1);
      expect(tools[0].value).toBe('claude');
    });

    it('should not detect GitHub Copilot from bare .github directory', async () => {
      // .github/ exists in virtually every GitHub repo (for workflows, issue templates, etc.)
      // A bare .github/ directory should NOT trigger Copilot detection
      await fs.mkdir(path.join(testDir, '.github'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).not.toContain('github-copilot');
    });

    it('should detect GitHub Copilot when copilot-instructions.md exists', async () => {
      await fs.mkdir(path.join(testDir, '.github'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.github', 'copilot-instructions.md'), '');

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('github-copilot');
    });

    it('should detect GitHub Copilot when .github/prompts directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.github', 'prompts'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('github-copilot');
    });

    it('should detect GitHub Copilot when .github/agents directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.github', 'agents'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('github-copilot');
    });

    it('should detect GitHub Copilot when .github/skills directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.github', 'skills'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('github-copilot');
    });

    it('should detect GitHub Copilot when copilot-setup-steps.yml exists', async () => {
      await fs.mkdir(path.join(testDir, '.github', 'workflows'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.github', 'workflows', 'copilot-setup-steps.yml'), '');

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('github-copilot');
    });

    it('should detect Hermes Agent when HERMES.md exists', async () => {
      await fs.writeFile(path.join(testDir, 'HERMES.md'), '');

      const tools = getAvailableTools(testDir);
      const hermesTool = tools.find((t) => t.value === 'hermes');

      expect(hermesTool).toMatchObject({
        name: 'Hermes Agent',
        skillsDir: '.hermes',
      });
    });

    it('should detect Hermes Agent when .hermes.md exists', async () => {
      await fs.writeFile(path.join(testDir, '.hermes.md'), '');

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('hermes');
    });

    it('should detect Hermes Agent when .hermes directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.hermes'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('hermes');
    });

    it('should not detect Hermes Agent from plain CONTEXT.md', async () => {
      await fs.writeFile(path.join(testDir, 'CONTEXT.md'), '');

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).not.toContain('hermes');
    });

    it('should still use skillsDir detection for tools without detectionPaths', async () => {
      // Claude Code has no detectionPaths, so .claude/ directory should still work
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('claude');
    });

    it('should detect Command Code when .commandcode directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.commandcode'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('command-code');

      const commandCodeTool = tools.find((t) => t.value === 'command-code');
      expect(commandCodeTool).toBeDefined();
      expect(commandCodeTool?.name).toBe('Command Code');
      expect(commandCodeTool?.skillsDir).toBe('.commandcode');
    });

    it('should detect Mistral Vibe when .vibe directory exists', async () => {
      // Mistral Vibe uses skillsDir: '.vibe' without detectionPaths
      // This test ensures path semantics do not drift for Vibe skill detection
      await fs.mkdir(path.join(testDir, '.vibe'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('vibe');

      const vibeTool = tools.find((t) => t.value === 'vibe');
      expect(vibeTool).toBeDefined();
      expect(vibeTool?.name).toBe('Mistral Vibe');
      expect(vibeTool?.skillsDir).toBe('.vibe');
    });

    it('should detect CodeArts when .codeartsdoer directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.codeartsdoer'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const codeArtsTool = tools.find((t) => t.value === 'codeartsagent');
      expect(codeArtsTool).toMatchObject({
        name: 'CodeArts',
        value: 'codeartsagent',
        available: true,
        skillsDir: '.codeartsdoer',
      });
    });

    it('should not detect CodeArts when .codeartsdoer directory does not exist', () => {
      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).not.toContain('codeartsagent');
    });

    it('should detect ZCode when .zcode directory exists', async () => {
      await fs.mkdir(path.join(testDir, '.zcode'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const zcode = tools.find((t) => t.value === 'zcode');
      expect(zcode).toBeDefined();
      expect(zcode?.name).toBe('ZCode');
      expect(zcode?.skillsDir).toBe('.zcode');
    });

    it('should not detect ZCode from a bare .agents directory', async () => {
      // .agents is a generic directory used by many agent frameworks; a bare
      // .agents must not trigger ZCode detection (mirrors the Copilot bare-.github rule).
      await fs.mkdir(path.join(testDir, '.agents'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).not.toContain('zcode');
    });

    it('should detect ZCode from .zcode even when .agents is also present', async () => {
      // A co-located .agents must not suppress real ZCode detection via .zcode
      await fs.mkdir(path.join(testDir, '.zcode'), { recursive: true });
      await fs.mkdir(path.join(testDir, '.agents'), { recursive: true });

      const zcodeTools = getAvailableTools(testDir).filter((t) => t.value === 'zcode');
      expect(zcodeTools).toHaveLength(1);
    });

    it('should not detect ZCode when .zcode is absent', async () => {
      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).not.toContain('zcode');
    });

    it('should detect Oh My Pi when .omp directory exists', async () => {
      // Oh My Pi uses skillsDir: '.omp' without detectionPaths
      // This test ensures path semantics do not drift for Oh My Pi skill detection
      await fs.mkdir(path.join(testDir, '.omp'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const toolValues = tools.map((t) => t.value);
      expect(toolValues).toContain('oh-my-pi');

      const ohMyPiTool = tools.find((t) => t.value === 'oh-my-pi');
      expect(ohMyPiTool).toBeDefined();
      expect(ohMyPiTool?.name).toBe('Oh My Pi');
      expect(ohMyPiTool?.skillsDir).toBe('.omp');
    });

    it('should detect DeepSeek Harness when .dsh/skills exists', async () => {
      // dsh discovers skills from <project>/.dsh/skills, its rank-100 project root.
      await fs.mkdir(path.join(testDir, '.dsh', 'skills'), { recursive: true });

      const tools = getAvailableTools(testDir);
      const dsh = tools.find((t) => t.value === 'dsh');
      expect(dsh).toMatchObject({
        name: 'DeepSeek Harness',
        skillsDir: '.dsh',
        detectionPaths: ['.dsh/skills', '.dsh'],
      });
    });

    it('should detect DeepSeek Harness from a bare .dsh project directory', async () => {
      // .dsh is DeepSeek Harness's project config root, so its presence is a
      // meaningful signal even before any skill directory exists.
      await fs.mkdir(path.join(testDir, '.dsh'), { recursive: true });

      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).toContain('dsh');
    });

    it('should not detect DeepSeek Harness when no .dsh signal exists', () => {
      const tools = getAvailableTools(testDir);
      expect(tools.map((t) => t.value)).not.toContain('dsh');
    });
  });
});
