import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateApplyInstructions,
  printApplyInstructionsText,
} from '../../src/commands/workflow/instructions.js';

/**
 * Apply gates on the schema's `apply.requires` (tasks) alone, so a change whose
 * tasks file was written ahead of its specs reads as ready with no spec deltas
 * at all - the state `openspec validate` rejects. Apply has to say so.
 */
describe('generateApplyInstructions warnings', () => {
  let tempDir: string;
  let changeDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-apply-warnings-'));
    changeDir = path.join(tempDir, 'openspec', 'changes', 'my-change');
    fs.mkdirSync(changeDir, { recursive: true });
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
    fs.writeFileSync(path.join(changeDir, 'proposal.md'), '## Why\nx\n');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function writeTasks(): void {
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '## 1. Implementation\n- [ ] 1.1 Write the code\n'
    );
  }

  function writeSpecs(): void {
    fs.mkdirSync(path.join(changeDir, 'specs', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'specs', 'demo', 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Demo\nThe system SHALL demo.\n\n#### Scenario: Works\n- **WHEN** run\n- **THEN** works\n'
    );
  }

  it('warns when a ready change has no delta specs and no skip_specs marker', async () => {
    writeTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('ready');
    expect(instructions.warnings).toHaveLength(1);
    expect(instructions.warnings?.[0]).toContain('no delta specs');
    expect(instructions.warnings?.[0]).toContain('skip_specs: true');
    expect(instructions.warnings?.[0]).toContain('openspec validate my-change');
    expect(instructions.warnings?.[0]).toContain(
      'openspec instructions specs --change my-change'
    );
    expect(instructions.warnings?.[0]).toContain(path.join(changeDir, '.openspec.yaml'));
  });

  it('stays quiet once the change has a delta spec', async () => {
    writeTasks();
    writeSpecs();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('ready');
    expect(instructions.warnings).toBeUndefined();
  });

  it('stays quiet for a change that declares skip_specs', async () => {
    fs.writeFileSync(
      path.join(changeDir, '.openspec.yaml'),
      'schema: spec-driven\nskip_specs: true\n'
    );
    writeTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('ready');
    expect(instructions.warnings).toBeUndefined();
  });

  it('stays quiet while apply is still blocked on its own required artifacts', async () => {
    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('blocked');
    expect(instructions.warnings).toBeUndefined();
  });

  it('still warns once every task is done, so the gap surfaces before archive', async () => {
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '## 1. Implementation\n- [x] 1.1 Write the code\n'
    );

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('all_done');
    expect(instructions.warnings).toHaveLength(1);
  });

  it('prints the warnings section above the context files', async () => {
    writeTasks();
    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    printApplyInstructionsText(instructions);
    vi.restoreAllMocks();
    const output = lines.join('\n');

    expect(output).toContain('### ⚠️ Warnings');
    expect(output).toContain('no delta specs');
    expect(output.indexOf('### ⚠️ Warnings')).toBeLessThan(output.indexOf('### Context Files'));
  });

  it('prints no warnings section when there is nothing to warn about', async () => {
    writeTasks();
    writeSpecs();
    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    printApplyInstructionsText(instructions);
    vi.restoreAllMocks();

    expect(lines.join('\n')).not.toContain('Warnings');
  });
});
