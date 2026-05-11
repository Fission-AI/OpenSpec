import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fsSync from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateApplyInstructions,
  printApplyInstructionsText,
  generateArchiveInstructions,
  printArchiveInstructionsText,
} from '../../src/commands/workflow/instructions.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function createProjectConfig(projectRoot: string, content: string): Promise<void> {
  const configDir = path.join(projectRoot, 'openspec');
  await fs.mkdir(configDir, { recursive: true });
  await fs.writeFile(path.join(configDir, 'config.yaml'), content);
}

async function createChange(projectRoot: string, changeName: string): Promise<string> {
  const changeDir = path.join(projectRoot, 'openspec', 'changes', changeName);
  await fs.mkdir(changeDir, { recursive: true });
  await fs.writeFile(path.join(changeDir, 'proposal.md'), '## Why\nTest.\n\n## What Changes\n- **test:** placeholder');
  await fs.writeFile(path.join(changeDir, 'design.md'), '# Design');

  const specsDir = path.join(changeDir, 'specs');
  await fs.mkdir(specsDir, { recursive: true });
  await fs.writeFile(path.join(specsDir, 'test.md'), '# Spec');

  await fs.writeFile(
    path.join(changeDir, 'tasks.md'),
    '## 1. Tasks\n\n- [ ] 1.1 Do thing\n- [ ] 1.2 Do another thing\n'
  );
  return changeDir;
}

// ---------------------------------------------------------------------------
// generateApplyInstructions
// ---------------------------------------------------------------------------

describe('generateApplyInstructions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-apply-'));
    await createChange(tempDir, 'my-change');
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('omits context and rules when no config exists', async () => {
    const result = await generateApplyInstructions(tempDir, 'my-change');

    expect(result.context).toBeUndefined();
    expect(result.rules).toBeUndefined();
  });

  it('includes context when config has a context field', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\ncontext: |\n  Tech stack: TypeScript\n'
    );

    const result = await generateApplyInstructions(tempDir, 'my-change');

    expect(result.context).toContain('Tech stack: TypeScript');
  });

  it('includes rules from rules.apply when present', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\nrules:\n  apply:\n    - Run tests before marking tasks done\n    - Keep PRs small\n'
    );

    const result = await generateApplyInstructions(tempDir, 'my-change');

    expect(result.rules).toEqual(['Run tests before marking tasks done', 'Keep PRs small']);
  });

  it('includes both context and rules.apply when both configured', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\ncontext: Project context\nrules:\n  apply:\n    - Rule 1\n'
    );

    const result = await generateApplyInstructions(tempDir, 'my-change');

    expect(result.context).toBe('Project context');
    expect(result.rules).toEqual(['Rule 1']);
  });

  it('omits rules when config has only artifact rules (no rules.apply)', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\nrules:\n  proposal:\n    - Artifact rule\n'
    );

    const result = await generateApplyInstructions(tempDir, 'my-change');

    expect(result.rules).toBeUndefined();
  });

  it('omits rules when rules.apply is an empty array', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\nrules:\n  apply: []\n'
    );

    const result = await generateApplyInstructions(tempDir, 'my-change');

    expect(result.rules).toBeUndefined();
  });

  it('carries context and rules in JSON output (auto via JSON.stringify)', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\ncontext: My context\nrules:\n  apply:\n    - My rule\n'
    );

    const result = await generateApplyInstructions(tempDir, 'my-change');
    const json = JSON.parse(JSON.stringify(result));

    expect(json.context).toBe('My context');
    expect(json.rules).toEqual(['My rule']);
  });
});

// ---------------------------------------------------------------------------
// printApplyInstructionsText
// ---------------------------------------------------------------------------

describe('printApplyInstructionsText', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function captureOutput(instructions: Parameters<typeof printApplyInstructionsText>[0]): string {
    consoleSpy.mockReset();
    printApplyInstructionsText(instructions);
    return consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
  }

  const baseInstructions = {
    changeName: 'test-change',
    changeDir: '/tmp/test',
    schemaName: 'spec-driven',
    contextFiles: {},
    progress: { total: 2, complete: 0, remaining: 2 },
    tasks: [],
    state: 'ready' as const,
    instruction: 'Work through tasks.',
  };

  it('renders project_context block when context is present', () => {
    const output = captureOutput({ ...baseInstructions, context: 'Project background' });

    expect(output).toContain('<project_context>');
    expect(output).toContain('Project background');
    expect(output).toContain('</project_context>');
  });

  it('omits project_context block when context is absent', () => {
    const output = captureOutput({ ...baseInstructions });

    expect(output).not.toContain('<project_context>');
  });

  it('renders rules block when rules are present', () => {
    const output = captureOutput({ ...baseInstructions, rules: ['Run tests', 'Keep PRs small'] });

    expect(output).toContain('<rules>');
    expect(output).toContain('- Run tests');
    expect(output).toContain('- Keep PRs small');
    expect(output).toContain('</rules>');
  });

  it('omits rules block when rules are absent', () => {
    const output = captureOutput({ ...baseInstructions });

    expect(output).not.toContain('<rules>');
  });

  it('renders both context and rules blocks when both present', () => {
    const output = captureOutput({
      ...baseInstructions,
      context: 'My context',
      rules: ['Rule A'],
    });

    expect(output).toContain('<project_context>');
    expect(output).toContain('My context');
    expect(output).toContain('<rules>');
    expect(output).toContain('- Rule A');
  });

  it('includes instruction section regardless of context/rules', () => {
    const output = captureOutput({ ...baseInstructions });

    expect(output).toContain('### Instruction');
    expect(output).toContain('Work through tasks.');
  });
});

