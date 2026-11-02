import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  generateApplyInstructions,
  printApplyInstructionsText,
} from '../../src/commands/workflow/instructions.js';
import { Validator } from '../../src/core/validation/validator.js';

/**
 * Apply gates on the schema's `apply.requires` (tasks) alone, so a change whose
 * tasks file was written ahead of its specs reads as ready with no spec deltas
 * at all - the state `openspec validate` rejects. Apply must not call that
 * ready: it blocks, with the repair in `instruction`. Past implementation
 * (`all_done`) the same gap stays a warning.
 */
describe('generateApplyInstructions spec gaps', () => {
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

  function writeDoneTasks(): void {
    fs.writeFileSync(
      path.join(changeDir, 'tasks.md'),
      '## 1. Implementation\n- [x] 1.1 Write the code\n'
    );
  }

  function writeSpecs(): void {
    fs.mkdirSync(path.join(changeDir, 'specs', 'demo'), { recursive: true });
    fs.writeFileSync(
      path.join(changeDir, 'specs', 'demo', 'spec.md'),
      '## ADDED Requirements\n\n### Requirement: Demo\nThe system SHALL demo.\n\n#### Scenario: Works\n- **WHEN** run\n- **THEN** works\n'
    );
  }

  it('blocks a change with no delta specs and no skip_specs marker', async () => {
    writeTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    // `ready` was the bug: every skill pauses on `blocked` and none was
    // obliged to read a warning, so apply green-lit a change validate fails.
    expect(instructions.state).toBe('blocked');
    expect(instructions.instruction).toContain('no delta specs');
    expect(instructions.instruction).toContain('skip_specs: true');
    expect(instructions.instruction).toContain('openspec validate my-change');
    expect(instructions.instruction).toContain(
      'openspec instructions specs --change my-change'
    );
    // Not the absolute path: on Windows the CLI resolves `os.tmpdir()`'s short
    // form (C:\Users\RUNNER~1) to its long one, so only the tail is stable.
    expect(instructions.instruction).toContain(
      path.join('my-change', '.openspec.yaml')
    );
    // The reason lives in one place, not two.
    expect(instructions.warnings).toBeUndefined();
  });

  it('names no missing artifacts when it blocks on the spec gap', async () => {
    writeTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    // The skills branch on this: `missingArtifacts` non-empty hands off to
    // continue, which would be the wrong move for a change whose required
    // artifacts are all present.
    expect(instructions.state).toBe('blocked');
    expect(instructions.missingArtifacts).toBeUndefined();
  });

  it('blocks a ready change whose only spec problem is a stray delta file', async () => {
    // Deltas exist, so this is not the no-specs case: the file just sits where
    // the merge path never reads it, and validate rejects it all the same.
    writeTasks();
    writeSpecs();
    fs.writeFileSync(
      path.join(changeDir, 'specs', 'demo', 'notes.md'),
      '## ADDED Requirements\n\n### Requirement: Stray\nThe system SHALL stray.\n\n#### Scenario: Works\n- **WHEN** run\n- **THEN** works\n'
    );

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('blocked');
    expect(instructions.instruction).toContain('specs/demo/notes.md');
    expect(instructions.instruction).toContain('specs/demo/spec.md');
    expect(instructions.warnings).toBeUndefined();
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
    writeDoneTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    // Nothing left to block: implementation is over, and archive decides what
    // happens next. Blocking here would only strand a finished change.
    expect(instructions.state).toBe('all_done');
    expect(instructions.warnings).toHaveLength(1);
  });

  it('prints the warnings section above the context files', async () => {
    writeDoneTasks();
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

  it('stays quiet for a schema that produces no specs at all', async () => {
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'mini');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: mini',
        'version: 1',
        'artifacts:',
        '  - id: proposal',
        '    generates: proposal.md',
        '    description: p',
        '    template: proposal.md',
        '  - id: tasks',
        '    generates: tasks.md',
        '    description: t',
        '    template: tasks.md',
        '    requires: [proposal]',
        'apply:',
        '  requires: [tasks]',
        '  tracks: tasks.md',
        '',
      ].join('\n')
    );
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: mini\n');
    writeTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('ready');
    expect(instructions.warnings).toBeUndefined();
  });

  it('warns for a custom schema whose spec artifact is named something else', async () => {
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'renamed');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: renamed',
        'version: 1',
        'artifacts:',
        '  - id: proposal',
        '    generates: proposal.md',
        '    description: p',
        '    template: proposal.md',
        '  - id: contracts',
        '    generates: "specs/**/*.md"',
        '    description: c',
        '    template: spec.md',
        '    requires: [proposal]',
        '  - id: tasks',
        '    generates: tasks.md',
        '    description: t',
        '    template: tasks.md',
        '    requires: [proposal]',
        'apply:',
        '  requires: [tasks]',
        '  tracks: tasks.md',
        '',
      ].join('\n')
    );
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: renamed\n');
    writeTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('blocked');
    // The remediation has to name this schema's own artifact. Hardcoding
    // `specs` sent the agent to an artifact this schema does not declare, so
    // the repair dead-ended at the step meant to resolve it.
    expect(instructions.instruction).toContain(
      'openspec instructions contracts --change my-change'
    );
    expect(instructions.instruction).not.toContain('openspec instructions specs');
  });

  it('falls back to a placeholder when a schema declares two spec artifacts', async () => {
    // No single right answer, so the command must not pick one and present it
    // as the step to run.
    const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'twospec');
    fs.mkdirSync(schemaDir, { recursive: true });
    fs.writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: twospec',
        'version: 1',
        'artifacts:',
        '  - id: proposal',
        '    generates: proposal.md',
        '    description: p',
        '    template: proposal.md',
        '  - id: contracts',
        '    generates: "specs/**/*.md"',
        '    description: c',
        '    template: spec.md',
        '    requires: [proposal]',
        '  - id: schemas',
        '    generates: "specs/**/*.yaml"',
        '    description: s',
        '    template: spec.md',
        '    requires: [proposal]',
        '  - id: tasks',
        '    generates: tasks.md',
        '    description: t',
        '    template: tasks.md',
        '    requires: [proposal]',
        'apply:',
        '  requires: [tasks]',
        '  tracks: tasks.md',
        '',
      ].join('\n')
    );
    fs.writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: twospec\n');
    writeTasks();

    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    expect(instructions.state).toBe('blocked');
    expect(instructions.instruction).toContain(
      'openspec instructions <artifact-id> --change my-change'
    );
    // Presence of the placeholder is not enough: naming either artifact as
    // well would still be picking one, which is the thing there is no basis
    // for here.
    expect(instructions.instruction).not.toContain('openspec instructions contracts');
    expect(instructions.instruction).not.toContain('openspec instructions schemas');
  });

  // The instruction tells the author `openspec validate` fails on this change.
  // If that ever stops being true apply is blocking on nothing, so pin it to
  // the validator rather than to a copy of its rule.
  it('blocks on exactly the state the validator rejects', async () => {
    writeTasks();
    const blocked = await generateApplyInstructions(tempDir, 'my-change');
    const rejected = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(blocked.state).toBe('blocked');
    expect(rejected.valid).toBe(false);
  });

  it('stays quiet about exactly the state the validator accepts', async () => {
    writeTasks();
    writeSpecs();
    const quiet = await generateApplyInstructions(tempDir, 'my-change');
    const accepted = await new Validator().validateChangeDeltaSpecs(changeDir);

    expect(quiet.state).toBe('ready');
    expect(quiet.warnings).toBeUndefined();
    expect(accepted.valid).toBe(true);
  });

  it('prints a Blocked header for the spec gap, with the repair in the instruction', async () => {
    writeTasks();
    const instructions = await generateApplyInstructions(tempDir, 'my-change');

    const lines: string[] = [];
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      lines.push(args.join(' '));
    });
    printApplyInstructionsText(instructions);
    vi.restoreAllMocks();
    const output = lines.join('\n');

    // Without the header the only signal sat under Instruction, below
    // Progress and Tasks, which reads as a change you can work on.
    expect(output).toContain('### ⚠️ Blocked');
    expect(output).toContain('no delta specs');
    expect(output).not.toContain('Missing artifacts:');
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
