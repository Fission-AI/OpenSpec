import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpdateCommand } from '../../src/core/update.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';
import { ToolRegistry } from '../../src/core/configurators/registry.js';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { randomUUID } from 'crypto';

describe('UpdateCommand', () => {
  let testDir: string;
  let updateCommand: UpdateCommand;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create openspec directory
    const openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });

    updateCommand = new UpdateCommand();
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('should update only existing CLAUDE.md file', async () => {
    // Create CLAUDE.md file with initial content
    const claudePath = path.join(testDir, 'CLAUDE.md');
    const initialContent = `# Project Instructions

Some existing content here.

<!-- OPENSPEC:START -->
Old OpenSpec content
<!-- OPENSPEC:END -->

More content after.`;
    await fs.writeFile(claudePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that CLAUDE.md was updated
    const updatedContent = await fs.readFile(claudePath, 'utf-8');
    expect(updatedContent).toContain('<!-- OPENSPEC:START -->');
    expect(updatedContent).toContain('<!-- OPENSPEC:END -->');
    expect(updatedContent).toContain('OpenSpec Instructions');
    expect(updatedContent).toContain('Some existing content here');
    expect(updatedContent).toContain('More content after');

    // Check console output
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Updated AI tool files: CLAUDE.md');
    consoleSpy.mockRestore();
  });

  it('should refresh existing Claude slash command files', async () => {
    const proposalPath = path.join(
      testDir,
      '.claude/commands/openspec/proposal.md'
    );
    await fs.mkdir(path.dirname(proposalPath), { recursive: true });
    const initialContent = `---
name: OpenSpec: Proposal
description: Old description
category: OpenSpec
tags: [openspec, change]
---
<!-- OPENSPEC:START -->
Old slash content
<!-- OPENSPEC:END -->`;
    await fs.writeFile(proposalPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(proposalPath, 'utf-8');
    expect(updated).toContain('name: OpenSpec: Proposal');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `openspec validate <id> --strict`'
    );
    expect(updated).not.toContain('Old slash content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .claude/commands/openspec/proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create CLAUDE.md if it does not exist', async () => {
    // Ensure CLAUDE.md does not exist
    const claudePath = path.join(testDir, 'CLAUDE.md');

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that CLAUDE.md was not created
    const fileExists = await FileSystemUtils.fileExists(claudePath);
    expect(fileExists).toBe(false);
  });

  it('should refresh existing Cursor slash command files', async () => {
    const cursorPath = path.join(testDir, '.cursor/commands/openspec-apply.md');
    await fs.mkdir(path.dirname(cursorPath), { recursive: true });
    const initialContent = `---
name: /openspec-apply
id: openspec-apply
category: OpenSpec
description: Old description
---
<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(cursorPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(cursorPath, 'utf-8');
    expect(updated).toContain('id: openspec-apply');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .cursor/commands/openspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing OpenCode slash command files', async () => {
    const openCodePath = path.join(
      testDir,
      '.opencode/command/openspec-apply.md'
    );
    await fs.mkdir(path.dirname(openCodePath), { recursive: true });
    const initialContent = `---
name: /openspec-apply
id: openspec-apply
category: OpenSpec
description: Old description
---
<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(openCodePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(openCodePath, 'utf-8');
    expect(updated).toContain('id: openspec-apply');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .opencode/command/openspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should handle no AI tool files present', async () => {
    // Execute update command with no AI tool files
    const consoleSpy = vi.spyOn(console, 'log');
    await updateCommand.execute(testDir);

    // Should only update OpenSpec instructions
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    consoleSpy.mockRestore();
  });

  it('should update multiple AI tool files if present', async () => {
    // TODO: When additional configurators are added (Cursor, Aider, etc.),
    // enhance this test to create multiple AI tool files and verify
    // that all existing files are updated in a single operation.
    // For now, we test with just CLAUDE.md.
    const claudePath = path.join(testDir, 'CLAUDE.md');
    await fs.mkdir(path.dirname(claudePath), { recursive: true });
    await fs.writeFile(
      claudePath,
      '<!-- OPENSPEC:START -->\nOld\n<!-- OPENSPEC:END -->'
    );

    const consoleSpy = vi.spyOn(console, 'log');
    await updateCommand.execute(testDir);

    // Should report updating with new format
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Updated AI tool files: CLAUDE.md');
    consoleSpy.mockRestore();
  });

  it('should skip creating missing slash commands during update', async () => {
    const proposalPath = path.join(
      testDir,
      '.claude/commands/openspec/proposal.md'
    );
    await fs.mkdir(path.dirname(proposalPath), { recursive: true });
    await fs.writeFile(
      proposalPath,
      `---
name: OpenSpec: Proposal
description: Existing file
category: OpenSpec
tags: [openspec, change]
---
<!-- OPENSPEC:START -->
Old content
<!-- OPENSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const applyExists = await FileSystemUtils.fileExists(
      path.join(testDir, '.claude/commands/openspec/apply.md')
    );
    const archiveExists = await FileSystemUtils.fileExists(
      path.join(testDir, '.claude/commands/openspec/archive.md')
    );

    expect(applyExists).toBe(false);
    expect(archiveExists).toBe(false);
  });

  it('should never create new AI tool files', async () => {
    // Get all configurators
    const configurators = ToolRegistry.getAll();

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that no new AI tool files were created
    for (const configurator of configurators) {
      const configPath = path.join(testDir, configurator.configFileName);
      const fileExists = await FileSystemUtils.fileExists(configPath);
      if (configurator.configFileName === 'AGENTS.md') {
        expect(fileExists).toBe(true);
      } else {
        expect(fileExists).toBe(false);
      }
    }
  });

  it('should update AGENTS.md in openspec directory', async () => {
    // Execute update command
    await updateCommand.execute(testDir);

    // Check that AGENTS.md was created/updated
    const agentsPath = path.join(testDir, 'openspec', 'AGENTS.md');
    const fileExists = await FileSystemUtils.fileExists(agentsPath);
    expect(fileExists).toBe(true);

    const content = await fs.readFile(agentsPath, 'utf-8');
    expect(content).toContain('# OpenSpec Instructions');
  });

  it('should create root AGENTS.md with managed block when missing', async () => {
    await updateCommand.execute(testDir);

    const rootAgentsPath = path.join(testDir, 'AGENTS.md');
    const exists = await FileSystemUtils.fileExists(rootAgentsPath);
    expect(exists).toBe(true);

    const content = await fs.readFile(rootAgentsPath, 'utf-8');
    expect(content).toContain('<!-- OPENSPEC:START -->');
    expect(content).toContain('OpenSpec Instructions');
    expect(content).toContain('<!-- OPENSPEC:END -->');
  });

  it('should refresh root AGENTS.md while preserving surrounding content', async () => {
    const rootAgentsPath = path.join(testDir, 'AGENTS.md');
    const original = `# Custom intro\n\n<!-- OPENSPEC:START -->\nOld content\n<!-- OPENSPEC:END -->\n\n# Footnotes`;
    await fs.writeFile(rootAgentsPath, original);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(rootAgentsPath, 'utf-8');
    expect(updated).toContain('# Custom intro');
    expect(updated).toContain('# Footnotes');
    expect(updated).toContain('OpenSpec Instructions');
    expect(updated).not.toContain('Old content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md, AGENTS.md)'
    );
    expect(logMessage).not.toContain('AGENTS.md (created)');

    consoleSpy.mockRestore();
  });

  it('should throw error if openspec directory does not exist', async () => {
    // Remove openspec directory
    await fs.rm(path.join(testDir, 'openspec'), {
      recursive: true,
      force: true,
    });

    // Execute update command and expect error
    await expect(updateCommand.execute(testDir)).rejects.toThrow(
      "No OpenSpec directory found. Run 'openspec init' first."
    );
  });

  it('should handle configurator errors gracefully', async () => {
    // Create CLAUDE.md file but make it read-only to cause an error
    const claudePath = path.join(testDir, 'CLAUDE.md');
    await fs.writeFile(
      claudePath,
      '<!-- OPENSPEC:START -->\nOld\n<!-- OPENSPEC:END -->'
    );
    await fs.chmod(claudePath, 0o444); // Read-only

    const consoleSpy = vi.spyOn(console, 'log');
    const errorSpy = vi.spyOn(console, 'error');
    const originalWriteFile = FileSystemUtils.writeFile.bind(FileSystemUtils);
    const writeSpy = vi
      .spyOn(FileSystemUtils, 'writeFile')
      .mockImplementation(async (filePath, content) => {
        if (filePath.endsWith('CLAUDE.md')) {
          throw new Error('EACCES: permission denied, open');
        }

        return originalWriteFile(filePath, content);
      });

    // Execute update command - should not throw
    await updateCommand.execute(testDir);

    // Should report the failure
    expect(errorSpy).toHaveBeenCalled();
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated OpenSpec instructions (openspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Failed to update: CLAUDE.md');

    // Restore permissions for cleanup
    await fs.chmod(claudePath, 0o644);
    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    writeSpy.mockRestore();
  });
});
