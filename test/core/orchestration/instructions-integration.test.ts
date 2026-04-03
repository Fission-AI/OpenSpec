import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { generateApplyInstructions } from '../../../src/commands/workflow/instructions.js';

describe('instructions apply --teams integration', () => {
  let tempRoot: string;
  let originalCwd: string;

  beforeAll(async () => {
    originalCwd = process.cwd();
    tempRoot = path.join(os.tmpdir(), `openspec-orch-integration-${Date.now()}`);

    // Create minimal project structure
    const changeDir = path.join(tempRoot, 'openspec', 'changes', 'test-change');
    const schemaDir = path.join(tempRoot, 'openspec', 'schemas', 'test-schema');
    const templateDir = path.join(schemaDir, 'templates');

    await fs.mkdir(changeDir, { recursive: true });
    await fs.mkdir(templateDir, { recursive: true });

    // Create schema.yaml
    const schemaYaml = `name: test-schema
version: 1
description: Test schema
artifacts:
  - id: proposal
    generates: proposal.md
    description: Change proposal
    template: proposal.md
    requires: []
apply:
  requires: [proposal]
  tracks: tasks.md
  orchestration:
    parallel_groups:
      - gates: [review-a, review-b]
        parallel: true
        mode: teams
        synthesis: require-both-pass
`;
    await fs.writeFile(path.join(schemaDir, 'schema.yaml'), schemaYaml, 'utf-8');

    // Create template
    await fs.writeFile(path.join(templateDir, 'proposal.md'), '# Proposal\n', 'utf-8');

    // Create proposal.md (so artifact is "done")
    await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Test Proposal\n', 'utf-8');

    // Create .openspec.yaml metadata
    await fs.writeFile(
      path.join(changeDir, '.openspec.yaml'),
      'schema: test-schema\ncreated: 2026-01-01\n',
      'utf-8'
    );

    // Create tasks.md with sections and domain tags
    const tasksContent = `## 1. Backend <!-- parallel-with: 2 -->

- [ ] 1.1 [domain: core] Create models
- [ ] 1.2 [domain: core] Add fields

## 2. Frontend

- [ ] 2.1 [domain: frontend] Create views
- [ ] 2.2 [domain: test] Write tests
`;
    await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent, 'utf-8');

    process.chdir(tempRoot);
  });

  afterAll(async () => {
    process.chdir(originalCwd);
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('should include orchestration hints with teams mode in JSON output', async () => {
    const result = await generateApplyInstructions(
      tempRoot,
      'test-change',
      'test-schema',
      'teams'
    );

    expect(result.orchestration).toBeDefined();
    const orch = result.orchestration!;

    // Mode from user flag
    expect(orch.mode).toBe('teams');
    expect(orch.source.mode_from).toBe('user_flag');

    // Task groups parsed from sections
    expect(orch.task_groups).toHaveLength(2);
    expect(orch.task_groups[0].id).toBe(1);
    expect(orch.task_groups[0].tasks).toEqual(['1.1', '1.2']);
    expect(orch.task_groups[0].depends_on).toEqual([]); // parallel-with overrides
    expect(orch.task_groups[1].id).toBe(2);
    expect(orch.task_groups[1].tasks).toEqual(['2.1', '2.2']);

    // Domain enrichment
    expect(orch.task_groups[0].domains).toEqual({ core: ['1.1', '1.2'] });
    expect(orch.task_groups[1].domains).toEqual({
      frontend: ['2.1'],
      test: ['2.2'],
    });

    // Gate groups from schema orchestration
    expect(orch.source.groups_from).toBe('schema');
  });

  it('should default mode to null when no flag provided', async () => {
    const result = await generateApplyInstructions(
      tempRoot,
      'test-change',
      'test-schema'
    );

    expect(result.orchestration).toBeDefined();
    expect(result.orchestration!.mode).toBeNull();
    expect(result.orchestration!.source.mode_from).toBe('default');
  });

  it('should produce valid JSON-serializable output', async () => {
    const result = await generateApplyInstructions(
      tempRoot,
      'test-change',
      'test-schema',
      'teams'
    );

    // Should be JSON serializable without errors
    const json = JSON.stringify(result);
    const parsed = JSON.parse(json);

    expect(parsed.orchestration).toBeDefined();
    expect(parsed.orchestration.mode).toBe('teams');
    expect(parsed.orchestration.task_groups).toHaveLength(2);
  });
});
