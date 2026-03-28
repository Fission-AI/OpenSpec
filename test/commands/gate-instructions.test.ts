import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { generateApplyInstructions } from '../../src/commands/workflow/instructions.js';

/**
 * 7.8: generateApplyInstructions with gates/steps
 *
 * Tests that generateApplyInstructions correctly includes gates and steps
 * from schema definitions. Uses temporary project directories with
 * inline schema definitions.
 */
describe('generateApplyInstructions with gates/steps (7.8)', () => {
  let tmpDir: string;
  let originalCwd: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), 'openspec-instr-test-'));
    originalCwd = process.cwd();

    // Suppress console output
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function setupProject(schemaName: string, schemaYaml: string) {
    const schemaDir = path.join(tmpDir, 'openspec', 'schemas', schemaName);
    mkdirSync(schemaDir, { recursive: true });
    writeFileSync(path.join(schemaDir, 'schema.yaml'), schemaYaml);

    // Create template files referenced by the schema
    const templateDir = path.join(schemaDir, 'templates');
    mkdirSync(templateDir, { recursive: true });
    writeFileSync(path.join(templateDir, 'proposal.md'), '# Proposal Template');
    writeFileSync(path.join(templateDir, 'spec.md'), '# Spec Template');
    writeFileSync(path.join(templateDir, 'design.md'), '# Design Template');
    writeFileSync(path.join(templateDir, 'tasks.md'), '# Tasks Template');

    process.chdir(tmpDir);
  }

  function createChange(changeName: string, schemaName: string, files: Record<string, string> = {}) {
    const changeDir = path.join(tmpDir, 'openspec', 'changes', changeName);
    mkdirSync(changeDir, { recursive: true });

    writeFileSync(path.join(changeDir, '.openspec.yaml'), `schema: ${schemaName}\ncreated: "2026-03-28"\n`);

    for (const [filePath, content] of Object.entries(files)) {
      const fullPath = path.join(changeDir, filePath);
      mkdirSync(path.dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, content);
    }
  }

  it('should return undefined gates/steps for schema without gates', async () => {
    const schemaYaml = [
      'name: simple',
      'version: 1',
      'artifacts:',
      '  - id: proposal',
      '    generates: proposal.md',
      '    description: Proposal',
      '    template: templates/proposal.md',
      '    requires: []',
      '  - id: tasks',
      '    generates: tasks.md',
      '    description: Tasks',
      '    template: templates/tasks.md',
      '    requires:',
      '      - proposal',
      'apply:',
      '  requires: [tasks]',
      '  tracks: tasks.md',
      '  instruction: Work through tasks',
    ].join('\n');
    setupProject('simple', schemaYaml);
    createChange('test-change', 'simple', {
      'proposal.md': '# Proposal',
      'tasks.md': '- [ ] 1.1 Do something',
    });

    const result = await generateApplyInstructions(tmpDir, 'test-change');

    expect(result.gates).toBeUndefined();
    expect(result.steps).toBeUndefined();
    expect(result.state).toBe('ready');
  });

  it('should include gates and steps from schema with gates', async () => {
    const schemaYaml = [
      'name: with-gates',
      'version: 1',
      'artifacts:',
      '  - id: proposal',
      '    generates: proposal.md',
      '    description: Proposal',
      '    template: templates/proposal.md',
      '    requires: []',
      '  - id: tasks',
      '    generates: tasks.md',
      '    description: Tasks',
      '    template: templates/tasks.md',
      '    requires:',
      '      - proposal',
      'apply:',
      '  requires: [tasks]',
      '  tracks: tasks.md',
      '  gates:',
      '    pre:',
      '      - id: cap-coverage',
      '        check: capability-coverage',
      '        severity: blocking',
      '    post:',
      '      - id: task-done',
      '        check: all-tasks-done',
      '        severity: blocking',
      '      - id: ai-check',
      '        check: ai-review',
      '        severity: warning',
      '        prompt: Review all code',
      '        retry: 2',
      '  steps:',
      '    - id: coded',
      '      method: tdd',
      '      tdd:',
      '        enforce: per-task',
      '    - id: committed',
      '      instruction: Use conventional commits',
      '  instruction: Follow TDD workflow',
    ].join('\n');
    setupProject('with-gates', schemaYaml);
    createChange('gated-change', 'with-gates', {
      'proposal.md': '# Proposal',
      'tasks.md': '- [ ] 1.1 Implement feature',
    });

    const result = await generateApplyInstructions(tmpDir, 'gated-change');

    // Gates
    expect(result.gates).toBeDefined();
    expect(result.gates!.pre).toHaveLength(1);
    expect(result.gates!.pre![0].id).toBe('cap-coverage');
    expect(result.gates!.pre![0].check).toBe('capability-coverage');
    expect(result.gates!.pre![0].severity).toBe('blocking');

    expect(result.gates!.post).toHaveLength(2);
    expect(result.gates!.post![0].id).toBe('task-done');
    expect(result.gates!.post![1].id).toBe('ai-check');
    expect(result.gates!.post![1].retry).toBe(2);
    expect(result.gates!.post![1].prompt).toContain('Review all code');

    // Steps
    expect(result.steps).toBeDefined();
    expect(result.steps).toHaveLength(2);
    expect(result.steps![0].id).toBe('coded');
    expect(result.steps![0].method).toBe('tdd');
    expect(result.steps![1].id).toBe('committed');
  });

  it('should report blocked state when required artifacts are missing', async () => {
    const schemaYaml = [
      'name: blocked-test',
      'version: 1',
      'artifacts:',
      '  - id: proposal',
      '    generates: proposal.md',
      '    description: Proposal',
      '    template: templates/proposal.md',
      '    requires: []',
      '  - id: tasks',
      '    generates: tasks.md',
      '    description: Tasks',
      '    template: templates/tasks.md',
      '    requires:',
      '      - proposal',
      'apply:',
      '  requires: [tasks]',
      '  tracks: tasks.md',
      '  gates:',
      '    pre:',
      '      - id: cap-cov',
      '        check: capability-coverage',
      '        severity: blocking',
    ].join('\n');
    setupProject('blocked-test', schemaYaml);
    createChange('blocked-change', 'blocked-test', {
      'proposal.md': '# Proposal',
    });

    const result = await generateApplyInstructions(tmpDir, 'blocked-change');

    expect(result.state).toBe('blocked');
    expect(result.missingArtifacts).toContain('tasks');
    // Gates should still be present in the output
    expect(result.gates).toBeDefined();
    expect(result.gates!.pre).toHaveLength(1);
  });
});
