import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('status --all', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-status-all-'));
    changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  function getOutput(result: { stdout: string; stderr: string }): string {
    return result.stdout + result.stderr;
  }

  async function createTestChange(
    changeName: string,
    artifacts: ('design' | 'specs' | 'tasks')[] = []
  ): Promise<string> {
    const changeDir = path.join(changesDir, changeName);
    await fs.mkdir(changeDir, { recursive: true });

    // proposal.md marks the change as active
    await fs.writeFile(
      path.join(changeDir, 'proposal.md'),
      '## Why\nMinimal proposal.\n\n## What Changes\n- **test:** Placeholder'
    );

    if (artifacts.includes('design')) {
      await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n\nTechnical design.');
    }

    if (artifacts.includes('specs')) {
      const specsDir = path.join(changeDir, 'specs');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.writeFile(path.join(specsDir, 'test-spec.md'), '## Purpose\nTest spec.');
    }

    if (artifacts.includes('tasks')) {
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [ ] Task 1');
    }

    return changeDir;
  }

  it('reports every active change in alphabetical order', async () => {
    // Created out of order to prove the output sort is not readdir order
    await createTestChange('zebra-change', ['design']);
    await createTestChange('alpha-change');
    await createTestChange('mid-change', ['design', 'specs', 'tasks']);

    const result = await runCLI(['status', '--all', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const json = JSON.parse(result.stdout);
    expect(json.changes.map((c: any) => c.changeName)).toEqual([
      'alpha-change',
      'mid-change',
      'zebra-change',
    ]);
  });

  it('emits the empty envelope when no changes exist', async () => {
    const result = await runCLI(['status', '--all', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);

    const json = JSON.parse(result.stdout);
    expect(json.changes).toEqual([]);
    expect(json.message).toBe('No active changes.');
    expect(json.root).toBeDefined();
  });

  it('hoists root to the envelope and carries a full ChangeStatus per change', async () => {
    await createTestChange('json-change', ['design']);

    const result = await runCLI(['status', '--all', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);

    const json = JSON.parse(result.stdout);
    expect(json.root).toBeDefined();
    expect(typeof json.root.path).toBe('string');
    expect(json.changes).toHaveLength(1);

    const entry = json.changes[0];
    // Full ChangeStatus shape, same as the single-change payload
    expect(entry.changeName).toBe('json-change');
    expect(entry.schemaName).toBe('spec-driven');
    expect(entry.isComplete).toBe(false);
    expect(Array.isArray(entry.artifacts)).toBe(true);
    expect(entry.artifacts).toHaveLength(4);
    expect(Array.isArray(entry.nextSteps)).toBe(true);
    expect(entry.actionContext).toBeDefined();
    expect(entry.artifactPaths).toBeDefined();
    // root lives on the envelope only
    expect(entry.root).toBeUndefined();

    const designArtifact = entry.artifacts.find((a: any) => a.id === 'design');
    expect(designArtifact.status).toBe('done');
  });

  it('rejects --all combined with --change', async () => {
    await createTestChange('some-change');

    const result = await runCLI(['status', '--all', '--change', 'some-change'], {
      cwd: tempDir,
    });
    expect(result.exitCode).toBe(1);
    expect(getOutput(result)).toContain('mutually exclusive');
  });

  it('honors the JSON null-shape when --all and --change are combined', async () => {
    await createTestChange('some-change');

    const result = await runCLI(
      ['status', '--all', '--change', 'some-change', '--json'],
      { cwd: tempDir }
    );
    expect(result.exitCode).toBe(1);

    // Exactly one JSON document: null-shape plus status array
    const json = JSON.parse(result.stdout);
    expect(json.changes).toEqual([]);
    expect(Array.isArray(json.status)).toBe(true);
    expect(json.status[0].severity).toBe('error');
    expect(json.status[0].message).toContain('mutually exclusive');
  });

  it('keeps sweeping when one change fails to load', async () => {
    await createTestChange('good-change', ['design']);
    const brokenDir = await createTestChange('broken-change');
    // An unknown schema in the metadata makes loadChangeContext throw
    await fs.writeFile(
      path.join(brokenDir, '.openspec.yaml'),
      'schema: no-such-schema\n'
    );

    const result = await runCLI(['status', '--all', '--json'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);

    const json = JSON.parse(result.stdout);
    expect(json.changes).toHaveLength(2);

    const broken = json.changes.find((c: any) => c.changeName === 'broken-change');
    expect(Array.isArray(broken.status)).toBe(true);
    expect(broken.status[0].code).toBe('change_error');
    expect(broken.status[0].severity).toBe('error');
    expect(broken.artifacts).toBeUndefined();

    const good = json.changes.find((c: any) => c.changeName === 'good-change');
    expect(good.schemaName).toBe('spec-driven');
    expect(good.artifacts).toHaveLength(4);
  });

  it('prints one text block per change with --all', async () => {
    await createTestChange('first-change');
    await createTestChange('second-change', ['design']);

    const result = await runCLI(['status', '--all'], { cwd: tempDir });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Change: first-change');
    expect(result.stdout).toContain('Change: second-change');
    expect(result.stdout).toContain('1/4 artifacts complete');
    expect(result.stdout).toContain('2/4 artifacts complete');
  });

  it('exits 1 in text mode when a change fails to load, still printing the others', async () => {
    await createTestChange('good-change', ['design']);
    const brokenDir = await createTestChange('broken-change');
    await fs.writeFile(
      path.join(brokenDir, '.openspec.yaml'),
      'schema: no-such-schema\n'
    );

    const result = await runCLI(['status', '--all'], { cwd: tempDir });
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toContain('✗ broken-change:');
    expect(result.stdout).toContain('Change: good-change');
    expect(result.stdout).toContain('2/4 artifacts complete');
  });

  describe('--schema interaction', () => {
    /** Writes a minimal project-local schema so an override is distinguishable from the default. */
    async function createProjectSchema(schemaName: string): Promise<void> {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', schemaName);
      await fs.mkdir(schemaDir, { recursive: true });
      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        [
          `name: ${schemaName}`,
          'version: 1',
          'description: Minimal test schema',
          'artifacts:',
          '  - id: proposal',
          '    generates: proposal.md',
          '    description: Proposal document',
          '    template: proposal.md',
          '',
        ].join('\n')
      );
    }

    it('fails with the null-shape when --schema names an unknown schema', async () => {
      await createTestChange('some-change');

      const result = await runCLI(
        ['status', '--all', '--schema', 'no-such-schema', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(1);

      const json = JSON.parse(result.stdout);
      expect(json.changes).toEqual([]);
      expect(Array.isArray(json.status)).toBe(true);
      expect(json.status[0].severity).toBe('error');
      expect(json.status[0].message).toContain("'no-such-schema' not found");
    });

    it('rejects an unknown --schema even when no changes exist', async () => {
      const result = await runCLI(
        ['status', '--all', '--schema', 'no-such-schema', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(1);

      const json = JSON.parse(result.stdout);
      expect(json.changes).toEqual([]);
      expect(json.status[0].message).toContain("'no-such-schema' not found");
    });

    it('applies a valid --schema override to every change', async () => {
      await createProjectSchema('mini');
      await createTestChange('first-change');
      await createTestChange('second-change');

      const result = await runCLI(['status', '--all', '--schema', 'mini', '--json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.changes).toHaveLength(2);
      for (const entry of json.changes) {
        expect(entry.schemaName).toBe('mini');
        expect(entry.artifacts).toHaveLength(1);
      }
    });

    it('does not rescue a change with broken metadata via an explicit --schema', async () => {
      await createTestChange('good-change');
      const brokenDir = await createTestChange('broken-change');
      await fs.writeFile(
        path.join(brokenDir, '.openspec.yaml'),
        'schema: no-such-schema\n'
      );

      const result = await runCLI(
        ['status', '--all', '--schema', 'spec-driven', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      const broken = json.changes.find((c: any) => c.changeName === 'broken-change');
      expect(broken.status[0].code).toBe('change_error');

      const good = json.changes.find((c: any) => c.changeName === 'good-change');
      expect(good.schemaName).toBe('spec-driven');
    });
  });
});
