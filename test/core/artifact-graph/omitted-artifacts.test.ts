import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  formatChangeStatus,
  generateInstructions,
  loadChangeContext,
} from '../../../src/core/artifact-graph/instruction-loader.js';
import { generateApplyInstructions } from '../../../src/commands/workflow/instructions.js';

describe('optional artifacts left out of a plan (#2271)', () => {
  let projectRoot: string;
  let changeDir: string;

  const write = (relativePath: string) => {
    const file = path.join(changeDir, relativePath);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, '# content\n');
  };
  const status = () => formatChangeStatus(loadChangeContext(projectRoot, 'demo'));
  const artifact = (id: string) => status().artifacts.find((entry) => entry.id === id)!;

  beforeEach(() => {
    projectRoot = mkdtempSync(path.join(tmpdir(), 'openspec-omitted-'));
    changeDir = path.join(projectRoot, 'openspec', 'changes', 'demo');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: spec-driven\n');
    write('proposal.md');
    write('specs/demo/spec.md');
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('completes planning once the work that depends on the optional artifact exists', () => {
    write('tasks.md');

    const result = status();
    expect(result.isPlanningComplete).toBe(true);
    expect(result.isComplete).toBe(true);
    expect(artifact('design')).toMatchObject({ status: 'skipped', omitted: true });
    expect(result.nextSteps.join(' ')).toContain('openspec instructions apply --change "demo"');
  });

  it('still offers the optional artifact while nothing depends on it yet', () => {
    const result = status();
    expect(result.isPlanningComplete).toBe(false);
    expect(artifact('design').status).toBe('ready');
    expect(artifact('design').omitted).toBeUndefined();
  });

  it('counts the optional artifact as done once it is written', () => {
    write('design.md');
    write('tasks.md');

    expect(artifact('design').status).toBe('done');
    expect(artifact('design').omitted).toBeUndefined();
  });

  // #834 and #869: writing tasks.md early must not excuse a required artifact.
  it('never excuses a required artifact that was jumped over', () => {
    rmSync(path.join(changeDir, 'specs'), { recursive: true });
    write('tasks.md');

    const result = status();
    expect(result.isPlanningComplete).toBe(false);
    expect(artifact('specs').status).toBe('ready');
    expect(artifact('specs').omitted).toBeUndefined();
  });

  it('lets apply run when chained optional artifacts are left out', async () => {
    const schemaDir = path.join(projectRoot, 'openspec', 'schemas', 'chained');
    mkdirSync(path.join(schemaDir, 'templates'), { recursive: true });
    for (const template of ['first.md', 'second.md', 'tasks.md']) {
      writeFileSync(path.join(schemaDir, 'templates', template), '# template\n');
    }
    writeFileSync(
      path.join(schemaDir, 'schema.yaml'),
      [
        'name: chained',
        'version: 1',
        'artifacts:',
        '  - { id: first, generates: first.md, description: First, template: first.md, optional: true }',
        '  - { id: second, generates: second.md, description: Second, template: second.md, optional: true, requires: [first] }',
        '  - { id: tasks, generates: tasks.md, description: Tasks, template: tasks.md, requires: [second] }',
        'apply:',
        '  requires: [second, tasks]',
        '  tracks: tasks.md',
        '',
      ].join('\n')
    );
    writeFileSync(path.join(changeDir, '.openspec.yaml'), 'schema: chained\n');
    writeFileSync(path.join(changeDir, 'tasks.md'), '- [ ] 1.1 Do the work\n');

    const result = status();
    expect(result.isPlanningComplete).toBe(true);
    expect(artifact('first')).toMatchObject({ status: 'skipped', omitted: true });
    expect(artifact('second')).toMatchObject({ status: 'skipped', omitted: true });

    const apply = await generateApplyInstructions(projectRoot, 'demo');
    expect(apply.state).toBe('ready');
    expect(apply.missingArtifacts).toBeUndefined();
  });

  it('keeps the left-out artifact available, without the skip_specs warning', () => {
    write('tasks.md');
    const context = loadChangeContext(projectRoot, 'demo');

    const design = generateInstructions(context, 'design');
    expect(design.skipped).toBeUndefined();
    expect(design.warning).toBeUndefined();

    const tasks = generateInstructions(context, 'tasks');
    expect(tasks.dependencies.find((dep) => dep.id === 'design')).toMatchObject({
      done: true,
      skipped: true,
    });
  });
});
