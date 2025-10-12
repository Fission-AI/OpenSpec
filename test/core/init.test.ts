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
    testDir = path.join(os.tmpdir(), `openspec-init-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
    selectionQueue = [];
    mockPrompt.mockReset();
    initCommand = new InitCommand({ prompt: mockPrompt });

    // Route Codex global directory into the test sandbox
    prevCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = path.join(testDir, '.codex');

    // Mock console.log to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    vi.restoreAllMocks();
    if (prevCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = prevCodexHome;
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
      expect(content).toContain("@/openspec/AGENTS.md");
      expect(content).toContain('openspec update');
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
      expect(updatedContent).toContain("@/openspec/AGENTS.md");
      expect(updatedContent).toContain('openspec update');
      expect(updatedContent).toContain('<!-- OPENSPEC:END -->');
      expect(updatedContent).toContain('Custom instructions here');
    });

    it('should create Windsurf workflows when Windsurf is selected', async () => {
      queueSelections('windsurf', DONE);

      await initCommand.execute(testDir);

      const wsProposal = path.join(
        testDir,
        '.windsurf/workflows/openspec-proposal.md'
      );
      const wsApply = path.join(
        testDir,
        '.windsurf/workflows/openspec-apply.md'
      );
      const wsArchive = path.join(
        testDir,
        '.windsurf/workflows/openspec-archive.md'
      );

      expect(await fileExists(wsProposal)).toBe(true);
      expect(await fileExists(wsApply)).toBe(true);
      expect(await fileExists(wsArchive)).toBe(true);

      const proposalContent = await fs.readFile(wsProposal, 'utf-8');
      expect(proposalContent).toContain('---');
      expect(proposalContent).toContain('description: Scaffold a new OpenSpec change and validate strictly.');
      expect(proposalContent).toContain('auto_execution_mode: 3');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(wsApply, 'utf-8');
      expect(applyContent).toContain('---');
      expect(applyContent).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
      expect(applyContent).toContain('auto_execution_mode: 3');
      expect(applyContent).toContain('<!-- OPENSPEC:START -->');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(wsArchive, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('description: Archive a deployed OpenSpec change and update specs.');
      expect(archiveContent).toContain('auto_execution_mode: 3');
      expect(archiveContent).toContain('<!-- OPENSPEC:START -->');
      expect(archiveContent).toContain('Run `openspec archive <id> --yes`');
    });

    it('should always create AGENTS.md in project root', async () => {
      queueSelections(DONE);

      await initCommand.execute(testDir);

      const rootAgentsPath = path.join(testDir, 'AGENTS.md');
      expect(await fileExists(rootAgentsPath)).toBe(true);

      const content = await fs.readFile(rootAgentsPath, 'utf-8');
      expect(content).toContain('<!-- OPENSPEC:START -->');
      expect(content).toContain("@/openspec/AGENTS.md");
      expect(content).toContain('openspec update');
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

    it('should create Codex prompts with templates and placeholders', async () => {
      queueSelections('codex', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.codex/prompts/openspec-proposal.md'
      );
      const applyPath = path.join(
        testDir,
        '.codex/prompts/openspec-apply.md'
      );
      const archivePath = path.join(
        testDir,
        '.codex/prompts/openspec-archive.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('description: Scaffold a new OpenSpec change and validate strictly.');
      expect(proposalContent).toContain('argument-hint: request or feature description');
      expect(proposalContent).toContain('$ARGUMENTS');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
      expect(applyContent).toContain('argument-hint: change-id');
      expect(applyContent).toContain('$ARGUMENTS');
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('description: Archive a deployed OpenSpec change and update specs.');
      expect(archiveContent).toContain('argument-hint: change-id');
      expect(archiveContent).toContain('$ARGUMENTS');
      expect(archiveContent).toContain('openspec archive <id> --yes');
    });

    it('should create Kilo Code workflows with templates', async () => {
      queueSelections('kilocode', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.kilocode/workflows/openspec-proposal.md'
      );
      const applyPath = path.join(
        testDir,
        '.kilocode/workflows/openspec-apply.md'
      );
      const archivePath = path.join(
        testDir,
        '.kilocode/workflows/openspec-archive.md'
      );

      expect(await fileExists(proposalPath)).toBe(true);
      expect(await fileExists(applyPath)).toBe(true);
      expect(await fileExists(archivePath)).toBe(true);

      const proposalContent = await fs.readFile(proposalPath, 'utf-8');
      expect(proposalContent).toContain('<!-- OPENSPEC:START -->');
      expect(proposalContent).toContain('**Guardrails**');
      expect(proposalContent).not.toContain('---\n');

      const applyContent = await fs.readFile(applyPath, 'utf-8');
      expect(applyContent).toContain('Work through tasks sequentially');
      expect(applyContent).not.toContain('---\n');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('openspec list --specs');
      expect(archiveContent).not.toContain('---\n');
    });

    it('should create GitHub Copilot prompt files with templates', async () => {
      queueSelections('github-copilot', DONE);

      await initCommand.execute(testDir);

      const proposalPath = path.join(
        testDir,
        '.github/prompts/openspec-proposal.prompt.md'
      );
      const applyPath = path.join(
        testDir,
        '.github/prompts/openspec-apply.prompt.md'
      );
      const archivePath = path.join(
        testDir,
        '.github/prompts/openspec-archive.prompt.md'
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
      expect(applyContent).toContain('Work through tasks sequentially');

      const archiveContent = await fs.readFile(archivePath, 'utf-8');
      expect(archiveContent).toContain('---');
      expect(archiveContent).toContain('description: Archive a deployed OpenSpec change and update specs.');
      expect(archiveContent).toContain('$ARGUMENTS');
      expect(archiveContent).toContain('openspec archive <id> --yes');
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

    it('should allow extend mode with no additional native tools', async () => {
      queueSelections('claude', DONE, DONE);
      await initCommand.execute(testDir);
      await expect(initCommand.execute(testDir)).resolves.toBeUndefined();
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
      queueSelections(DONE);
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
        '.amazonq/prompts/openspec-proposal.md'
      );
      const applyPath = path.join(
        testDir,
        '.amazonq/prompts/openspec-apply.md'
      );
      const archivePath = path.join(
        testDir,
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
      await initCommand.execute(testDir);
      await initCommand.execute(testDir);

      const secondRunArgs = mockPrompt.mock.calls[1][0];
      const amazonQChoice = secondRunArgs.choices.find(
        (choice: any) => choice.value === 'amazon-q'
      );
      expect(amazonQChoice.configured).toBe(true);
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
