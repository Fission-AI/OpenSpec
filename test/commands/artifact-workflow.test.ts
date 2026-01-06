import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

describe('artifact-workflow CLI commands', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-artifact-workflow-'));
    changesDir = path.join(tempDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  /**
   * Gets combined output from CLI result (ora outputs to stdout).
   */
  function getOutput(result: { stdout: string; stderr: string }): string {
    return result.stdout + result.stderr;
  }

  /**
   * Creates a test change with the specified artifacts completed.
   * Note: An "active" change requires at least a proposal.md file to be detected.
   * If no artifacts are specified, we create an empty proposal to make it detectable.
   */
  async function createTestChange(
    changeName: string,
    artifacts: ('proposal' | 'design' | 'specs' | 'tasks')[] = []
  ): Promise<string> {
    const changeDir = path.join(changesDir, changeName);
    await fs.mkdir(changeDir, { recursive: true });

    // Always create proposal.md for the change to be detected as active
    // Content varies based on whether 'proposal' is in artifacts list
    const proposalContent = artifacts.includes('proposal')
      ? '## Why\nTest proposal content that is long enough.\n\n## What Changes\n- **test:** Something'
      : '## Why\nMinimal proposal.\n\n## What Changes\n- **test:** Placeholder';
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposalContent);

    if (artifacts.includes('design')) {
      await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n\nTechnical design.');
    }

    if (artifacts.includes('specs')) {
      // specs artifact uses glob pattern "specs/*.md" - files directly in specs/ directory
      const specsDir = path.join(changeDir, 'specs');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.writeFile(path.join(specsDir, 'test-spec.md'), '## Purpose\nTest spec.');
    }

    if (artifacts.includes('tasks')) {
      await fs.writeFile(path.join(changeDir, 'tasks.md'), '## Tasks\n- [ ] Task 1');
    }

    return changeDir;
  }

  describe('status command', () => {
    it('shows status for scaffolded change without proposal.md', async () => {
      // Create empty change directory (no proposal.md)
      const changeDir = path.join(changesDir, 'scaffolded-change');
      await fs.mkdir(changeDir, { recursive: true });

      const result = await runCLI(['status', '--change', 'scaffolded-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('scaffolded-change');
      expect(result.stdout).toContain('0/4 artifacts complete');
    });

    it('shows status for a change with proposal only', async () => {
      // createTestChange always creates proposal.md, so this has 1 artifact complete
      await createTestChange('minimal-change');

      const result = await runCLI(['status', '--change', 'minimal-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('minimal-change');
      expect(result.stdout).toContain('spec-driven');
      expect(result.stdout).toContain('1/4 artifacts complete');
    });

    it('shows status for a change with proposal and design', async () => {
      await createTestChange('partial-change', ['proposal', 'design']);

      const result = await runCLI(['status', '--change', 'partial-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('2/4 artifacts complete');
      expect(result.stdout).toContain('[x]');
    });

    it('outputs JSON when --json flag is used', async () => {
      await createTestChange('json-change', ['proposal', 'design']);

      const result = await runCLI(['status', '--change', 'json-change', '--json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.changeName).toBe('json-change');
      expect(json.schemaName).toBe('spec-driven');
      expect(json.isComplete).toBe(false);
      expect(Array.isArray(json.artifacts)).toBe(true);
      expect(json.artifacts).toHaveLength(4);

      const proposalArtifact = json.artifacts.find((a: any) => a.id === 'proposal');
      expect(proposalArtifact.status).toBe('done');
    });

    it('shows complete status when all artifacts are done', async () => {
      await createTestChange('complete-change', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(['status', '--change', 'complete-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('4/4 artifacts complete');
      expect(result.stdout).toContain('All artifacts complete!');
    });

    it('errors when --change is missing and lists available changes', async () => {
      await createTestChange('some-change');

      const result = await runCLI(['status'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Missing required option --change');
      expect(output).toContain('some-change');
    });

    it('errors for unknown change name and lists available changes', async () => {
      await createTestChange('existing-change');

      const result = await runCLI(['status', '--change', 'nonexistent'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Change 'nonexistent' not found");
      expect(output).toContain('existing-change');
    });

    it('supports --schema option', async () => {
      await createTestChange('tdd-change');

      const result = await runCLI(['status', '--change', 'tdd-change', '--schema', 'tdd'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('tdd');
    });

    it('errors for unknown schema', async () => {
      await createTestChange('test-change');

      const result = await runCLI(['status', '--change', 'test-change', '--schema', 'unknown'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Schema 'unknown' not found");
    });

    it('rejects path traversal in change name', async () => {
      const result = await runCLI(['status', '--change', '../foo'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });

    it('rejects absolute path in change name', async () => {
      const result = await runCLI(['status', '--change', '/etc/passwd'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });

    it('rejects slashes in change name', async () => {
      const result = await runCLI(['status', '--change', 'foo/bar'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });
  });

  describe('instructions command', () => {
    it('shows instructions for proposal on scaffolded change', async () => {
      // Create empty change directory (no proposal.md)
      const changeDir = path.join(changesDir, 'scaffolded-change');
      await fs.mkdir(changeDir, { recursive: true });

      const result = await runCLI(['instructions', 'proposal', '--change', 'scaffolded-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<artifact id="proposal"');
      expect(result.stdout).toContain('proposal.md');
      expect(result.stdout).toContain('<template>');
    });

    it('shows instructions for design artifact', async () => {
      await createTestChange('instr-change');

      const result = await runCLI(['instructions', 'design', '--change', 'instr-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<artifact id="design"');
      expect(result.stdout).toContain('design.md');
      expect(result.stdout).toContain('<template>');
    });

    it('shows blocked warning for artifact with unmet dependencies', async () => {
      // tasks depends on design and specs, which are not done yet
      await createTestChange('blocked-change');

      const result = await runCLI(['instructions', 'tasks', '--change', 'blocked-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<warning>');
      expect(result.stdout).toContain('status="missing"');
    });

    it('outputs JSON for instructions', async () => {
      await createTestChange('json-instr', ['proposal']);

      const result = await runCLI(['instructions', 'design', '--change', 'json-instr', '--json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.artifactId).toBe('design');
      expect(json.outputPath).toContain('design.md');
      expect(typeof json.template).toBe('string');
      expect(Array.isArray(json.dependencies)).toBe(true);
    });

    it('errors when artifact argument is missing', async () => {
      await createTestChange('test-change');

      const result = await runCLI(['instructions', '--change', 'test-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Missing required argument <artifact>');
      expect(output).toContain('Valid artifacts');
    });

    it('errors for unknown artifact', async () => {
      await createTestChange('test-change');

      const result = await runCLI(['instructions', 'unknown-artifact', '--change', 'test-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Artifact 'unknown-artifact' not found");
      expect(output).toContain('Valid artifacts');
    });
  });

  describe('templates command', () => {
    it('shows template paths for default schema', async () => {
      const result = await runCLI(['templates'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Schema: spec-driven');
      expect(result.stdout).toContain('proposal:');
      expect(result.stdout).toContain('design:');
      expect(result.stdout).toContain('specs:');
      expect(result.stdout).toContain('tasks:');
    });

    it('shows template paths for custom schema', async () => {
      const result = await runCLI(['templates', '--schema', 'tdd'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Schema: tdd');
      expect(result.stdout).toContain('spec:');
      expect(result.stdout).toContain('tests:');
    });

    it('outputs JSON mapping of templates', async () => {
      const result = await runCLI(['templates', '--json'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.proposal).toBeDefined();
      expect(json.proposal.path).toContain('proposal.md');
      expect(json.proposal.source).toBe('package');
    });

    it('errors for unknown schema', async () => {
      const result = await runCLI(['templates', '--schema', 'nonexistent'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain("Schema 'nonexistent' not found");
    });
  });

  describe('new change command', () => {
    it('creates a new change directory', async () => {
      const result = await runCLI(['new', 'change', 'my-new-feature'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      const output = getOutput(result);
      expect(output).toContain("Created change 'my-new-feature'");

      const changeDir = path.join(changesDir, 'my-new-feature');
      const stat = await fs.stat(changeDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('creates README.md when --description is provided', async () => {
      const result = await runCLI(
        ['new', 'change', 'described-feature', '--description', 'This is a test feature'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const readmePath = path.join(changesDir, 'described-feature', 'README.md');
      const content = await fs.readFile(readmePath, 'utf-8');
      expect(content).toContain('described-feature');
      expect(content).toContain('This is a test feature');
    });

    it('errors for invalid change name with spaces', async () => {
      const result = await runCLI(['new', 'change', 'invalid name'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Error');
    });

    it('errors for duplicate change name', async () => {
      await createTestChange('existing-change');

      const result = await runCLI(['new', 'change', 'existing-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('exists');
    });

    it('errors when name argument is missing', async () => {
      const result = await runCLI(['new', 'change'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
    });
  });

  describe('help text', () => {
    it('marks status command as experimental in help', async () => {
      const result = await runCLI(['status', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('[Experimental]');
    });

    it('marks instructions command as experimental in help', async () => {
      const result = await runCLI(['instructions', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('[Experimental]');
    });

    it('marks templates command as experimental in help', async () => {
      const result = await runCLI(['templates', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('[Experimental]');
    });

    it('marks new command as experimental in help', async () => {
      const result = await runCLI(['new', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('[Experimental]');
    });
  });
});
