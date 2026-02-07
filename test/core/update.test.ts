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
    testDir = path.join(os.tmpdir(), `lightspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });

    // Create lightspec directory
    const lightspecDir = path.join(testDir, 'lightspec');
    await fs.mkdir(lightspecDir, { recursive: true });

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

<!-- LIGHTSPEC:START -->
Old LightSpec content
<!-- LIGHTSPEC:END -->

More content after.`;
    await fs.writeFile(claudePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that CLAUDE.md was updated
    const updatedContent = await fs.readFile(claudePath, 'utf-8');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
    expect(updatedContent).toContain("@/lightspec/AGENTS.md");
    expect(updatedContent).toContain('lightspec update');
    expect(updatedContent).toContain('Some existing content here');
    expect(updatedContent).toContain('More content after');

    // Check console output
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Updated AI tool files: CLAUDE.md');
    consoleSpy.mockRestore();
  });

  it('should update only existing QWEN.md file', async () => {
    const qwenPath = path.join(testDir, 'QWEN.md');
    const initialContent = `# Qwen Instructions

Some existing content.

<!-- LIGHTSPEC:START -->
Old LightSpec content
<!-- LIGHTSPEC:END -->

More notes here.`;
    await fs.writeFile(qwenPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updatedContent = await fs.readFile(qwenPath, 'utf-8');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
    expect(updatedContent).toContain("@/lightspec/AGENTS.md");
    expect(updatedContent).toContain('lightspec update');
    expect(updatedContent).toContain('Some existing content.');
    expect(updatedContent).toContain('More notes here.');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Updated AI tool files: QWEN.md');

    consoleSpy.mockRestore();
  });

  it('should refresh existing Claude slash command files', async () => {
    const proposalPath = path.join(
      testDir,
      '.claude/commands/lightspec/proposal.md'
    );
    await fs.mkdir(path.dirname(proposalPath), { recursive: true });
    const initialContent = `---
name: LightSpec: Proposal
description: Old description
category: LightSpec
tags: [lightspec, change]
---
<!-- LIGHTSPEC:START -->
Old slash content
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(proposalPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(proposalPath, 'utf-8');
    expect(updated).toContain('name: LightSpec: Proposal');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `lightspec validate <id> --strict --no-interactive`'
    );
    expect(updated).not.toContain('Old slash content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .claude/commands/lightspec/proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Qwen slash command files', async () => {
    const applyPath = path.join(
      testDir,
      '.qwen/commands/lightspec-apply.toml'
    );
    await fs.mkdir(path.dirname(applyPath), { recursive: true });
    const initialContent = `description = "Implement an approved LightSpec change and keep tasks in sync."

prompt = """
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->
"""
`;
    await fs.writeFile(applyPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(applyPath, 'utf-8');
    expect(updated).toContain('description = "Implement an approved LightSpec change and keep tasks in sync."');
    expect(updated).toContain('prompt = """');
    expect(updated).toContain('<!-- LIGHTSPEC:START -->');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .qwen/commands/lightspec-apply.toml'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Qwen slash command files on update', async () => {
    const applyPath = path.join(
      testDir,
      '.qwen/commands/lightspec-apply.toml'
    );

    await fs.mkdir(path.dirname(applyPath), { recursive: true });
    await fs.writeFile(
      applyPath,
      `description = "Old description"

prompt = """
<!-- LIGHTSPEC:START -->
Old content
<!-- LIGHTSPEC:END -->
"""
`
    );

    await updateCommand.execute(testDir);

    const updatedApply = await fs.readFile(applyPath, 'utf-8');
    expect(updatedApply).toContain('Work through tasks sequentially');
    expect(updatedApply).not.toContain('Old content');

    const proposalPath = path.join(
      testDir,
      '.qwen/commands/lightspec-proposal.toml'
    );
    const archivePath = path.join(
      testDir,
      '.qwen/commands/lightspec-archive.toml'
    );

    await expect(FileSystemUtils.fileExists(proposalPath)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(archivePath)).resolves.toBe(false);
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

  it('should not create QWEN.md if it does not exist', async () => {
    const qwenPath = path.join(testDir, 'QWEN.md');
    await updateCommand.execute(testDir);
    await expect(FileSystemUtils.fileExists(qwenPath)).resolves.toBe(false);
  });

  it('should update only existing CLINE.md file', async () => {
    // Create CLINE.md file with initial content
    const clinePath = path.join(testDir, 'CLINE.md');
    const initialContent = `# Cline Rules

Some existing Cline rules here.

<!-- LIGHTSPEC:START -->
Old LightSpec content
<!-- LIGHTSPEC:END -->

More rules after.`;
    await fs.writeFile(clinePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that CLINE.md was updated
    const updatedContent = await fs.readFile(clinePath, 'utf-8');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
    expect(updatedContent).toContain("@/lightspec/AGENTS.md");
    expect(updatedContent).toContain('lightspec update');
    expect(updatedContent).toContain('Some existing Cline rules here');
    expect(updatedContent).toContain('More rules after');

    // Check console output
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Updated AI tool files: CLINE.md');
    consoleSpy.mockRestore();
  });

  it('should not create CLINE.md if it does not exist', async () => {
    // Ensure CLINE.md does not exist
    const clinePath = path.join(testDir, 'CLINE.md');

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that CLINE.md was not created
    const fileExists = await FileSystemUtils.fileExists(clinePath);
    expect(fileExists).toBe(false);
  });

  it('should refresh existing Cline workflow files', async () => {
    const proposalPath = path.join(
      testDir,
      '.clinerules/workflows/lightspec-proposal.md'
    );
    await fs.mkdir(path.dirname(proposalPath), { recursive: true });
    const initialContent = `# LightSpec: Proposal

Scaffold a new LightSpec change and validate strictly.

<!-- LIGHTSPEC:START -->
Old slash content
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(proposalPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(proposalPath, 'utf-8');
    expect(updated).toContain('# LightSpec: Proposal');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `lightspec validate <id> --strict --no-interactive`'
    );
    expect(updated).not.toContain('Old slash content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .clinerules/workflows/lightspec-proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Cursor slash command files', async () => {
    const cursorPath = path.join(testDir, '.cursor/commands/lightspec-apply.md');
    await fs.mkdir(path.dirname(cursorPath), { recursive: true });
    const initialContent = `---
name: /lightspec-apply
id: lightspec-apply
category: LightSpec
description: Old description
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(cursorPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(cursorPath, 'utf-8');
    expect(updated).toContain('id: lightspec-apply');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .cursor/commands/lightspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Continue prompt files', async () => {
    const continuePath = path.join(
      testDir,
      '.continue/prompts/lightspec-apply.prompt'
    );
    await fs.mkdir(path.dirname(continuePath), { recursive: true });
    const initialContent = `---
name: lightspec-apply
description: Old description
invokable: true
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(continuePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(continuePath, 'utf-8');
    expect(updated).toContain('name: lightspec-apply');
    expect(updated).toContain('invokable: true');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .continue/prompts/lightspec-apply.prompt'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Continue prompt files on update', async () => {
    const continueApply = path.join(
      testDir,
      '.continue/prompts/lightspec-apply.prompt'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(continueApply), { recursive: true });
    await fs.writeFile(
      continueApply,
      `---
name: lightspec-apply
description: Old description
invokable: true
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const continueProposal = path.join(
      testDir,
      '.continue/prompts/lightspec-proposal.prompt'
    );
    const continueArchive = path.join(
      testDir,
      '.continue/prompts/lightspec-archive.prompt'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(continueProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(continueArchive)).resolves.toBe(false);
  });

  it('should refresh existing OpenCode slash command files', async () => {
    const openCodePath = path.join(
      testDir,
      '.opencode/command/lightspec-apply.md'
    );
    await fs.mkdir(path.dirname(openCodePath), { recursive: true });
    const initialContent = `---
name: /lightspec-apply
id: lightspec-apply
category: LightSpec
description: Old description
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(openCodePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(openCodePath, 'utf-8');
    expect(updated).toContain('id: lightspec-apply');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .opencode/command/lightspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Kilo Code workflows', async () => {
    const kilocodePath = path.join(
      testDir,
      '.kilocode/workflows/lightspec-apply.md'
    );
    await fs.mkdir(path.dirname(kilocodePath), { recursive: true });
    const initialContent = `<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(kilocodePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(kilocodePath, 'utf-8');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');
    expect(updated.startsWith('<!-- LIGHTSPEC:START -->')).toBe(true);

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .kilocode/workflows/lightspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Windsurf workflows', async () => {
    const wsPath = path.join(
      testDir,
      '.windsurf/workflows/lightspec-apply.md'
    );
    await fs.mkdir(path.dirname(wsPath), { recursive: true });
    const initialContent = `## LightSpec: Apply (Windsurf)
Intro
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(wsPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(wsPath, 'utf-8');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');
    expect(updated).toContain('## LightSpec: Apply (Windsurf)');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .windsurf/workflows/lightspec-apply.md'
    );
    consoleSpy.mockRestore();
  });

  it('should refresh existing Antigravity workflows', async () => {
    const agPath = path.join(
      testDir,
      '.agent/workflows/lightspec-apply.md'
    );
    await fs.mkdir(path.dirname(agPath), { recursive: true });
    const initialContent = `---
description: Implement an approved LightSpec change and keep tasks in sync.
---

<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(agPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(agPath, 'utf-8');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');
    expect(updated).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
    expect(updated).not.toContain('auto_execution_mode: 3');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .agent/workflows/lightspec-apply.md'
    );
    consoleSpy.mockRestore();
  });

  it('should refresh existing Codex prompts', async () => {
    const codexPath = path.join(
      testDir,
      '.codex/prompts/lightspec-apply.md'
    );
    await fs.mkdir(path.dirname(codexPath), { recursive: true });
    const initialContent = `---\ndescription: Old description\nargument-hint: old-hint\n---\n\n$ARGUMENTS\n<!-- LIGHTSPEC:START -->\nOld body\n<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(codexPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(codexPath, 'utf-8');
    expect(updated).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
    expect(updated).toContain('argument-hint: change-id');
    expect(updated).toContain('$ARGUMENTS');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');
    expect(updated).not.toContain('Old description');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .codex/prompts/lightspec-apply.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Codex prompts on update', async () => {
    const codexApply = path.join(
      testDir,
      '.codex/prompts/lightspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(codexApply), { recursive: true });
    await fs.writeFile(
      codexApply,
      '---\ndescription: Old\nargument-hint: old\n---\n\n$ARGUMENTS\n<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const codexProposal = path.join(
      testDir,
      '.codex/prompts/lightspec-proposal.md'
    );
    const codexArchive = path.join(
      testDir,
      '.codex/prompts/lightspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(codexProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(codexArchive)).resolves.toBe(false);
  });

  it('should refresh existing GitHub Copilot prompts', async () => {
    const ghPath = path.join(
      testDir,
      '.github/prompts/lightspec-apply.prompt.md'
    );
    await fs.mkdir(path.dirname(ghPath), { recursive: true });
    const initialContent = `---
description: Implement an approved LightSpec change and keep tasks in sync.
---

$ARGUMENTS
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(ghPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(ghPath, 'utf-8');
    expect(updated).toContain('description: Implement an approved LightSpec change and keep tasks in sync.');
    expect(updated).toContain('$ARGUMENTS');
    expect(updated).toContain('Work through tasks sequentially');
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .github/prompts/lightspec-apply.prompt.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing GitHub Copilot prompts on update', async () => {
    const ghApply = path.join(
      testDir,
      '.github/prompts/lightspec-apply.prompt.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(ghApply), { recursive: true });
    await fs.writeFile(
      ghApply,
      '---\ndescription: Old\n---\n\n$ARGUMENTS\n<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const ghProposal = path.join(
      testDir,
      '.github/prompts/lightspec-proposal.prompt.md'
    );
    const ghArchive = path.join(
      testDir,
      '.github/prompts/lightspec-archive.prompt.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(ghProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(ghArchive)).resolves.toBe(false);
  });

  it('should refresh existing Gemini CLI TOML files without creating new ones', async () => {
    const geminiProposal = path.join(
      testDir,
      '.gemini/commands/lightspec/proposal.toml'
    );
    await fs.mkdir(path.dirname(geminiProposal), { recursive: true });
    const initialContent = `description = "Scaffold a new LightSpec change and validate strictly."

prompt = """
<!-- LIGHTSPEC:START -->
Old Gemini body
<!-- LIGHTSPEC:END -->
"""
`;
    await fs.writeFile(geminiProposal, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(geminiProposal, 'utf-8');
    expect(updated).toContain('description = "Scaffold a new LightSpec change and validate strictly."');
    expect(updated).toContain('prompt = """');
    expect(updated).toContain('<!-- LIGHTSPEC:START -->');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain('<!-- LIGHTSPEC:END -->');
    expect(updated).not.toContain('Old Gemini body');

    const geminiApply = path.join(
      testDir,
      '.gemini/commands/lightspec/apply.toml'
    );
    const geminiArchive = path.join(
      testDir,
      '.gemini/commands/lightspec/archive.toml'
    );

    await expect(FileSystemUtils.fileExists(geminiApply)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(geminiArchive)).resolves.toBe(false);

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .gemini/commands/lightspec/proposal.toml'
    );

    consoleSpy.mockRestore();
  });
  
  it('should refresh existing IFLOW slash commands', async () => {
    const iflowProposal = path.join(
      testDir,
      '.iflow/commands/lightspec-proposal.md'
    );
    await fs.mkdir(path.dirname(iflowProposal), { recursive: true });
    const initialContent = `description: Scaffold a new LightSpec change and validate strictly."

prompt = """
<!-- LIGHTSPEC:START -->
Old IFlow body
<!-- LIGHTSPEC:END -->
"""
`;
    await fs.writeFile(iflowProposal, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(iflowProposal, 'utf-8');
    expect(updated).toContain('description: Scaffold a new LightSpec change and validate strictly.');
    expect(updated).toContain('<!-- LIGHTSPEC:START -->');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain('<!-- LIGHTSPEC:END -->');
    expect(updated).not.toContain('Old IFlow body');

    const iflowApply = path.join(
      testDir,
      '.iflow/commands/lightspec-apply.md'
    );
    const iflowArchive = path.join(
      testDir,
      '.iflow/commands/lightspec-archive.md'
    );

    await expect(FileSystemUtils.fileExists(iflowApply)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(iflowArchive)).resolves.toBe(false);

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated slash commands: .iflow/commands/lightspec-proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Factory slash commands', async () => {
    const factoryPath = path.join(
      testDir,
      '.factory/commands/lightspec-proposal.md'
    );
    await fs.mkdir(path.dirname(factoryPath), { recursive: true });
    const initialContent = `---
description: Scaffold a new LightSpec change and validate strictly.
argument-hint: request or feature description
---

<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(factoryPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(factoryPath, 'utf-8');
    expect(updated).toContain('description: Scaffold a new LightSpec change and validate strictly.');
    expect(updated).toContain('argument-hint: request or feature description');
    expect(
      /<!-- LIGHTSPEC:START -->([\s\S]*?)<!-- LIGHTSPEC:END -->/u.exec(updated)?.[1]
    ).toContain('$ARGUMENTS');
    expect(updated).toContain('**Guardrails**');
    expect(updated).not.toContain('Old body');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('.factory/commands/lightspec-proposal.md')
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Factory slash command files on update', async () => {
    const factoryApply = path.join(
      testDir,
      '.factory/commands/lightspec-apply.md'
    );

    await fs.mkdir(path.dirname(factoryApply), { recursive: true });
    await fs.writeFile(
      factoryApply,
      `---
description: Old
argument-hint: old
---

<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const factoryProposal = path.join(
      testDir,
      '.factory/commands/lightspec-proposal.md'
    );
    const factoryArchive = path.join(
      testDir,
      '.factory/commands/lightspec-archive.md'
    );

    await expect(FileSystemUtils.fileExists(factoryProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(factoryArchive)).resolves.toBe(false);
  });

  it('should refresh existing Amazon Q Developer prompts', async () => {
    const aqPath = path.join(
      testDir,
      '.amazonq/prompts/lightspec-apply.md'
    );
    await fs.mkdir(path.dirname(aqPath), { recursive: true });
    const initialContent = `---
description: Implement an approved LightSpec change and keep tasks in sync.
---

The user wants to apply the following change. Use the lightspec instructions to implement the approved change.

<ChangeId>
  $ARGUMENTS
</ChangeId>
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(aqPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updatedContent = await fs.readFile(aqPath, 'utf-8');
    expect(updatedContent).toContain('**Guardrails**');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
    expect(updatedContent).not.toContain('Old body');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('.amazonq/prompts/lightspec-apply.md')
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Amazon Q Developer prompts on update', async () => {
    const aqApply = path.join(
      testDir,
      '.amazonq/prompts/lightspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(aqApply), { recursive: true });
    await fs.writeFile(
      aqApply,
      '---\ndescription: Old\n---\n\nThe user wants to apply the following change.\n\n<ChangeId>\n  $ARGUMENTS\n</ChangeId>\n<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const aqProposal = path.join(
      testDir,
      '.amazonq/prompts/lightspec-proposal.md'
    );
    const aqArchive = path.join(
      testDir,
      '.amazonq/prompts/lightspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(aqProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(aqArchive)).resolves.toBe(false);
  });

  it('should refresh existing Auggie slash command files', async () => {
    const auggiePath = path.join(
      testDir,
      '.augment/commands/lightspec-apply.md'
    );
    await fs.mkdir(path.dirname(auggiePath), { recursive: true });
    const initialContent = `---
description: Implement an approved LightSpec change and keep tasks in sync.
argument-hint: change-id
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(auggiePath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updatedContent = await fs.readFile(auggiePath, 'utf-8');
    expect(updatedContent).toContain('**Guardrails**');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
    expect(updatedContent).not.toContain('Old body');

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('.augment/commands/lightspec-apply.md')
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Auggie slash command files on update', async () => {
    const auggieApply = path.join(
      testDir,
      '.augment/commands/lightspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(auggieApply), { recursive: true });
    await fs.writeFile(
      auggieApply,
      '---\ndescription: Old\nargument-hint: old\n---\n<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const auggieProposal = path.join(
      testDir,
      '.augment/commands/lightspec-proposal.md'
    );
    const auggieArchive = path.join(
      testDir,
      '.augment/commands/lightspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(auggieProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(auggieArchive)).resolves.toBe(false);
  });

  it('should refresh existing CodeBuddy slash command files', async () => {
    const codeBuddyPath = path.join(
      testDir,
      '.codebuddy/commands/lightspec/proposal.md'
    );
    await fs.mkdir(path.dirname(codeBuddyPath), { recursive: true });
    const initialContent = `---
name: LightSpec: Proposal
description: Old description
category: LightSpec
tags: [lightspec, change]
---
<!-- LIGHTSPEC:START -->
Old slash content
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(codeBuddyPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(codeBuddyPath, 'utf-8');
    expect(updated).toContain('name: LightSpec: Proposal');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `lightspec validate <id> --strict --no-interactive`'
    );
    expect(updated).not.toContain('Old slash content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .codebuddy/commands/lightspec/proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing CodeBuddy slash command files on update', async () => {
    const codeBuddyApply = path.join(
      testDir,
      '.codebuddy/commands/lightspec/apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(codeBuddyApply), { recursive: true });
    await fs.writeFile(
      codeBuddyApply,
      `---
name: LightSpec: Apply
description: Old description
category: LightSpec
tags: [lightspec, apply]
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const codeBuddyProposal = path.join(
      testDir,
      '.codebuddy/commands/lightspec/proposal.md'
    );
    const codeBuddyArchive = path.join(
      testDir,
      '.codebuddy/commands/lightspec/archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(codeBuddyProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(codeBuddyArchive)).resolves.toBe(false);
  });

  it('should refresh existing Crush slash command files', async () => {
    const crushPath = path.join(
      testDir,
      '.crush/commands/lightspec/proposal.md'
    );
    await fs.mkdir(path.dirname(crushPath), { recursive: true });
    const initialContent = `---
name: LightSpec: Proposal
description: Old description
category: LightSpec
tags: [lightspec, change]
---
<!-- LIGHTSPEC:START -->
Old slash content
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(crushPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(crushPath, 'utf-8');
    expect(updated).toContain('name: LightSpec: Proposal');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `lightspec validate <id> --strict --no-interactive`'
    );
    expect(updated).not.toContain('Old slash content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .crush/commands/lightspec/proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing Crush slash command files on update', async () => {
    const crushApply = path.join(
      testDir,
      '.crush/commands/lightspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(crushApply), { recursive: true });
    await fs.writeFile(
      crushApply,
      `---
name: LightSpec: Apply
description: Old description
category: LightSpec
tags: [lightspec, apply]
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const crushProposal = path.join(
      testDir,
      '.crush/commands/lightspec-proposal.md'
    );
    const crushArchive = path.join(
      testDir,
      '.crush/commands/lightspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(crushProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(crushArchive)).resolves.toBe(false);
  });

  it('should refresh existing CoStrict slash command files', async () => {
    const costrictPath = path.join(
      testDir,
      '.cospec/lightspec/commands/lightspec-proposal.md'
    );
    await fs.mkdir(path.dirname(costrictPath), { recursive: true });
    const initialContent = `---
description: "Old description"
argument-hint: old-hint
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(costrictPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(costrictPath, 'utf-8');
    // For slash commands, only the content between LightSpec markers is updated
    expect(updated).toContain('description: "Old description"');
    expect(updated).toContain('argument-hint: old-hint');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `lightspec validate <id> --strict --no-interactive`'
    );
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .cospec/lightspec/commands/lightspec-proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing Qoder slash command files', async () => {
    const qoderPath = path.join(
      testDir,
      '.qoder/commands/lightspec/proposal.md'
    );
    await fs.mkdir(path.dirname(qoderPath), { recursive: true });
    const initialContent = `---
name: LightSpec: Proposal
description: Old description
category: LightSpec
tags: [lightspec, change]
---
<!-- LIGHTSPEC:START -->
Old slash content
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(qoderPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(qoderPath, 'utf-8');
    expect(updated).toContain('name: LightSpec: Proposal');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `lightspec validate <id> --strict --no-interactive`'
    );
    expect(updated).not.toContain('Old slash content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .qoder/commands/lightspec/proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should refresh existing RooCode slash command files', async () => {
    const rooPath = path.join(
      testDir,
      '.roo/commands/lightspec-proposal.md'
    );
    await fs.mkdir(path.dirname(rooPath), { recursive: true });
    const initialContent = `# LightSpec: Proposal

Old description

<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`;
    await fs.writeFile(rooPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(rooPath, 'utf-8');
    // For RooCode, the header is Markdown, preserve it and update only managed block
    expect(updated).toContain('# LightSpec: Proposal');
    expect(updated).toContain('**Guardrails**');
    expect(updated).toContain(
      'Validate with `lightspec validate <id> --strict --no-interactive`'
    );
    expect(updated).not.toContain('Old body');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain(
      'Updated slash commands: .roo/commands/lightspec-proposal.md'
    );

    consoleSpy.mockRestore();
  });

  it('should not create missing RooCode slash command files on update', async () => {
    const rooApply = path.join(
      testDir,
      '.roo/commands/lightspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(rooApply), { recursive: true });
    await fs.writeFile(
      rooApply,
      `# LightSpec: Apply

<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const rooProposal = path.join(
      testDir,
      '.roo/commands/lightspec-proposal.md'
    );
    const rooArchive = path.join(
      testDir,
      '.roo/commands/lightspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(rooProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(rooArchive)).resolves.toBe(false);
  });

  it('should not create missing CoStrict slash command files on update', async () => {
    const costrictApply = path.join(
      testDir,
      '.cospec/lightspec/commands/lightspec-apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(costrictApply), { recursive: true });
    await fs.writeFile(
      costrictApply,
      `---
description: "Old"
argument-hint: old
---
<!-- LIGHTSPEC:START -->
Old
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const costrictProposal = path.join(
      testDir,
      '.cospec/lightspec/commands/lightspec-proposal.md'
    );
    const costrictArchive = path.join(
      testDir,
      '.cospec/lightspec/commands/lightspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(costrictProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(costrictArchive)).resolves.toBe(false);
  });

  it('should not create missing Qoder slash command files on update', async () => {
    const qoderApply = path.join(
      testDir,
      '.qoder/commands/lightspec/apply.md'
    );

    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(qoderApply), { recursive: true });
    await fs.writeFile(
      qoderApply,
      `---
name: LightSpec: Apply
description: Old description
category: LightSpec
tags: [lightspec, apply]
---
<!-- LIGHTSPEC:START -->
Old body
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const qoderProposal = path.join(
      testDir,
      '.qoder/commands/lightspec/proposal.md'
    );
    const qoderArchive = path.join(
      testDir,
      '.qoder/commands/lightspec/archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(qoderProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(qoderArchive)).resolves.toBe(false);
  });

  it('should update only existing COSTRICT.md file', async () => {
    // Create COSTRICT.md file with initial content
    const costrictPath = path.join(testDir, 'COSTRICT.md');
    const initialContent = `# CoStrict Instructions

Some existing CoStrict instructions here.

<!-- LIGHTSPEC:START -->
Old LightSpec content
<!-- LIGHTSPEC:END -->

More instructions after.`;
    await fs.writeFile(costrictPath, initialContent);

    const consoleSpy = vi.spyOn(console, 'log');

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that COSTRICT.md was updated
    const updatedContent = await fs.readFile(costrictPath, 'utf-8');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:START -->');
    expect(updatedContent).toContain('<!-- LIGHTSPEC:END -->');
    expect(updatedContent).toContain("@/lightspec/AGENTS.md");
    expect(updatedContent).toContain('lightspec update');
    expect(updatedContent).toContain('Some existing CoStrict instructions here');
    expect(updatedContent).toContain('More instructions after');

    // Check console output
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Updated AI tool files: COSTRICT.md');
    consoleSpy.mockRestore();
  });


  it('should not create COSTRICT.md if it does not exist', async () => {
    // Ensure COSTRICT.md does not exist
    const costrictPath = path.join(testDir, 'COSTRICT.md');

    // Execute update command
    await updateCommand.execute(testDir);

    // Check that COSTRICT.md was not created
    const fileExists = await FileSystemUtils.fileExists(costrictPath);
    expect(fileExists).toBe(false);
  });

  it('should preserve CoStrict content outside markers during update', async () => {
    const costrictPath = path.join(
      testDir,
      '.cospec/lightspec/commands/lightspec-proposal.md'
    );
    await fs.mkdir(path.dirname(costrictPath), { recursive: true });
    const initialContent = `## Custom Intro Title\nSome intro text\n<!-- LIGHTSPEC:START -->\nOld body\n<!-- LIGHTSPEC:END -->\n\nFooter stays`;
    await fs.writeFile(costrictPath, initialContent);

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(costrictPath, 'utf-8');
    expect(updated).toContain('## Custom Intro Title');
    expect(updated).toContain('Footer stays');
    expect(updated).not.toContain('Old body');
    expect(updated).toContain('Validate with `lightspec validate <id> --strict --no-interactive`');
  });

  it('should handle configurator errors gracefully for CoStrict', async () => {
    // Create COSTRICT.md file but make it read-only to cause an error
    const costrictPath = path.join(testDir, 'COSTRICT.md');
    await fs.writeFile(
      costrictPath,
      '<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
    );

    const consoleSpy = vi.spyOn(console, 'log');
    const errorSpy = vi.spyOn(console, 'error');
    const originalWriteFile = FileSystemUtils.writeFile.bind(FileSystemUtils);
    const writeSpy = vi
      .spyOn(FileSystemUtils, 'writeFile')
      .mockImplementation(async (filePath, content) => {
        if (filePath.endsWith('COSTRICT.md')) {
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
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Failed to update: COSTRICT.md');

    consoleSpy.mockRestore();
    errorSpy.mockRestore();
    writeSpy.mockRestore();
  });

  it('should preserve Windsurf content outside markers during update', async () => {
    const wsPath = path.join(
      testDir,
      '.windsurf/workflows/lightspec-proposal.md'
    );
    await fs.mkdir(path.dirname(wsPath), { recursive: true });
    const initialContent = `## Custom Intro Title\nSome intro text\n<!-- LIGHTSPEC:START -->\nOld body\n<!-- LIGHTSPEC:END -->\n\nFooter stays`;
    await fs.writeFile(wsPath, initialContent);

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(wsPath, 'utf-8');
    expect(updated).toContain('## Custom Intro Title');
    expect(updated).toContain('Footer stays');
    expect(updated).not.toContain('Old body');
    expect(updated).toContain('Validate with `lightspec validate <id> --strict --no-interactive`');
  });

  it('should not create missing Windsurf workflows on update', async () => {
    const wsApply = path.join(
      testDir,
      '.windsurf/workflows/lightspec-apply.md'
    );
    // Only create apply; leave proposal and archive missing
    await fs.mkdir(path.dirname(wsApply), { recursive: true });
    await fs.writeFile(
      wsApply,
      '<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
    );

    await updateCommand.execute(testDir);

    const wsProposal = path.join(
      testDir,
      '.windsurf/workflows/lightspec-proposal.md'
    );
    const wsArchive = path.join(
      testDir,
      '.windsurf/workflows/lightspec-archive.md'
    );

    // Confirm they weren't created by update
    await expect(FileSystemUtils.fileExists(wsProposal)).resolves.toBe(false);
    await expect(FileSystemUtils.fileExists(wsArchive)).resolves.toBe(false);
  });

  it('should handle no AI tool files present', async () => {
    // Execute update command with no AI tool files
    const consoleSpy = vi.spyOn(console, 'log');
    await updateCommand.execute(testDir);

    // Should only update LightSpec instructions
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
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
      '<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
    );

    const consoleSpy = vi.spyOn(console, 'log');
    await updateCommand.execute(testDir);

    // Should report updating with new format
    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md'
    );
    expect(logMessage).toContain('AGENTS.md (created)');
    expect(logMessage).toContain('Updated AI tool files: CLAUDE.md');
    consoleSpy.mockRestore();
  });

  it('should skip creating missing slash commands during update', async () => {
    const proposalPath = path.join(
      testDir,
      '.claude/commands/lightspec/proposal.md'
    );
    await fs.mkdir(path.dirname(proposalPath), { recursive: true });
    await fs.writeFile(
      proposalPath,
      `---
name: LightSpec: Proposal
description: Existing file
category: LightSpec
tags: [lightspec, change]
---
<!-- LIGHTSPEC:START -->
Old content
<!-- LIGHTSPEC:END -->`
    );

    await updateCommand.execute(testDir);

    const applyExists = await FileSystemUtils.fileExists(
      path.join(testDir, '.claude/commands/lightspec/apply.md')
    );
    const archiveExists = await FileSystemUtils.fileExists(
      path.join(testDir, '.claude/commands/lightspec/archive.md')
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

  it('should update AGENTS.md in lightspec directory', async () => {
    // Execute update command
    await updateCommand.execute(testDir);

    // Check that AGENTS.md was created/updated
    const agentsPath = path.join(testDir, 'lightspec', 'AGENTS.md');
    const fileExists = await FileSystemUtils.fileExists(agentsPath);
    expect(fileExists).toBe(true);

    const content = await fs.readFile(agentsPath, 'utf-8');
    expect(content).toContain('# LightSpec Instructions');
  });

  it('should create root AGENTS.md with managed block when missing', async () => {
    await updateCommand.execute(testDir);

    const rootAgentsPath = path.join(testDir, 'AGENTS.md');
    const exists = await FileSystemUtils.fileExists(rootAgentsPath);
    expect(exists).toBe(true);

    const content = await fs.readFile(rootAgentsPath, 'utf-8');
    expect(content).toContain('<!-- LIGHTSPEC:START -->');
    expect(content).toContain("@/lightspec/AGENTS.md");
    expect(content).toContain('lightspec update');
    expect(content).toContain('<!-- LIGHTSPEC:END -->');
  });

  it('should refresh root AGENTS.md while preserving surrounding content', async () => {
    const rootAgentsPath = path.join(testDir, 'AGENTS.md');
    const original = `# Custom intro\n\n<!-- LIGHTSPEC:START -->\nOld content\n<!-- LIGHTSPEC:END -->\n\n# Footnotes`;
    await fs.writeFile(rootAgentsPath, original);

    const consoleSpy = vi.spyOn(console, 'log');

    await updateCommand.execute(testDir);

    const updated = await fs.readFile(rootAgentsPath, 'utf-8');
    expect(updated).toContain('# Custom intro');
    expect(updated).toContain('# Footnotes');
    expect(updated).toContain("@/lightspec/AGENTS.md");
    expect(updated).toContain('lightspec update');
    expect(updated).not.toContain('Old content');

    const [logMessage] = consoleSpy.mock.calls[0];
    expect(logMessage).toContain(
      'Updated LightSpec instructions (lightspec/AGENTS.md, AGENTS.md)'
    );
    expect(logMessage).not.toContain('AGENTS.md (created)');

    consoleSpy.mockRestore();
  });

  it('should throw error if lightspec directory does not exist', async () => {
    // Remove lightspec directory
    await fs.rm(path.join(testDir, 'lightspec'), {
      recursive: true,
      force: true,
    });

    // Execute update command and expect error
    await expect(updateCommand.execute(testDir)).rejects.toThrow(
      "No LightSpec directory found. Run 'lightspec init' first."
    );
  });

  it('should handle configurator errors gracefully', async () => {
    // Create CLAUDE.md file but make it read-only to cause an error
    const claudePath = path.join(testDir, 'CLAUDE.md');
    await fs.writeFile(
      claudePath,
      '<!-- LIGHTSPEC:START -->\nOld\n<!-- LIGHTSPEC:END -->'
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
      'Updated LightSpec instructions (lightspec/AGENTS.md'
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
