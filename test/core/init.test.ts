import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runInit } from '../../src/core/init-logic.js';
import { InitCommand } from '../../src/commands/init.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import { ToolRegistry } from '../../src/core/configurators/registry.js';

const DONE = '__DONE__';

describe('runInit', () => {
  let tempDir: string;
  let mockPrompt: any;
  let initCommand: InitCommand;

  // Helper for upstream tests
  const queueSelections = (...selections: any[]) => {
    let callCount = 0;
    mockPrompt.mockImplementation(async (config: any) => {
        const result = selections[callCount];
        callCount++;
        if (result === DONE) {
            return [];
        }
        if (Array.isArray(result)) {
            return result;
        }
        // If it's a string, wrap in array (single selection)
        if (typeof result === 'string') {
            return [result];
        }
        return result || [];
    });
  };
  
  // Helper to check file existence (from upstream utils)
  const fileExists = async (p: string) => {
      try {
          await fs.stat(p);
          return true;
      } catch {
          return false;
      }
  };

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-init-test-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });
    
    // Setup for InitCommand tests
    mockPrompt = vi.fn();
    initCommand = new InitCommand({ prompt: mockPrompt });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  it('should initialize OpenSpec in a directory', async () => {
    const result = await runInit(tempDir, { tools: [] });
    
    expect(result.projectPath).toBe(path.resolve(tempDir));
    expect(result.openspecDir).toBe('.openspec');
    expect(result.extendMode).toBe(false);

    const openspecPath = path.join(tempDir, '.openspec');
    expect(await fs.stat(openspecPath)).toBeDefined();
    expect(await fs.stat(path.join(openspecPath, 'specs'))).toBeDefined();
    expect(await fs.stat(path.join(openspecPath, 'changes'))).toBeDefined();
    expect(await fs.stat(path.join(openspecPath, 'project.md'))).toBeDefined();
  });

  it('should handle extend mode if openspec directory exists', async () => {
    const openspecPath = path.join(tempDir, '.openspec');
    await fs.mkdir(openspecPath, { recursive: true });
    
    const result = await runInit(tempDir, { tools: [] });
    expect(result.extendMode).toBe(true);
  });

  describe('AI tool selection', () => {
    it('should prompt for AI tool selection', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(tempDir);

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

      await initCommand.execute(tempDir);

      // When other tools are added, we'd test their specific configurations here
      const claudePath = path.join(tempDir, 'CLAUDE.md');
      expect(await fileExists(claudePath)).toBe(true);
    });

    it('should mark existing tools as already configured during extend mode', async () => {
      queueSelections('claude', DONE, 'cursor', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const claudeChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'claude'
      );
      expect(claudeChoice.configured).toBe(true);
    });

    it('should mark Qwen as already configured during extend mode', async () => {
      queueSelections('qwen', DONE, 'qwen', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const qwenChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'qwen'
      );
      expect(qwenChoice.configured).toBe(true);
    });

    it('should preselect Kilo Code when workflows already exist', async () => {
      queueSelections('kilocode', DONE, 'kilocode', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const preselected = secondRunArgs.initialSelected ?? [];
      expect(preselected).toContain('kilocode');
    });

    it('should mark Windsurf as already configured during extend mode', async () => {
      queueSelections('windsurf', DONE, 'windsurf', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const wsChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'windsurf'
      );
      expect(wsChoice.configured).toBe(true);
    });

    it('should mark Antigravity as already configured during extend mode', async () => {
      queueSelections('antigravity', DONE, 'antigravity', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const antigravityChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'antigravity'
      );
      expect(antigravityChoice.configured).toBe(true);
    });

    it('should mark Codex as already configured during extend mode', async () => {
      queueSelections('codex', DONE, 'codex', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const codexChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'codex'
      );
      expect(codexChoice.configured).toBe(true);
    });

    it('should mark Factory Droid as already configured during extend mode', async () => {
      queueSelections('factory', DONE, 'factory', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const factoryChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'factory'
      );
      expect(factoryChoice.configured).toBe(true);
    });

    it('should mark GitHub Copilot as already configured during extend mode', async () => {
      queueSelections('github-copilot', DONE, 'github-copilot', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const githubCopilotChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'github-copilot'
      );
      expect(githubCopilotChoice.configured).toBe(true);
    });

    it('should create Amazon Q Developer prompt files with templates', async () => {
      queueSelections('amazon-q', DONE);

      await initCommand.execute(tempDir);

      const proposalPath = path.join(
        tempDir,
        '.amazonq/prompts/openspec-proposal.md'
      );
      const applyPath = path.join(
        tempDir,
        '.amazonq/prompts/openspec-apply.md'
      );
      const archivePath = path.join(
        tempDir,
        '.amazonq/prompts/openspec-archive.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('description: Scaffold a new OpenSpec change and validate strictly.');
      expect(proposalContent).toContain('$ARGUMENTS');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
      expect(applyContent).toContain('$ARGUMENTS');
      expect(applyContent).toContain('<!-- OPENSPEC:START -->');
    });

    it('should mark Amazon Q Developer as already configured during extend mode', async () => {
      queueSelections('amazon-q', DONE, 'amazon-q', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const amazonQChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'amazon-q'
      );
      expect(amazonQChoice.configured).toBe(true);
    });

    it('should create Auggie slash command files with templates', async () => {
      queueSelections('auggie', DONE);

      await initCommand.execute(tempDir);

      const auggieProposal = path.join(
        tempDir,
        '.augment/commands/openspec-proposal.md'
      );
      const auggieApply = path.join(
        tempDir,
        '.augment/commands/openspec-apply.md'
      );
      const auggieArchive = path.join(
        tempDir,
        '.augment/commands/openspec-archive.md'
      );

      expect(await fileExists(auggieProposal)).toBe(true);
      expect(await fileExists(auggieApply)).toBe(true);
      expect(await fileExists(auggieArchive)).toBe(true);

      const proposalContent = await fs.readFile(auggieProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('description: Scaffold a new OpenSpec change and validate strictly.');
      expect(proposalContent).toContain('argument-hint: feature description or request');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(auggieApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
      expect(applyContent).toContain('argument-hint: change-id');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(auggieArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('description: Archive a deployed OpenSpec change and update specs.');
      expect(archiveContent).toContain('argument-hint: change-id');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should mark Auggie as already configured during extend mode', async () => {
      queueSelections('auggie', DONE, 'auggie', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const auggieChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'auggie'
      );
      expect(auggieChoice.configured).toBe(true);
    });

    it('should create CodeBuddy slash command files with templates', async () => {
      queueSelections('codebuddy', DONE);

      await initCommand.execute(tempDir);

      const codeBuddyProposal = path.join(
        tempDir,
        '.codebuddy/commands/openspec/proposal.md'
      );
      const codeBuddyApply = path.join(
        tempDir,
        '.codebuddy/commands/openspec/apply.md'
      );
      const codeBuddyArchive = path.join(
        tempDir,
        '.codebuddy/commands/openspec/archive.md'
      );

      expect(await fileExists(codeBuddyProposal)).toBe(true);
      expect(await fileExists(codeBuddyApply)).toBe(true);
      expect(await fileExists(codeBuddyArchive)).toBe(true);

      const proposalContent = await fs.readFile(codeBuddyProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: OpenSpec: Proposal');
      expect(proposalContent).toContain('description: "Scaffold a new OpenSpec change and validate strictly."');
      expect(proposalContent).toContain('argument-hint: "[feature description or request]"');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(codeBuddyApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: OpenSpec: Apply');
      expect(applyContent).toContain('description: "Implement an approved OpenSpec change and keep tasks in sync."');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(codeBuddyArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: OpenSpec: Archive');
      expect(archiveContent).toContain('description: "Archive a deployed OpenSpec change and update specs."');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should mark CodeBuddy as already configured during extend mode', async () => {
      queueSelections('codebuddy', DONE, 'codebuddy', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const codeBuddyChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'codebuddy'
      );
      expect(codeBuddyChoice.configured).toBe(true);
    });

    it('should create Continue slash command files with templates', async () => {
      queueSelections('continue', DONE);

      await initCommand.execute(tempDir);

      const continueProposal = path.join(
        tempDir,
        '.continue/prompts/openspec-proposal.prompt'
      );
      const continueApply = path.join(
        tempDir,
        '.continue/prompts/openspec-apply.prompt'
      );
      const continueArchive = path.join(
        tempDir,
        '.continue/prompts/openspec-archive.prompt'
      );

      expect(await fileExists(continueProposal)).toBe(true);
      expect(await fileExists(continueApply)).toBe(true);
      expect(await fileExists(continueArchive)).toBe(true);

      const proposalContent = await fs.readFile(continueProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: openspec-proposal');
      expect(proposalContent).toContain('invokable: true');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');

      const applyContent = await fs.readFile(continueApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: openspec-apply');
      expect(applyContent).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
      expect(applyContent).toContain('invokable: true');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(continueArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: openspec-archive');
      expect(archiveContent).toContain('description: Archive a deployed OpenSpec change and update specs.');
      expect(archiveContent).toContain('invokable: true');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should mark Continue as already configured during extend mode', async () => {
      queueSelections('continue', DONE, 'continue', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const continueChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'continue'
      );
      expect(continueChoice.configured).toBe(true);
    });

    it('should create CODEBUDDY.md when CodeBuddy is selected', async () => {
      queueSelections('codebuddy', DONE);

      await initCommand.execute(tempDir);

      const codeBuddyPath = path.join(tempDir, 'CODEBUDDY.md');
      expect(await fileExists(codeBuddyPath)).toBe(true);

      const content = await fs.readFile(codeBuddyPath, 'utf-8');
      expect(content).toContain('<!-- OPENSPEC:START -->');
      expect(content).toContain("@/openspec/AGENTS.md");
      expect(content).toContain('openspec update');
      expect(content).toContain('<!-- OPENSPEC:END -->');
    });

    it('should update existing CODEBUDDY.md with markers', async () => {
      queueSelections('codebuddy', DONE);

      const codeBuddyPath = path.join(tempDir, 'CODEBUDDY.md');
      const existingContent =
        '# My CodeBuddy Instructions\nCustom instructions here';
      await fs.writeFile(codeBuddyPath, existingContent);

      await initCommand.execute(tempDir);

      const updatedContent = await fs.readFile(codeBuddyPath, 'utf-8');
      expect(updatedContent).toContain('<!-- OPENSPEC:START -->');
      expect(updatedContent).toContain("@/openspec/AGENTS.md");
      expect(updatedContent).toContain('openspec update');
      expect(updatedContent).toContain('<!-- OPENSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should create Crush slash command files with templates', async () => {
      queueSelections('crush', DONE);

      await initCommand.execute(tempDir);

      const crushProposal = path.join(
        tempDir,
        '.crush/commands/openspec/proposal.md'
      );
      const crushApply = path.join(
        tempDir,
        '.crush/commands/openspec/apply.md'
      );
      const crushArchive = path.join(
        tempDir,
        '.crush/commands/openspec/archive.md'
      );

      expect(await fileExists(crushProposal)).toBe(true);
      expect(await fileExists(crushApply)).toBe(true);
      expect(await fileExists(crushArchive)).toBe(true);

      const proposalContent = await fs.readFile(crushProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: OpenSpec: Proposal');
      expect(proposalContent).toContain('description: Scaffold a new OpenSpec change and validate strictly.');
      expect(proposalContent).toContain('category: OpenSpec');
      expect(proposalContent).toContain('tags: [openspec, change]');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(crushApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: OpenSpec: Apply');
      expect(applyContent).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
      expect(applyContent).toContain('category: OpenSpec');
      expect(applyContent).toContain('tags: [openspec, apply]');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(crushArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: OpenSpec: Archive');
      expect(archiveContent).toContain('description: Archive a deployed OpenSpec change and update specs.');
      expect(archiveContent).toContain('category: OpenSpec');
      expect(archiveContent).toContain('tags: [openspec, archive]');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should mark Crush as already configured during extend mode', async () => {
      queueSelections('crush', DONE, 'crush', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const crushChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'crush'
      );
      expect(crushChoice.configured).toBe(true);
    });

    it('should create CoStrict slash command files with templates', async () => {
      queueSelections('costrict', DONE);

      await initCommand.execute(tempDir);

      const costrictProposal = path.join(
        tempDir,
        '.cospec/openspec/commands/openspec-proposal.md'
      );
      const costrictApply = path.join(
        tempDir,
        '.cospec/openspec/commands/openspec-apply.md'
      );
      const costrictArchive = path.join(
        tempDir,
        '.cospec/openspec/commands/openspec-archive.md'
      );

      expect(await fileExists(costrictProposal)).toBe(true);
      expect(await fileExists(costrictApply)).toBe(true);
      expect(await fileExists(costrictArchive)).toBe(true);

      const proposalContent = await fs.readFile(costrictProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('description: "Scaffold a new OpenSpec change and validate strictly."');
      expect(proposalContent).toContain('argument-hint: feature description or request');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(costrictApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('description: "Implement an approved OpenSpec change and keep tasks in sync."');
      expect(applyContent).toContain('argument-hint: change-id');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(costrictArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('description: "Archive a deployed OpenSpec change and update specs."');
      expect(archiveContent).toContain('argument-hint: change-id');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should mark CoStrict as already configured during extend mode', async () => {
      queueSelections('costrict', DONE, 'costrict', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const costrictChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'costrict'
      );
      expect(costrictChoice.configured).toBe(true);
    });

    it('should create RooCode slash command files with templates', async () => {
      queueSelections('roocode', DONE);

      await initCommand.execute(tempDir);

      const rooProposal = path.join(
        tempDir,
        '.roo/commands/openspec-proposal.md'
      );
      const rooApply = path.join(
        tempDir,
        '.roo/commands/openspec-apply.md'
      );
      const rooArchive = path.join(
        tempDir,
        '.roo/commands/openspec-archive.md'
      );

      expect(await fileExists(rooProposal)).toBe(true);
      expect(await fileExists(rooApply)).toBe(true);
      expect(await fileExists(rooArchive)).toBe(true);

      const proposalContent = await fs.readFile(rooProposal, 'utf-8');
      expect(proposalContent).toContain('# OpenSpec: Proposal');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(rooApply, 'utf-8');
      expect(applyContent).toContain('# OpenSpec: Apply');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(rooArchive, 'utf-8');
      expect(archiveContent).toContain('# OpenSpec: Archive');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should mark RooCode as already configured during extend mode', async () => {
      queueSelections('roocode', DONE, 'roocode', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const rooChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'roocode'
      );
      expect(rooChoice.configured).toBe(true);
    });

    it('should create Qoder slash command files with templates', async () => {
      queueSelections('qoder', DONE);

      await initCommand.execute(tempDir);

      const qoderProposal = path.join(
        tempDir,
        '.qoder/commands/openspec/proposal.md'
      );
      const qoderApply = path.join(
        tempDir,
        '.qoder/commands/openspec/apply.md'
      );
      const qoderArchive = path.join(
        tempDir,
        '.qoder/commands/openspec/archive.md'
      );

      expect(await fileExists(qoderProposal)).toBe(true);
      expect(await fileExists(qoderApply)).toBe(true);
      expect(await fileExists(qoderArchive)).toBe(true);

      const proposalContent = await fs.readFile(qoderProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('name: OpenSpec: Proposal');
      expect(proposalContent).toContain('description: Scaffold a new OpenSpec change and validate strictly.');
      expect(proposalContent).toContain('category: OpenSpec');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(qoderApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('name: OpenSpec: Apply');
      expect(applyContent).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(qoderArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('name: OpenSpec: Archive');
      expect(archiveContent).toContain('description: Archive a deployed OpenSpec change and update specs.');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should mark Qoder as already configured during extend mode', async () => {
      queueSelections('qoder', DONE, 'qoder', DONE);
      await initCommand.execute(tempDir);
      await initCommand.execute(tempDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const qoderChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'qoder'
      );
      expect(qoderChoice.configured).toBe(true);
    });

    it('should create COSTRICT.md when CoStrict is selected', async () => {
      queueSelections('costrict', DONE);

      await initCommand.execute(tempDir);

      const costrictPath = path.join(tempDir, 'COSTRICT.md');
      expect(await fileExists(costrictPath)).toBe(true);

      const content = await fs.readFile(costrictPath, 'utf-8');
      expect(content).toContain('<!-- OPENSPEC:START -->');
      expect(content).toContain("@/openspec/AGENTS.md");
      expect(content).toContain('openspec update');
      expect(content).toContain('<!-- OPENSPEC:END -->');
    });

    it('should create QODER.md when Qoder is selected', async () => {
      queueSelections('qoder', DONE);

      await initCommand.execute(tempDir);

      const qoderPath = path.join(tempDir, 'QODER.md');
      expect(await fileExists(qoderPath)).toBe(true);

      const content = await fs.readFile(qoderPath, 'utf-8');
      expect(content).toContain('<!-- OPENSPEC:START -->');
      expect(content).toContain("@/openspec/AGENTS.md");
      expect(content).toContain('openspec update');
      expect(content).toContain('<!-- OPENSPEC:END -->');
    });
    it('should update existing COSTRICT.md with markers', async () => {
      queueSelections('costrict', DONE);

      const costrictPath = path.join(tempDir, 'COSTRICT.md');
      const existingContent =
        '# My CoStrict Instructions\nCustom instructions here';
      await fs.writeFile(costrictPath, existingContent);

      await initCommand.execute(tempDir);

      const updatedContent = await fs.readFile(costrictPath, 'utf-8');
      expect(updatedContent).toContain('<!-- OPENSPEC:START -->');
      expect(updatedContent).toContain('# My CoStrict Instructions');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should update existing QODER.md with markers', async () => {
      queueSelections('qoder', DONE);

      const qoderPath = path.join(tempDir, 'QODER.md');
      const existingContent =
        '# My Qoder Instructions\nCustom instructions here';
      await fs.writeFile(qoderPath, existingContent);

      await initCommand.execute(tempDir);

      const updatedContent = await fs.readFile(qoderPath, 'utf-8');
      expect(updatedContent).toContain('<!-- OPENSPEC:START -->');
      expect(updatedContent).toContain("@/openspec/AGENTS.md");
      expect(updatedContent).toContain('openspec update');
      expect(updatedContent).toContain('<!-- OPENSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });
  });

  it('should migrate legacy directory if requested', async () => {
    const legacyPath = path.join(tempDir, 'openspec'); // This is the LEGACY name
    await fs.mkdir(legacyPath, { recursive: true });

    const result = await runInit(tempDir, { tools: [], shouldMigrate: true });
    
    expect(result.migrated).toBe(true);
    expect(result.openspecDir).toBe('.openspec');
    expect(await fs.stat(path.join(tempDir, '.openspec'))).toBeDefined();
  });
});

