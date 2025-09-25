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

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-init-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    selectionQueue = [];
    mockPrompt.mockReset();
    initCommand = new InitCommand({ prompt: mockPrompt });

    // Mock console.log to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('execute', () => {
    it('should create OpenSpec directory structure', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await directoryExists(openspecPath)).toBe(true);
      expect(await directoryExists(path.join(openspecPath, 'specs'))).toBe(
        true
      );
      expect(await directoryExists(path.join(openspecPath, 'changes'))).toBe(
        true
      );
      expect(
        await directoryExists(path.join(openspecPath, 'changes', 'archive'))
      ).toBe(true);
    });

    it('should create AGENTS.md and project.md', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const openspecPath = path.join(testDir, 'openspec');
      expect(await fileExists(path.join(openspecPath, 'AGENTS.md'))).toBe(true);
      expect(await fileExists(path.join(openspecPath, 'project.md'))).toBe(
        true
      );

      const agentsContent = await fs.readFile(
        path.join(openspecPath, 'AGENTS.md'),
        'utf-8'
      );
      expect(agentsContent).toContain('OpenSpec Instructions');

      const projectContent = await fs.readFile(
        path.join(openspecPath, 'project.md'),
        'utf-8'
      );
      expect(projectContent).toContain('Project Context');
    });

    it('should create CLAUDE.md when Claude Code is selected', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      expect(await fileExists(claudePath)).toBe(true);

      const content = await fs.readFile(claudePath, 'utf-8');
      expect(content).toContain('<!-- OPENSPEC:START -->');
      expect(content).toContain('OpenSpec Instructions');
      expect(content).toContain('<!-- OPENSPEC:END -->');
    });

    it('should update existing CLAUDE.md with markers', async () => {
      queueSelections('claude', DONE);

      const claudePath = path.join(testDir, 'CLAUDE.md');
      const existingContent =
        '# My Project Instructions\nCustom instructions here';
      await fs.writeFile(claudePath, existingContent);

      await initCommand.execute(testDir);

      const updatedContent = await fs.readFile(claudePath, 'utf-8');
      expect(updatedContent).toContain('<!-- OPENSPEC:START -->');
      expect(updatedContent).toContain('OpenSpec Instructions');
      expect(updatedContent).toContain('<!-- OPENSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should create AGENTS.md in project root when AGENTS standard is selected', async () => {
      queueSelections('agents', DONE);

      await initCommand.execute(testDir);

      const rootAgentsPath = path.join(testDir, 'AGENTS.md');
      expect(await fileExists(rootAgentsPath)).toBe(true);

      const content = await fs.readFile(rootAgentsPath, 'utf-8');
      expect(content).toContain('<!-- OPENSPEC:START -->');
      expect(content).toContain('OpenSpec Instructions');
      expect(content).toContain('<!-- OPENSPEC:END -->');

      const claudeExists = await fileExists(path.join(testDir, 'CLAUDE.md'));
      expect(claudeExists).toBe(false);
    });

    it('should create Claude slash command files with templates', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      const claudeProposal = path.join(
        testDir,
        '.claude/commands/openspec/proposal.md'
      );
      const claudeApply = path.join(
        testDir,
        '.claude/commands/openspec/apply.md'
      );
      const claudeArchive = path.join(
        testDir,
        '.claude/commands/openspec/archive.md'
      );

      expect(await fileExists(claudeProposal)).toBe(true);
      expect(await fileExists(claudeApply)).toBe(true);
      expect(await fileExists(claudeArchive)).toBe(true);

      const proposalContent = await fs.readFile(claudeProposal, 'utf-8');
      expect(proposalContent).toContain('name: OpenSpec: Proposal');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(claudeApply, 'utf-8');
      expect(applyContent).toContain('name: OpenSpec: Apply');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(claudeArchive, 'utf-8');
      expect(archiveContent).toContain('name: OpenSpec: Archive');
      expect(archiveContent).toContain('openspec archive <id>');
      expect(archiveContent).toContain(
        '`--skip-specs` only for tooling-only work'
      );
    });

    it('should create Cursor slash command files with templates', async () => {
      queueSelections('cursor', DONE);

      await initCommand.execute(testDir);

      const cursorProposal = path.join(
        testDir,
        '.cursor/commands/openspec-proposal.md'
      );
      const cursorApply = path.join(
        testDir,
        '.cursor/commands/openspec-apply.md'
      );
      const cursorArchive = path.join(
        testDir,
        '.cursor/commands/openspec-archive.md'
      );

      expect(await fileExists(cursorProposal)).toBe(true);
      expect(await fileExists(cursorApply)).toBe(true);
      expect(await fileExists(cursorArchive)).toBe(true);

      const proposalContent = await fs.readFile(cursorProposal, 'utf-8');
      expect(proposalContent).toContain('name: /openspec-proposal');
      expect(proposalContent).toContain('<!-- OPENSPEC:END -->');

      const applyContent = await fs.readFile(cursorApply, 'utf-8');
      expect(applyContent).toContain('id: openspec-apply');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(cursorArchive, 'utf-8');
      expect(archiveContent).toContain('name: /openspec-archive');
      expect(archiveContent).toContain('openspec list --specs');
    });

    it('should create OpenCode slash command files with templates', async () => {
      queueSelections('opencode', DONE);

      await initCommand.execute(testDir);

      const openCodeProposal = path.join(
        testDir,
        '.opencode/command/openspec-proposal.md'
      );
      const openCodeApply = path.join(
        testDir,
        '.opencode/command/openspec-apply.md'
      );
      const openCodeArchive = path.join(
        testDir,
        '.opencode/command/openspec-archive.md'
      );

      expect(await fileExists(openCodeProposal)).toBe(true);
      expect(await fileExists(openCodeApply)).toBe(true);
      expect(await fileExists(openCodeArchive)).toBe(true);

      const proposalContent = await fs.readFile(openCodeProposal, 'utf-8');
      expect(proposalContent).toContain('agent: build');
      expect(proposalContent).toContain(
        'description: Scaffold a new OpenSpec change and validate strictly.'
      );
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');

      const applyContent = await fs.readFile(openCodeApply, 'utf-8');
      expect(applyContent).toContain('agent: build');
      expect(applyContent).toContain(
        'description: Implement an approved OpenSpec change and keep tasks in sync.'
      );
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(openCodeArchive, 'utf-8');
      expect(archiveContent).toContain('agent: build');
      expect(archiveContent).toContain(
        'description: Archive a deployed OpenSpec change and update specs.'
      );
      expect(archiveContent).toContain('openspec list --specs');
    });

    it('should add new tool when OpenSpec already exists', async () => {
      queueSelections('claude', DONE, 'cursor', DONE);
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const cursorProposal = path.join(
        testDir,
        '.cursor/commands/openspec-proposal.md'
      );
      expect(await fileExists(cursorProposal)).toBe(true);
    });

    it('should error when extend mode selects no tools', async () => {
      queueSelections('claude', DONE, DONE);
      await initCommand.execute(testDir);
      await expect(initCommand.execute(testDir)).rejects.toThrow(
        /OpenSpec seems to already be initialized/
      );
    });

    it('should handle non-existent target directory', async () => {
      queueSelections('claude', DONE);

      const newDir = path.join(testDir, 'new-project');
      await initCommand.execute(newDir);

      const openspecPath = path.join(newDir, 'openspec');
      expect(await directoryExists(openspecPath)).toBe(true);
    });

    it('should display success message with selected tool name', async () => {
      queueSelections('claude', DONE);
      const logSpy = vi.spyOn(console, 'log');

      await initCommand.execute(testDir);

      const calls = logSpy.mock.calls.flat().join('\n');
      expect(calls).toContain('Copy these prompts to Claude Code');
    });

    it('should reference AGENTS compatible assistants in success message', async () => {
      queueSelections('agents', DONE);
      const logSpy = vi.spyOn(console, 'log');

      await initCommand.execute(testDir);

      const calls = logSpy.mock.calls.flat().join('\n');
      expect(calls).toContain(
        'Copy these prompts to your AGENTS.md-compatible assistant'
      );
    });
  });

  describe('AI tool selection', () => {
    it('should prompt for AI tool selection', async () => {
      queueSelections('claude', DONE);

      await initCommand.execute(testDir);

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          baseMessage: expect.stringContaining('Which AI tools do you use?'),
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
            filePath.includes('.openspec-test-')
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
