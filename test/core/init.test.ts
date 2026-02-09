import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { InitCommand } from '../../src/core/init.js';

const DONE = '__done__';

type SelectionQueue = string[][];

let selectionQueue: SelectionQueue = [];

const mockPrompt = vi.fn(async () => {
  if (selectionQueue.length === 0) {
    throw new Error('No queued selections provided to init prompt.');
  }
  return selectionQueue.shift() ?? [];
});

function queueSelections(...values: string[]) {
  let current: string[] = [];
  values.forEach((value) => {
    if (value === DONE) {
      selectionQueue.push(current);
      current = [];
    } else {
      current.push(value);
    }
  });

  if (current.length > 0) {
    selectionQueue.push(current);
  }
}

describe('InitCommand', () => {
  let testDir: string;
  let initCommand: InitCommand;
  let prevCodexHome: string | undefined;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `lightspec-init-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    selectionQueue = [];
    mockPrompt.mockReset();
    initCommand = new InitCommand({ prompt: mockPrompt, skillLocation: 'project' });

    // Route Codex global directory into the test sandbox
    prevCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = path.join(testDir, '.codex');

    // Mock console.log to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    if (prevCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = prevCodexHome;
  });

  describe('execute', () => {
    it('should create LightSpec directory structure', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const lightspecPath = path.join(testDir, 'lightspec');
      expect(await directoryExists(lightspecPath)).toBe(true);
      expect(await directoryExists(path.join(lightspecPath, 'specs'))).toBe(
        true
      );
      expect(await directoryExists(path.join(lightspecPath, 'changes'))).toBe(
        true
      );
      expect(
        await directoryExists(path.join(lightspecPath, 'changes', 'archive'))
      ).toBe(true);
    });

    it('should create AGENTS.md without project.md', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const lightspecPath = path.join(testDir, 'lightspec');
      expect(await fileExists(path.join(lightspecPath, 'AGENTS.md'))).toBe(true);
      expect(await fileExists(path.join(lightspecPath, 'project.md'))).toBe(
        false
      );

      const agentsContent = await fs.readFile(
        path.join(lightspecPath, 'AGENTS.md'),
        'utf-8'
      );
      expect(agentsContent).toContain('LightSpec Instructions');
    });

    it('should create CLAUDE.md when Claude Code is selected', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      expect(await fileExists(claudePath)).toBe(true);

      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toContain('<!-- LIGHTSPEC:START -->');
      expect(content).toContain("lightspec-proposal");
      expect(content).toContain('lightspec update');
      expect(content).toContain('<!-- LIGHTSPEC:END -->');
    });

    it('should create CLAUDE.md when .claude folder already exists', async () => {
      await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
      await fs.writeFile(path.join(testDir, '.claude', 'README.md'), 'existing');

      queueSelections('claude', DONE);
      await initCommand.execute(testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      expect(await fileExists(claudePath)).toBe(true);

      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toContain('<!-- LIGHTSPEC:START -->');
      expect(content).toContain('lightspec-proposal');
      expect(content).toContain('<!-- LIGHTSPEC:END -->');
    });

    it('should update existing CLAUDE.md with markers', async () => {
      queueSelections('claude', DONE);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      const existingContent =
        '# My Project Instructions\nCustom instructions here';
      await fs.writeFile(claudePath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(claudePath, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain("lightspec-proposal");
      expect(updatedContent).toContain('lightspec update');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should create CLINE.md when Cline is selected', async () => {
      queueSelections('cline', DONE);

      await initCommand.execute(testDir);

      const clinePath = path.join(testDir, 'CLINE.md');
      expect(await fileExists(clinePath)).toBe(true);

      const content = await fs.readFile(clinePath, 'utf-8');
      expect(content).toContain('<!-- LIGHTSPEC:START -->');
      expect(content).toContain("lightspec-proposal");
      expect(content).toContain('lightspec update');
      expect(content).toContain('<!-- LIGHTSPEC:END -->');
    });

    it('should update existing CLINE.md with markers', async () => {
      queueSelections('cline', DONE);

      const clinePath = path.join(testDir, 'CLINE.md');
      const existingContent =
        '# My Cline Rules\nCustom Cline instructions here';
      await fs.writeFile(clinePath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(clinePath, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain("lightspec-proposal");
      expect(updatedContent).toContain('lightspec update');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
      expect(updatedContent).toContain('Custom Cline instructions here');
    });

    it('should create Windsurf workflows when Windsurf is selected', async () => {
      queueSelections('windsurf', DONE);

      await initCommand.execute(testDir);

      const wsProposal = path.join(
        testDir,
        '.windsurf/skills/lightspec-proposal/SKILL.md'
      );
      const wsApply = path.join(
        testDir,
        '.windsurf/skills/lightspec-apply/SKILL.md'
      );
      const wsArchive = path.join(
        testDir,
        '.windsurf/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(wsProposal)).toBe(true);
      expect(await fileExists(wsApply)).toBe(true);
      expect(await fileExists(wsArchive)).toBe(true);

      const proposalContent = await fs.readFile(wsProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(wsApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(wsArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(archiveContent).toContain('Run `lightspec archive <id> --yes`');
    });

    it('should create Antigravity workflows when Antigravity is selected', async () => {
      queueSelections('antigravity', DONE);

      await initCommand.execute(testDir);

      const agProposal = path.join(
        testDir,
        '.antigravity/skills/lightspec-proposal/SKILL.md'
      );
      const agApply = path.join(
        testDir,
        '.antigravity/skills/lightspec-apply/SKILL.md'
      );
      const agArchive = path.join(
        testDir,
        '.antigravity/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(agProposal)).toBe(true);
      expect(await fileExists(agApply)).toBe(true);
      expect(await fileExists(agArchive)).toBe(true);

      const proposalContent = await fs.readFile(agProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');
      expect(proposalContent).not.toContain('auto_execution_mode');

      const applyContent = await fs.readFile(agApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(applyContent).toContain('Work through tasks sequentially');
      expect(applyContent).not.toContain('auto_execution_mode');

      const archiveContent = await fs.readFile(agArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(archiveContent).toContain('Run `lightspec archive <id> --yes`');
      expect(archiveContent).not.toContain('auto_execution_mode');
    });

    it('should always create AGENTS.md in project root', async () => {
      queueSelections(DONE);

      await initCommand.execute(testDir);

      const rootAgentsPath = path.join(testDir, 'AGENTS.md');
      expect(await fileExists(rootAgentsPath)).toBe(true);

      const content = await fs.readFile(rootAgentsPath, 'utf-8');
      expect(content).toContain('<!-- LIGHTSPEC:START -->');
      expect(content).toContain("lightspec-proposal");
      expect(content).toContain('lightspec update');
      expect(content).toContain('<!-- LIGHTSPEC:END -->');

      const claudeExists = await fileExists(path.join(testDir, 'CLAUDE.md'));
      expect(claudeExists).toBe(false);
    });

    it('should create Claude skill files with templates', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const claudeProposal = path.join(
        testDir,
        '.claude/skills/lightspec-proposal/SKILL.md'
      );
      const claudeApply = path.join(
        testDir,
        '.claude/skills/lightspec-apply/SKILL.md'
      );
      const claudeArchive = path.join(
        testDir,
        '.claude/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(claudeProposal)).toBe(true);
      expect(await fileExists(claudeApply)).toBe(true);
      expect(await fileExists(claudeArchive)).toBe(true);

      const proposalContent = await fs.readFile(claudeProposal, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(claudeApply, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(claudeArchive, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('lightspec archive <id>');
      expect(archiveContent).toContain(
        '`--skip-specs` only for tooling-only work'
      );
    });

    it('should not delete legacy files when creating skills', async () => {
      queueSelections('claude', DONE);

      const legacyProposal = path.join(
        testDir,
        '.claude/commands/lightspec/proposal.md'
      );
      await fs.mkdir(path.dirname(legacyProposal), { recursive: true });
      await fs.writeFile(legacyProposal, 'legacy command content');

      await initCommand.execute(testDir);

      const newSkill = path.join(
        testDir,
        '.claude/skills/lightspec-proposal/SKILL.md'
      );

      expect(await fileExists(newSkill)).toBe(true);
      expect(await fileExists(legacyProposal)).toBe(true);
    });

    it('should create Cursor skill files with templates', async () => {
      queueSelections('cursor', DONE);

      await initCommand.execute(testDir);

      const cursorProposal = path.join(
        testDir,
        '.cursor/skills/lightspec-proposal/SKILL.md'
      );
      const cursorApply = path.join(
        testDir,
        '.cursor/skills/lightspec-apply/SKILL.md'
      );
      const cursorArchive = path.join(
        testDir,
        '.cursor/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(cursorProposal)).toBe(true);
      expect(await fileExists(cursorApply)).toBe(true);
      expect(await fileExists(cursorArchive)).toBe(true);

      const proposalContent = await fs.readFile(cursorProposal, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:END -->');

      const applyContent = await fs.readFile(cursorApply, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(cursorArchive, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('lightspec list --specs');
    });

    it('should create Gemini CLI TOML files when selected', async () => {
      queueSelections('gemini', DONE);

      await initCommand.execute(testDir);

      const geminiProposal = path.join(
        testDir,
        '.gemini/skills/lightspec-proposal/SKILL.md'
      );
      const geminiApply = path.join(
        testDir,
        '.gemini/skills/lightspec-apply/SKILL.md'
      );
      const geminiArchive = path.join(
        testDir,
        '.gemini/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(geminiProposal)).toBe(true);
      expect(await fileExists(geminiApply)).toBe(true);
      expect(await fileExists(geminiArchive)).toBe(true);

      const proposalContent = await fs.readFile(geminiProposal, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:END -->');

      const applyContent = await fs.readFile(geminiApply, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(geminiArchive, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id>');
    });

    it('should update existing Gemini CLI TOML files with refreshed content', async () => {
      queueSelections('gemini', DONE);

      await initCommand.execute(testDir);

      const geminiProposal = path.join(
        testDir,
        '.gemini/skills/lightspec-proposal/SKILL.md'
      );

      // Modify the file to simulate user customization
      const originalContent = await fs.readFile(geminiProposal, 'utf-8');
      const modifiedContent = originalContent.replace(
        '<!-- LIGHTSPEC:START -->',
        '<!-- LIGHTSPEC:START -->\nCustom instruction added by user\n'
      );
      await fs.writeFile(geminiProposal, modifiedContent);

      // Run init again to test update/refresh path
      queueSelections('gemini', DONE);
      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(geminiProposal, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain('**Guardrails**');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
      expect(updatedContent).not.toContain('Custom instruction added by user');
    });

    it('should create IFlow CLI skill files with templates', async () => {
      queueSelections('iflow', DONE);
      await initCommand.execute(testDir);

      const iflowProposal = path.join(
        testDir,
        '.iflow/skills/lightspec-proposal/SKILL.md'
      );
      const iflowApply = path.join(
        testDir,
        '.iflow/skills/lightspec-apply/SKILL.md'
      );
      const iflowArchive = path.join(
        testDir,
        '.iflow/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(iflowProposal)).toBe(true);
      expect(await fileExists(iflowApply)).toBe(true);
      expect(await fileExists(iflowArchive)).toBe(true);

      const proposalContent = await fs.readFile(iflowProposal, 'utf-8');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:END -->');

      const applyContent = await fs.readFile(iflowApply, 'utf-8');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(iflowArchive, 'utf-8');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id>');
    });

    it('should update existing IFLOW.md with markers', async () => {
      queueSelections('iflow', DONE);

      const iflowPath = path.join(testDir, 'IFLOW.md');
      const existingContent = '# My IFLOW Instructions\nCustom instructions here';
      await fs.writeFile(iflowPath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(iflowPath, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain("lightspec-proposal");
      expect(updatedContent).toContain('lightspec update');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should create OpenCode skill files with templates', async () => {
      queueSelections('opencode', DONE);

      await initCommand.execute(testDir);

      const openCodeProposal = path.join(
        testDir,
        '.opencode/skills/lightspec-proposal/SKILL.md'
      );
      const openCodeApply = path.join(
        testDir,
        '.opencode/skills/lightspec-apply/SKILL.md'
      );
      const openCodeArchive = path.join(
        testDir,
        '.opencode/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(openCodeProposal)).toBe(true);
      expect(await fileExists(openCodeApply)).toBe(true);
      expect(await fileExists(openCodeArchive)).toBe(true);

      const proposalContent = await fs.readFile(openCodeProposal, 'utf-8');
      expect(proposalContent).not.toContain('agent:');
      expect(proposalContent).toContain(
        'description: Scaffold a new LightSpec change and validate strictly.'
      );
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');

      const applyContent = await fs.readFile(openCodeApply, 'utf-8');
      expect(applyContent).not.toContain('agent:');
      expect(applyContent).toContain(
        'description: Implement an approved LightSpec change and keep tasks in sync.'
      );
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(openCodeArchive, 'utf-8');
      expect(archiveContent).not.toContain('agent:');
      expect(archiveContent).toContain(
        'description: Archive a deployed LightSpec change and update specs.'
      );
      expect(archiveContent).toContain('lightspec list --specs');
    });

    it('should create Qwen configuration and skill files with templates', async () => {
      queueSelections('qwen', DONE);

      await initCommand.execute(testDir);

      const qwenConfigPath = path.join(testDir, 'QWEN.md');
      const proposalPath = path.join(
        testDir,
        '.qwen/skills/lightspec-proposal/SKILL.md'
      );
      const applyPath = path.join(
        testDir,
        '.qwen/skills/lightspec-apply/SKILL.md'
      );
      const archivePath = path.join(
        testDir,
        '.qwen/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(qwenConfigPath)).toBe(true);
      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const qwenConfigContent = await fs.readFile(qwenConfigPath, 'utf-8');
      expect(qwenConfigContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(qwenConfigContent).toContain("lightspec-proposal");
      expect(qwenConfigContent).toContain('<!-- LIGHTSPEC:END -->');

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id>');
    });

    it('should update existing QWEN.md with markers', async () => {
      queueSelections('qwen', DONE);

      const qwenPath = path.join(testDir, 'QWEN.md');
      const existingContent = '# My Qwen Instructions\nCustom instructions here';
      await fs.writeFile(qwenPath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(qwenPath, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain("lightspec-proposal");
      expect(updatedContent).toContain('lightspec update');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should create Cline workflow files with templates', async () => {
      queueSelections('cline', DONE);

      await initCommand.execute(testDir);

      const clineProposal = path.join(
        testDir,
        '.cline/skills/lightspec-proposal/SKILL.md'
      );
      const clineApply = path.join(
        testDir,
        '.cline/skills/lightspec-apply/SKILL.md'
      );
      const clineArchive = path.join(
        testDir,
        '.cline/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(clineProposal)).toBe(true);
      expect(await fileExists(clineApply)).toBe(true);
      expect(await fileExists(clineArchive)).toBe(true);

      const proposalContent = await fs.readFile(clineProposal, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(clineApply, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(clineArchive, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id>');
    });

    it('should create Factory skill files with templates', async () => {
      queueSelections('factory', DONE);

      await initCommand.execute(testDir);

      const factoryProposal = path.join(
        testDir,
        '.factory/skills/lightspec-proposal/SKILL.md'
      );
      const factoryApply = path.join(
        testDir,
        '.factory/skills/lightspec-apply/SKILL.md'
      );
      const factoryArchive = path.join(
        testDir,
        '.factory/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(factoryProposal)).toBe(true);
      expect(await fileExists(factoryApply)).toBe(true);
      expect(await fileExists(factoryArchive)).toBe(true);

      const proposalContent = await fs.readFile(factoryProposal, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');

      const applyContent = await fs.readFile(factoryApply, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(factoryArchive, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should create Codex prompts with templates and placeholders', async () => {
      queueSelections('codex', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.codex/skills/lightspec-proposal/SKILL.md'
      );
      const applyPath = path.join(
        testDir,
        '.codex/skills/lightspec-apply/SKILL.md'
      );
      const archivePath = path.join(
        testDir,
        '.codex/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should create Mistral Vibe skills under .vibe', async () => {
      queueSelections('mistral-vibe', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.vibe/skills/lightspec-proposal/SKILL.md'
      );
      const applyPath = path.join(
        testDir,
        '.vibe/skills/lightspec-apply/SKILL.md'
      );
      const archivePath = path.join(
        testDir,
        '.vibe/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should create Kilo Code workflows with templates', async () => {
      queueSelections('kilocode', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.kilocode/skills/lightspec-proposal/SKILL.md'
      );
      const applyPath = path.join(
        testDir,
        '.kilocode/skills/lightspec-apply/SKILL.md'
      );
      const archivePath = path.join(
        testDir,
        '.kilocode/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');
      expect(proposalContent).toContain('name: lightspec-proposal');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('Work through tasks sequentially');
      expect(applyContent).toContain('name: lightspec-apply');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('lightspec list --specs');
      expect(archiveContent).toContain('name: lightspec-archive');
    });

    it('should create GitHub Copilot prompt files with templates', async () => {
      queueSelections('github-copilot', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.github/copilot/skills/lightspec-proposal/SKILL.md'
      );
      const applyPath = path.join(
        testDir,
        '.github/copilot/skills/lightspec-apply/SKILL.md'
      );
      const archivePath = path.join(
        testDir,
        '.github/copilot/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should add new tool when LightSpec already exists', async () => {
      queueSelections('claude', DONE, 'cursor', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const cursorProposal = path.join(
        testDir,
        '.cursor/skills/lightspec-proposal/SKILL.md'
      );
      expect(await fileExists(cursorProposal)).toBe(true);
    });

    it('should allow extend mode with no additional native tools', async () => {
      queueSelections('claude', DONE, DONE);
      await initCommand.execute(testDir);
      await expect(initCommand.execute(testDir)).resolves.toBeUndefined();
    });

    it('should recreate deleted lightspec/AGENTS.md in extend mode', async () => {
      await testFileRecreationInExtendMode(
        testDir,
        initCommand,
        'lightspec/AGENTS.md',
        'LightSpec Instructions'
      );
    });

    it('should not recreate project.md in extend mode (removed feature)', async () => {
      queueSelections('claude', DONE, DONE);

      // First init
      await initCommand.execute(testDir);

      // Verify project.md is NOT created
      const projectPath = path.join(testDir, 'lightspec', 'project.md');
      expect(await fileExists(projectPath)).toBe(false);

      // Run init again in extend mode
      await initCommand.execute(testDir);

      // Verify project.md is still NOT created
      expect(await fileExists(projectPath)).toBe(false);
    });

    it('should preserve existing template files in extend mode', async () => {
      queueSelections('claude', DONE, DONE);

      // First init
      await initCommand.execute(testDir);

      const agentsPath = path.join(testDir, 'lightspec', 'AGENTS.md');
      const customContent = '# My Custom AGENTS Content\nDo not overwrite this!';

      // Modify the file with custom content
      await fs.writeFile(agentsPath, customContent);

      // Run init again - should NOT overwrite
      await initCommand.execute(testDir);

      const content = await fs.readFile(agentsPath, 'utf-8');
      expect(content).toBe(customContent);
      expect(content).not.toContain('LightSpec Instructions');
    });

    it('should handle non-existent target directory', async () => {
      queueSelections('claude', DONE);

      const newDir = path.join(testDir, 'new-project');
      await initCommand.execute(newDir);

      const lightspecPath = path.join(newDir, 'lightspec');
      expect(await directoryExists(lightspecPath)).toBe(true);
    });

    it('should display success message with selected tool name', async () => {
      queueSelections('claude', DONE);
      const logSpy = vi.spyOn(console, 'log');

      await initCommand.execute(testDir);

      const calls = logSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('Run these skills in Claude Code');
    });

    it('should reference AGENTS compatible assistants in success message', async () => {
      queueSelections(DONE);
      const logSpy = vi.spyOn(console, 'log');

      await initCommand.execute(testDir);

      const calls = logSpy.mock.calls.flat().join('\n');
      expect(calls).toContain(
        'Run these skills in your AGENTS.md-compatible assistant'
      );
    });
  });

  describe('AI tool selection', () => {
    it('should prompt for AI tool selection', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          baseMessage: expect.stringContaining(
            'Which natively supported AI tools do you use?'
          ),
        })
      );
    });

    it('should handle different AI tool selections', async () => {
      // For now, only Claude is available, but test the structure
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      // When other tools are added, we'd test their specific configurations here
      const claudePath = path.join(testDir, 'CLAUDE.md');
      expect(await fileExists(claudePath)).toBe(true);
    });

    it('should mark existing tools as already configured during extend mode', async () => {
      queueSelections('claude', DONE, 'cursor', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const claudeChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'claude'
      );
      expect(claudeChoice.configured).toBe(true);
    });

    it('should mark Qwen as already configured during extend mode', async () => {
      queueSelections('qwen', DONE, 'qwen', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const qwenChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'qwen'
      );
      expect(qwenChoice.configured).toBe(true);
    });

    it('should preselect Kilo Code when workflows already exist', async () => {
      queueSelections('kilocode', DONE, 'kilocode', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const preselected = secondRunArgs.initialSelected ?? [];
      expect(preselected).toContain('kilocode');
    });

    it('should mark Windsurf as already configured during extend mode', async () => {
      queueSelections('windsurf', DONE, 'windsurf', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const wsChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'windsurf'
      );
      expect(wsChoice.configured).toBe(true);
    });

    it('should mark Antigravity as already configured during extend mode', async () => {
      queueSelections('antigravity', DONE, 'antigravity', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const antigravityChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'antigravity'
      );
      expect(antigravityChoice.configured).toBe(true);
    });

    it('should mark Codex as already configured during extend mode', async () => {
      queueSelections('codex', DONE, 'codex', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const codexChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'codex'
      );
      expect(codexChoice.configured).toBe(true);
    });

    it('should mark Mistral Vibe as already configured during extend mode', async () => {
      queueSelections('mistral-vibe', DONE, 'mistral-vibe', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const mistralVibeChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'mistral-vibe'
      );
      expect(mistralVibeChoice.configured).toBe(true);
    });

    it('should mark Factory Droid as already configured during extend mode', async () => {
      queueSelections('factory', DONE, 'factory', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const factoryChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'factory'
      );
      expect(factoryChoice.configured).toBe(true);
    });

    it('should mark GitHub Copilot as already configured during extend mode', async () => {
      queueSelections('github-copilot', DONE, 'github-copilot', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const githubCopilotChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'github-copilot'
      );
      expect(githubCopilotChoice.configured).toBe(true);
    });

    it('should create Amazon Q Developer prompt files with templates', async () => {
      queueSelections('amazon-q', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.amazonq/skills/lightspec-proposal/SKILL.md'
      );
      const applyPath = path.join(
        testDir,
        '.amazonq/skills/lightspec-apply/SKILL.md'
      );
      const archivePath = path.join(
        testDir,
        '.amazonq/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('<!-- LIGHTSPEC:START -->');
    });

    it('should mark Amazon Q Developer as already configured during extend mode', async () => {
      queueSelections('amazon-q', DONE, 'amazon-q', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const amazonQChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'amazon-q'
      );
      expect(amazonQChoice.configured).toBe(true);
    });

    it('should create Auggie skill files with templates', async () => {
      queueSelections('auggie', DONE);

      await initCommand.execute(testDir);

      const auggieProposal = path.join(
        testDir,
        '.auggie/skills/lightspec-proposal/SKILL.md'
      );
      const auggieApply = path.join(
        testDir,
        '.auggie/skills/lightspec-apply/SKILL.md'
      );
      const auggieArchive = path.join(
        testDir,
        '.auggie/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(auggieProposal)).toBe(true);
      expect(await fileExists(auggieApply)).toBe(true);
      expect(await fileExists(auggieArchive)).toBe(true);

      const proposalContent = await fs.readFile(auggieProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(auggieApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(auggieArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should mark Auggie as already configured during extend mode', async () => {
      queueSelections('auggie', DONE, 'auggie', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const auggieChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'auggie'
      );
      expect(auggieChoice.configured).toBe(true);
    });

    it('should create CodeBuddy skill files with templates', async () => {
      queueSelections('codebuddy', DONE);

      await initCommand.execute(testDir);

      const codeBuddyProposal = path.join(
        testDir,
        '.codebuddy/skills/lightspec-proposal/SKILL.md'
      );
      const codeBuddyApply = path.join(
        testDir,
        '.codebuddy/skills/lightspec-apply/SKILL.md'
      );
      const codeBuddyArchive = path.join(
        testDir,
        '.codebuddy/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(codeBuddyProposal)).toBe(true);
      expect(await fileExists(codeBuddyApply)).toBe(true);
      expect(await fileExists(codeBuddyArchive)).toBe(true);

      const proposalContent = await fs.readFile(codeBuddyProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(codeBuddyApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(codeBuddyArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should mark CodeBuddy as already configured during extend mode', async () => {
      queueSelections('codebuddy', DONE, 'codebuddy', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const codeBuddyChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'codebuddy'
      );
      expect(codeBuddyChoice.configured).toBe(true);
    });

    it('should create Continue skill files with templates', async () => {
      queueSelections('continue', DONE);

      await initCommand.execute(testDir);

      const continueProposal = path.join(
        testDir,
        '.continue/skills/lightspec-proposal/SKILL.md'
      );
      const continueApply = path.join(
        testDir,
        '.continue/skills/lightspec-apply/SKILL.md'
      );
      const continueArchive = path.join(
        testDir,
        '.continue/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(continueProposal)).toBe(true);
      expect(await fileExists(continueApply)).toBe(true);
      expect(await fileExists(continueArchive)).toBe(true);

      const proposalContent = await fs.readFile(continueProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');

      const applyContent = await fs.readFile(continueApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(continueArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should mark Continue as already configured during extend mode', async () => {
      queueSelections('continue', DONE, 'continue', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const continueChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'continue'
      );
      expect(continueChoice.configured).toBe(true);
    });

    it('should create CODEBUDDY.md when CodeBuddy is selected', async () => {
      queueSelections('codebuddy', DONE);

      await initCommand.execute(testDir);

      const codeBuddyPath = path.join(testDir, 'CODEBUDDY.md');
      expect(await fileExists(codeBuddyPath)).toBe(true);

      const content = await fs.readFile(codeBuddyPath, 'utf-8');
      expect(content).toContain('<!-- LIGHTSPEC:START -->');
      expect(content).toContain("lightspec-proposal");
      expect(content).toContain('lightspec update');
      expect(content).toContain('<!-- LIGHTSPEC:END -->');
    });

    it('should update existing CODEBUDDY.md with markers', async () => {
      queueSelections('codebuddy', DONE);

      const codeBuddyPath = path.join(testDir, 'CODEBUDDY.md');
      const existingContent =
        '# My CodeBuddy Instructions\nCustom instructions here';
      await fs.writeFile(codeBuddyPath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(codeBuddyPath, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain("lightspec-proposal");
      expect(updatedContent).toContain('lightspec update');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should create Crush skill files with templates', async () => {
      queueSelections('crush', DONE);

      await initCommand.execute(testDir);

      const crushProposal = path.join(
        testDir,
        '.crush/skills/lightspec-proposal/SKILL.md'
      );
      const crushApply = path.join(
        testDir,
        '.crush/skills/lightspec-apply/SKILL.md'
      );
      const crushArchive = path.join(
        testDir,
        '.crush/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(crushProposal)).toBe(true);
      expect(await fileExists(crushApply)).toBe(true);
      expect(await fileExists(crushArchive)).toBe(true);

      const proposalContent = await fs.readFile(crushProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(crushApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(crushArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should mark Crush as already configured during extend mode', async () => {
      queueSelections('crush', DONE, 'crush', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const crushChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'crush'
      );
      expect(crushChoice.configured).toBe(true);
    });

    it('should create CoStrict skill files with templates', async () => {
      queueSelections('costrict', DONE);

      await initCommand.execute(testDir);

      const costrictProposal = path.join(
        testDir,
        '.cospec/lightspec/skills/lightspec-proposal/SKILL.md'
      );
      const costrictApply = path.join(
        testDir,
        '.cospec/lightspec/skills/lightspec-apply/SKILL.md'
      );
      const costrictArchive = path.join(
        testDir,
        '.cospec/lightspec/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(costrictProposal)).toBe(true);
      expect(await fileExists(costrictApply)).toBe(true);
      expect(await fileExists(costrictArchive)).toBe(true);

      const proposalContent = await fs.readFile(costrictProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(costrictApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(costrictArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should mark CoStrict as already configured during extend mode', async () => {
      queueSelections('costrict', DONE, 'costrict', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const costrictChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'costrict'
      );
      expect(costrictChoice.configured).toBe(true);
    });

    it('should create RooCode skill files with templates', async () => {
      queueSelections('roocode', DONE);

      await initCommand.execute(testDir);

      const rooProposal = path.join(
        testDir,
        '.roocode/skills/lightspec-proposal/SKILL.md'
      );
      const rooApply = path.join(
        testDir,
        '.roocode/skills/lightspec-apply/SKILL.md'
      );
      const rooArchive = path.join(
        testDir,
        '.roocode/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(rooProposal)).toBe(true);
      expect(await fileExists(rooApply)).toBe(true);
      expect(await fileExists(rooArchive)).toBe(true);

      const proposalContent = await fs.readFile(rooProposal, 'utf-8');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(rooApply, 'utf-8');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(rooArchive, 'utf-8');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should mark RooCode as already configured during extend mode', async () => {
      queueSelections('roocode', DONE, 'roocode', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const rooChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'roocode'
      );
      expect(rooChoice.configured).toBe(true);
    });

    it('should create Qoder skill files with templates', async () => {
      queueSelections('qoder', DONE);

      await initCommand.execute(testDir);

      const qoderProposal = path.join(
        testDir,
        '.qoder/skills/lightspec-proposal/SKILL.md'
      );
      const qoderApply = path.join(
        testDir,
        '.qoder/skills/lightspec-apply/SKILL.md'
      );
      const qoderArchive = path.join(
        testDir,
        '.qoder/skills/lightspec-archive/SKILL.md'
      );

      expect(await fileExists(qoderProposal)).toBe(true);
      expect(await fileExists(qoderApply)).toBe(true);
      expect(await fileExists(qoderArchive)).toBe(true);

      const proposalContent = await fs.readFile(qoderProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: lightspec-proposal');
      expect(proposalContent).toContain('description: Scaffold a new LightSpec change and validate strictly.');
      expect(proposalContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(qoderApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: lightspec-apply');
      expect(applyContent).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(qoderArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: lightspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed LightSpec change and update specs.');
      expect(archiveContent).toContain('lightspec archive <id> --yes');
    });

    it('should mark Qoder as already configured during extend mode', async () => {
      queueSelections('qoder', DONE, 'qoder', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const qoderChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'qoder'
      );
      expect(qoderChoice.configured).toBe(true);
    });

    it('should create COSTRICT.md when CoStrict is selected', async () => {
      queueSelections('costrict', DONE);

      await initCommand.execute(testDir);

      const costrictPath = path.join(testDir, 'COSTRICT.md');
      expect(await fileExists(costrictPath)).toBe(true);

      const content = await fs.readFile(costrictPath, 'utf-8');
      expect(content).toContain('<!-- LIGHTSPEC:START -->');
      expect(content).toContain("lightspec-proposal");
      expect(content).toContain('lightspec update');
      expect(content).toContain('<!-- LIGHTSPEC:END -->');
    });

    it('should create QODER.md when Qoder is selected', async () => {
      queueSelections('qoder', DONE);

      await initCommand.execute(testDir);

      const qoderPath = path.join(testDir, 'QODER.md');
      expect(await fileExists(qoderPath)).toBe(true);

      const content = await fs.readFile(qoderPath, 'utf-8');
      expect(content).toContain('<!-- LIGHTSPEC:START -->');
      expect(content).toContain("lightspec-proposal");
      expect(content).toContain('lightspec update');
      expect(content).toContain('<!-- LIGHTSPEC:END -->');
    });
    it('should update existing COSTRICT.md with markers', async () => {
      queueSelections('costrict', DONE);

      const costrictPath = path.join(testDir, 'COSTRICT.md');
      const existingContent =
        '# My CoStrict Instructions\nCustom instructions here';
      await fs.writeFile(costrictPath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(costrictPath, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain('# My CoStrict Instructions');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should update existing QODER.md with markers', async () => {
      queueSelections('qoder', DONE);

      const qoderPath = path.join(testDir, 'QODER.md');
      const existingContent =
        '# My Qoder Instructions\nCustom instructions here';
      await fs.writeFile(qoderPath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(qoderPath, 'utf-8');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
      expect(updatedContent).toContain("lightspec-proposal");
      expect(updatedContent).toContain('lightspec update');
      expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });
  });

  describe('non-interactive mode', () => {
    it('should select all available tools with --tools all option', async () => {
      const nonInteractiveCommand = new InitCommand({ tools: 'all' });

      await nonInteractiveCommand.execute(testDir);

      // Should create configurations for all available tools
      const claudePath = path.join(testDir, 'CLAUDE.md');
      const cursorProposal = path.join(
        testDir,
        '.cursor/skills/lightspec-proposal/SKILL.md'
      );
      const windsurfProposal = path.join(
        testDir,
        '.windsurf/skills/lightspec-proposal/SKILL.md'
      );

      expect(await fileExists(claudePath)).toBe(true);
      expect(await fileExists(cursorProposal)).toBe(true);
      expect(await fileExists(windsurfProposal)).toBe(true);
    });

    it('should select specific tools with --tools option', async () => {
      const nonInteractiveCommand = new InitCommand({ tools: 'claude,cursor' });

      await nonInteractiveCommand.execute(testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      const cursorProposal = path.join(
        testDir,
        '.cursor/skills/lightspec-proposal/SKILL.md'
      );
      const windsurfProposal = path.join(
        testDir,
        '.windsurf/skills/lightspec-proposal/SKILL.md'
      );

      expect(await fileExists(claudePath)).toBe(true);
      expect(await fileExists(cursorProposal)).toBe(true);
      expect(await fileExists(windsurfProposal)).toBe(false); // Not selected
    });

    it('should skip tool configuration with --tools none option', async () => {
      const nonInteractiveCommand = new InitCommand({ tools: 'none' });

      await nonInteractiveCommand.execute(testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      const cursorProposal = path.join(
        testDir,
        '.cursor/skills/lightspec-proposal/SKILL.md'
      );

      // Should still create AGENTS.md but no tool-specific files
      const rootAgentsPath = path.join(testDir, 'AGENTS.md');
      expect(await fileExists(rootAgentsPath)).toBe(true);
      expect(await fileExists(claudePath)).toBe(false);
      expect(await fileExists(cursorProposal)).toBe(false);
    });

    it('should throw error for invalid tool names', async () => {
      const nonInteractiveCommand = new InitCommand({ tools: 'invalid-tool' });

      await expect(nonInteractiveCommand.execute(testDir)).rejects.toThrow(
        /Invalid tool\(s\): invalid-tool\. Available values: /
      );
    });

    it('should handle comma-separated tool names with spaces', async () => {
      const nonInteractiveCommand = new InitCommand({ tools: 'claude, cursor' });

      await nonInteractiveCommand.execute(testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      const cursorProposal = path.join(
        testDir,
        '.cursor/skills/lightspec-proposal/SKILL.md'
      );

      expect(await fileExists(claudePath)).toBe(true);
      expect(await fileExists(cursorProposal)).toBe(true);
    });

    it('should reject combining reserved keywords with explicit tool ids', async () => {
      const nonInteractiveCommand = new InitCommand({ tools: 'all,claude' });

      await expect(nonInteractiveCommand.execute(testDir)).rejects.toThrow(
        /Cannot combine reserved values "all" or "none" with specific tool IDs/
      );
    });
  });

  describe('already configured detection', () => {
    it('should NOT show tools as already configured in fresh project with existing CLAUDE.md', async () => {
      // Simulate user having their own CLAUDE.md before running lightspec init
      const claudePath = path.join(testDir, 'CLAUDE.md');
      await fs.writeFile(claudePath, '# My Custom Claude Instructions\n');

      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      // In the first run (non-interactive mode via queueSelections),
      // the prompt is called with configured: false for claude
      const firstCallArgs = mockPrompt.mock.calls[0][0];
      const claudeChoice = firstCallArgs.choices.find(
        (choice: any) => choice.value === 'claude'
      );

      expect(claudeChoice.configured).toBe(false);
    });

    it('should NOT show tools as already configured in fresh project with existing skills', async () => {
      // Simulate user having their own custom skills
      const customCommandDir = path.join(testDir, '.claude/commands/custom');
      await fs.mkdir(customCommandDir, { recursive: true });
      await fs.writeFile(
        path.join(customCommandDir, 'mycommand.md'),
        '# My Custom Command\n'
      );

      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const firstCallArgs = mockPrompt.mock.calls[0][0];
      const claudeChoice = firstCallArgs.choices.find(
        (choice: any) => choice.value === 'claude'
      );

      expect(claudeChoice.configured).toBe(false);
    });

    it('should show tools as already configured in extend mode', async () => {
      // First initialization
      queueSelections('claude', DONE);
      await initCommand.execute(testDir);

      // Second initialization (extend mode)
      queueSelections('cursor', DONE);
      await initCommand.execute(testDir);

      const secondCallArgs = mockPrompt.mock.calls[1][0];
      const claudeChoice = secondCallArgs.choices.find(
        (choice: any) => choice.value === 'claude'
      );

      expect(claudeChoice.configured).toBe(true);
    });

    it('should NOT show already configured for Codex in fresh init even with global skills', async () => {
      // Create global Codex skills (simulating previous installation)
      const codexSkillsDir = path.join(testDir, '.codex/skills');
      await fs.mkdir(codexSkillsDir, { recursive: true });
      await fs.mkdir(path.join(codexSkillsDir, 'lightspec-proposal'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(codexSkillsDir, 'lightspec-proposal/SKILL.md'),
        '# Existing prompt\n'
      );

      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const firstCallArgs = mockPrompt.mock.calls[0][0];
      const codexChoice = firstCallArgs.choices.find(
        (choice: any) => choice.value === 'codex'
      );

      // In fresh init, even global tools should not show as configured
      expect(codexChoice.configured).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should provide helpful error for insufficient permissions', async () => {
      // This is tricky to test cross-platform, but we can test the error message
      const readOnlyDir = path.join(testDir, 'readonly');
      await fs.mkdir(readOnlyDir);

      // Mock the permission check to fail
      const originalCheck = fs.writeFile;
      vi.spyOn(fs, 'writeFile').mockImplementation(
        async (filePath: any, ...args: any[]) => {
          if (
            typeof filePath === 'string' &&
            filePath.includes('.lightspec-test-')
          ) {
            throw new Error('EACCES: permission denied');
          }
          return originalCheck.call(fs, filePath, ...args);
        }
      );

      queueSelections('claude', DONE);
      await expect(initCommand.execute(readOnlyDir)).rejects.toThrow(
        /Insufficient permissions/
      );
    });
  });
});

async function testFileRecreationInExtendMode(
  testDir: string,
  initCommand: InitCommand,
  relativePath: string,
  expectedContent: string
): Promise<void> {
  queueSelections('claude', DONE, DONE);

  // First init
  await initCommand.execute(testDir);

  const filePath = path.join(testDir, relativePath);
  expect(await fileExists(filePath)).toBe(true);

  // Delete the file
  await fs.unlink(filePath);
  expect(await fileExists(filePath)).toBe(false);

  // Run init again - should recreate the file
  await initCommand.execute(testDir);
  expect(await fileExists(filePath)).toBe(true);

  const content = await fs.readFile(filePath, 'utf-8');
  expect(content).toContain(expectedContent);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function directoryExists(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}