// ---------------------------------------------------------------------------
// generateArchiveInstructions
// ---------------------------------------------------------------------------

describe('generateArchiveInstructions', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-test-archive-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns template content when no config exists', async () => {
    const result = await generateArchiveInstructions(tempDir);

    expect(result.template).toBeTruthy();
    expect(result.context).toBeUndefined();
    expect(result.rules).toBeUndefined();
  });

  it('includes context when config has a context field', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\ncontext: Archive context\n'
    );

    const result = await generateArchiveInstructions(tempDir);

    expect(result.context).toBe('Archive context');
  });

  it('includes rules from rules.archive when present', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\nrules:\n  archive:\n    - Verify specs are synced\n    - Check task completion\n'
    );

    const result = await generateArchiveInstructions(tempDir);

    expect(result.rules).toEqual(['Verify specs are synced', 'Check task completion']);
  });

  it('includes both context and rules.archive when both configured', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\ncontext: My project\nrules:\n  archive:\n    - Rule 1\n'
    );

    const result = await generateArchiveInstructions(tempDir);

    expect(result.context).toBe('My project');
    expect(result.rules).toEqual(['Rule 1']);
  });

  it('omits rules when config has only artifact rules (no rules.archive)', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\nrules:\n  specs:\n    - Artifact rule\n'
    );

    const result = await generateArchiveInstructions(tempDir);

    expect(result.rules).toBeUndefined();
  });

  it('omits rules when config has rules.apply but not rules.archive', async () => {
    await createProjectConfig(
      tempDir,
      'schema: spec-driven\nrules:\n  apply:\n    - Apply rule\n'
    );

    const result = await generateArchiveInstructions(tempDir);

    expect(result.rules).toBeUndefined();
  });

  it('omits context and rules fields from JSON when absent', async () => {
    const result = await generateArchiveInstructions(tempDir);
    const json = JSON.parse(JSON.stringify(result));

    expect(Object.prototype.hasOwnProperty.call(json, 'context')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(json, 'rules')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// printArchiveInstructionsText
// ---------------------------------------------------------------------------

describe('printArchiveInstructionsText', () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function captureOutput(instructions: Parameters<typeof printArchiveInstructionsText>[0]): string {
    consoleSpy.mockReset();
    printArchiveInstructionsText(instructions);
    return consoleSpy.mock.calls.map((c) => c.join(' ')).join('\n');
  }

  it('renders the archive template content', () => {
    const output = captureOutput({ template: 'Archive workflow steps here.' });

    expect(output).toContain('Archive workflow steps here.');
  });

  it('renders project_context block when context is present', () => {
    const output = captureOutput({ template: 'Template', context: 'Project background' });

    expect(output).toContain('<project_context>');
    expect(output).toContain('Project background');
    expect(output).toContain('</project_context>');
  });

  it('omits project_context block when context is absent', () => {
    const output = captureOutput({ template: 'Template' });

    expect(output).not.toContain('<project_context>');
  });

  it('renders rules block when rules are present', () => {
    const output = captureOutput({ template: 'Template', rules: ['Verify sync', 'Check tasks'] });

    expect(output).toContain('<rules>');
    expect(output).toContain('- Verify sync');
    expect(output).toContain('- Check tasks');
    expect(output).toContain('</rules>');
  });

  it('omits rules block when rules are absent', () => {
    const output = captureOutput({ template: 'Template' });

    expect(output).not.toContain('<rules>');
  });

  it('renders template before context/rules sections', () => {
    const output = captureOutput({
      template: 'Template content',
      context: 'Context content',
      rules: ['Rule A'],
    });

    const templateIdx = output.indexOf('Template content');
    const contextIdx = output.indexOf('<project_context>');
    const rulesIdx = output.indexOf('<rules>');

    expect(templateIdx).toBeLessThan(contextIdx);
    expect(templateIdx).toBeLessThan(rulesIdx);
  });
});
