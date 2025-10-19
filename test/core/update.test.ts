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
  let prevCodexHome: string | undefined;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create openspec directory
    const openspecDir = path.join(testDir, 'openspec');
    await fs.mkdir(openspecDir, { recursive: true });

    updateCommand = new UpdateCommand();

    // Route Codex global directory into the test sandbox
    prevCodexHome = process.env.CODEX_HOME;
    process.env.CODEX_HOME = path.join(testDir, '.codex');
  });

  afterEach(async () => {
    // Clean up test directory
    await fs.rm(testDir, { recursive: true, force: true });
    if (prevCodexHome === undefined) delete process.env.CODEX_HOME;
    else process.env.CODEX_HOME = prevCodexHome;
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
    expect(updatedContent).toContain("@/openspec/AGENTS.md");
    expect(updatedContent).toContain('openspec update');
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

  it('should refresh existing Kilo Code workflows', async () => {
    const kilocodePath = path.join(
      testDir,
      '.kilocode/workflows/openspec-apply.md'
    );
    await fs.mkdir(path.dirname(kilocodePath), { recursive: true });
    const initialContent = `<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(kilocodePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(kilocodePath, 'utf-8');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');
    expect(updated.startsWith('<!-- OPENSPEC:START -->')).toBe(true);

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .kilocode/workflows/openspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Windsurf workflows', async () => {
    const wsPath = path.join(
      testDir,
      '.windsurf/workflows/openspec-apply.md'
    );
    await fs.mkdir(path.dirname(wsPath), { recursive: true });
    const initialContent = `## OpenSpec: Apply (Windsurf)
Intro
<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(wsPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(wsPath, 'utf-8');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');
    expect(updated).toContain('## OpenSpec: Apply (Windsurf)');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .windsurf/workflows/openspec-apply.md'
    );
    consoleSpy.mockRestore();
  });

  it('should refresh existing Codex prompts', async () => {
    const codexPath = path.join(
      testDir,
      '.codex/prompts/openspec-apply.md'
    );
    await fs.mkdir(path.dirname(codexPath), { recursive: true });
    const initialContent = `---\ndescription: Old description\nargument-hint: old-hint\n---\n\n$ARGUMENTS\n<!-- OPENSPEC:START -->\nOld body\n<!-- OPENSPEC:END -->`;
    await fs.writeFile(codexPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(codexPath, 'utf-8');
    expect(updated).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
    expect(updated).toContain('argument-hint: change-id');
    expect(updated).toContain('$ARGUMENTS');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');
    expect(updated).not.toContain('Old description');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .codex/prompts/openspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Codex prompts on update', async () => {
    const codexApply = path.join(
      testDir,
      '.codex/prompts/openspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(codexApply), { recursive: true });
    await fs.writeFile(
      codexApply,
      '---\ndescription: Old\nargument-hint: old\n---\n\n$ARGUMENTS\n<!-- OPENSPEC:START -->\nOld\n<!-- OPENSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const codexProposal = path.join(
      testDir,
      '.codex/prompts/openspec-proposal.md'
    );
    const codexArchive = path.join(
      testDir,
      '.codex/prompts/openspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(codexProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(codexArchive)).resolves.toBe(false);
  });

  it('should refresh existing GitHub Copilot prompts', async () => {
    const ghPath = path.join(
      testDir,
      '.github/prompts/openspec-apply.prompt.md'
    );
    await fs.mkdir(path.dirname(ghPath), { recursive: true });
    const initialContent = `---
description: Implement an approved OpenSpec change and keep tasks in sync.
---

$ARGUMENTS
<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(ghPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(ghPath, 'utf-8');
    expect(updated).toContain('description: Implement an approved OpenSpec change and keep tasks in sync.');
    expect(updated).toContain('$ARGUMENTS');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .github/prompts/openspec-apply.prompt.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing GitHub Copilot prompts on update', async () => {
    const ghApply = path.join(
      testDir,
      '.github/prompts/openspec-apply.prompt.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(ghApply), { recursive: true });
    await fs.writeFile(
      ghApply,
      '---\ndescription: Old\n---\n\n$ARGUMENTS\n<!-- OPENSPEC:START -->\nOld\n<!-- OPENSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const ghProposal = path.join(
      testDir,
      '.github/prompts/openspec-proposal.prompt.md'
    );
    const ghArchive = path.join(
      testDir,
      '.github/prompts/openspec-archive.prompt.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(ghProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(ghArchive)).resolves.toBe(false);
  });

  it('should refresh existing Factory slash commands', async () => {
    const factoryPath = path.join(
      testDir,
      '.factory/commands/openspec-proposal.md'
    );
    await fs.mkdir(path.dirname(factoryPath), { recursive: true });
    const initialContent = `---
description: Scaffold a new OpenSpec change and validate strictly.
argument-hint: request or feature description
---

<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(factoryPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(factoryPath, 'utf-8');
    expect(updated).toContain('description: Scaffold a new OpenSpec change and validate strictly.');
    expect(updated).toContain('argument-hint: request or feature description');
    expect(
      /<!-- OPENSPEC:START -->([\s\S]*?)<!-- OPENSPEC:END -->/u.exec(updated)?.[1]
    ).toContain('$ARGUMENTS');
    expect(updated).toContain('**Guardrails**');
    expect(updated).not.toContain('Old body');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('.factory/commands/openspec-proposal.md')
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Factory slash command files on update', async () => {
    const factoryApply = path.join(
      testDir,
      '.factory/commands/openspec-apply.md'
    );

    await fs.mkdir(path.dirname(factoryApply), { recursive: true });
    await fs.writeFile(
      factoryApply,
      `---
description: Old
argument-hint: old
---

<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const factoryProposal = path.join(
      testDir,
      '.factory/commands/openspec-proposal.md'
    );
    const factoryArchive = path.join(
      testDir,
      '.factory/commands/openspec-archive.md'
    );

    await expect(FileSystemUtils.fileExists(factoryProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(factoryArchive)).resolves.toBe(false);
  });

  it('should refresh existing Amazon Q Developer prompts', async () => {
    const aqPath = path.join(
      testDir,
      '.amazonq/prompts/openspec-apply.md'
    );
    await fs.mkdir(path.dirname(aqPath), { recursive: true });
    const initialContent = `---
description: Implement an approved OpenSpec change and keep tasks in sync.
---

The user wants to apply the following change. Use the openspec instructions to implement the approved change.

<ChangeId>
  $ARGUMENTS
</ChangeId>
<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(aqPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updatedContent = await fs.readFile(aqPath, 'utf-8');
    expect(updatedContent).toContain('**Guardrails**');
    expect(updatedContent).toContain('<!-- OPENSPEC:START -->');
    expect(updatedContent).toContain('<!-- OPENSPEC:END -->');
    expect(updatedContent).not.toContain('Old body');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('.amazonq/prompts/openspec-apply.md')
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Amazon Q Developer prompts on update', async () => {
    const aqApply = path.join(
      testDir,
      '.amazonq/prompts/openspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(aqApply), { recursive: true });
    await fs.writeFile(
      aqApply,
      '---\ndescription: Old\n---\n\nThe user wants to apply the following change.\n\n<ChangeId>\n  $ARGUMENTS\n</ChangeId>\n<!-- OPENSPEC:START -->\nOld\n<!-- OPENSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const aqProposal = path.join(
      testDir,
      '.amazonq/prompts/openspec-proposal.md'
    );
    const aqArchive = path.join(
      testDir,
      '.amazonq/prompts/openspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(aqProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(aqArchive)).resolves.toBe(false);
  });

  it('should refresh existing Auggie slash command files', async () => {
    const auggiePath = path.join(
      testDir,
      '.augment/commands/openspec-apply.md'
    );
    await fs.mkdir(path.dirname(auggiePath), { recursive: true });
    const initialContent = `---
description: Implement an approved OpenSpec change and keep tasks in sync.
argument-hint: change-id
---
<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`;
    await fs.writeFile(auggiePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updatedContent = await fs.readFile(auggiePath, 'utf-8');
    expect(updatedContent).toContain('**Guardrails**');
    expect(updatedContent).toContain('<!-- OPENSPEC:START -->');
    expect(updatedContent).toContain('<!-- OPENSPEC:END -->');
    expect(updatedContent).not.toContain('Old body');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('.augment/commands/openspec-apply.md')
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Auggie slash command files on update', async () => {
    const auggieApply = path.join(
      testDir,
      '.augment/commands/openspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(auggieApply), { recursive: true });
    await fs.writeFile(
      auggieApply,
      '---\ndescription: Old\nargument-hint: old\n---\n<!-- OPENSPEC:START -->\nOld\n<!-- OPENSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const auggieProposal = path.join(
      testDir,
      '.augment/commands/openspec-proposal.md'
    );
    const auggieArchive = path.join(
      testDir,
      '.augment/commands/openspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(auggieProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(auggieArchive)).resolves.toBe(false);
  });

  it('should refresh existing Crush slash command files', async () => {
    const crushPath = path.join(
      testDir,
      '.crush/commands/openspec/proposal.md'
    );
    await fs.mkdir(path.dirname(crushPath), { recursive: true });
    const initialContent = `---
name: OpenSpec: Proposal
description: Old description
category: OpenSpec
tags: [openspec, change]
---
<!-- OPENSPEC:START -->
Old slash content
<!-- OPENSPEC:END -->`;
    await fs.writeFile(crushPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(crushPath, 'utf-8');
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
      'Updated slash commands: .crush/commands/openspec/proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Crush slash command files on update', async () => {
    const crushApply = path.join(
      testDir,
      '.crush/commands/openspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(crushApply), { recursive: true });
    await fs.writeFile(
      crushApply,
      `---
name: OpenSpec: Apply
description: Old description
category: OpenSpec
tags: [openspec, apply]
---
<!-- OPENSPEC:START -->
Old body
<!-- OPENSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const crushProposal = path.join(
      testDir,
      '.crush/commands/openspec-proposal.md'
    );
    const crushArchive = path.join(
      testDir,
      '.crush/commands/openspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(crushProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(crushArchive)).resolves.toBe(false);
  });

  it('should preserve Windsurf content outside markers during update', async () => {
    const wsPath = path.join(
      testDir,
      '.windsurf/workflows/openspec-proposal.md'
    );
    await fs.mkdir(path.dirname(wsPath), { recursive: true });
    const initialContent = `## Custom Intro Title\nSome intro text\n<!-- OPENSPEC:START -->\nOld body\n<!-- OPENSPEC:END -->\n\nFooter stays`;
    await fs.writeFile(wsPath, initialContent);

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(wsPath, 'utf-8');
    expect(updated).toContain('## Custom Intro Title');
    expect(updated).toContain('Footer stays');
    expect(updated).not.toContain('Old body');
    expect(updated).toContain('Validate with `openspec validate <id> --strict`');
  });

  it('should not create missing Windsurf workflows on update', async () => {
    const wsApply = path.join(
      testDir,
      '.windsurf/workflows/openspec-apply.md'
    );
    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(wsApply), { recursive: true });
    await fs.writeFile(
      wsApply,
      '<!-- OPENSPEC:START -->\nOld\n<!-- OPENSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const wsProposal = path.join(
      testDir,
      '.windsurf/workflows/openspec-proposal.md'
    );
    const wsArchive = path.join(
      testDir,
      '.windsurf/workflows/openspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(wsProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(wsArchive)).resolves.toBe(false);
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
    expect(content).toContain("@/openspec/AGENTS.md");
    expect(content).toContain('openspec update');
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
    expect(updated).toContain("@/openspec/AGENTS.md");
    expect(updated).toContain('openspec update');
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
