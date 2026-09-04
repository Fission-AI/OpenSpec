import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';
import { FileSystemUtils } from '../../src/utils/file-system.js';

describe('artifact-workflow CLI commands', () => {
  let tempDir: string;
  let changesDir: string;

  const canonical = (targetPath: string): string => FileSystemUtils.canonicalizeExistingPath(targetPath);

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
   * Normalizes path separators to forward slashes for cross-platform assertions.
   */
  function normalizePaths(str: string): string {
    return str.replace(/\\/g, '/');
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
      expect(result.stderr).toBe('');

      const json = JSON.parse(result.stdout);
      expect(json.changeName).toBe('json-change');
      expect(json.schemaName).toBe('spec-driven');
      expect(json.isPlanningComplete).toBe(false);
      expect(json.isComplete).toBe(false);
      expect(Array.isArray(json.artifacts)).toBe(true);
      expect(json.artifacts).toHaveLength(4);

      const proposalArtifact = json.artifacts.find((a: any) => a.id === 'proposal');
      expect(proposalArtifact.status).toBe('done');
    });

    it('recommends specs before design for a proposal-only change', async () => {
      await createTestChange('order-change');

      const result = await runCLI(['status', '--change', 'order-change', '--json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.artifacts.map((a: any) => a.id)).toEqual(['proposal', 'specs', 'design', 'tasks']);
      expect(json.nextSteps[0]).toContain('openspec instructions specs');
    });

    // #906: the text surface reported state and no verb, so someone resuming a
    // change - after a lost session, or on a change they did not start - had to
    // already know which command comes next. The command is now printed.
    describe('next step', () => {
      /**
       * The line closes the output, so a `toContain` would still pass if some
       * later line pushed it into the middle of the report.
       */
      function lastLine(result: { stdout: string }): string {
        const lines = result.stdout.split('\n').filter((line) => line.trim() !== '');
        return lines[lines.length - 1] ?? '';
      }

      it('names the command for the next ready artifact', async () => {
        await createTestChange('resume-planning');

        const result = await runCLI(['status', '--change', 'resume-planning'], { cwd: tempDir });

        expect(result.exitCode).toBe(0);
        expect(lastLine(result)).toBe(
          'Next: openspec instructions specs --change "resume-planning" --json'
        );
      });

      it('names the apply command once planning is complete', async () => {
        await createTestChange('resume-apply', ['proposal', 'design', 'specs', 'tasks']);

        const result = await runCLI(['status', '--change', 'resume-apply'], { cwd: tempDir });

        expect(result.exitCode).toBe(0);
        // The completion line alone reads as "you are done" even while tasks
        // remain, so it must be followed by the command that resumes the work.
        expect(result.stdout).toContain('All planning artifacts complete!');
        expect(lastLine(result)).toBe(
          'Next: openspec instructions apply --change "resume-apply" --json'
        );
      });

      it('names artifacts from a custom schema, not spec-driven ones', async () => {
        // The line is built from the resolved artifact id, so a project whose
        // schema has no proposal/specs/design/tasks must still get a usable
        // command rather than a hard-coded default-schema one.
        const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'lean');
        await fs.mkdir(path.join(schemaDir, 'templates'), { recursive: true });
        await fs.writeFile(path.join(schemaDir, 'templates', 'brief.md'), '# Brief\n');
        await fs.writeFile(path.join(schemaDir, 'templates', 'plan.md'), '# Plan\n');
        await fs.writeFile(
          path.join(schemaDir, 'schema.yaml'),
          [
            'name: lean',
            'version: 1',
            'artifacts:',
            '  - id: brief',
            '    generates: brief.md',
            '    description: One-page brief',
            '    template: brief.md',
            '    requires: []',
            '  - id: plan',
            '    generates: plan.md',
            '    description: Execution plan',
            '    template: plan.md',
            '    requires: [brief]',
            'apply:',
            '  requires: [plan]',
            '',
          ].join('\n')
        );

        const changeDir = path.join(changesDir, 'lean-change');
        await fs.mkdir(changeDir, { recursive: true });
        await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: lean\n');
        await fs.writeFile(path.join(changeDir, 'brief.md'), '# Brief\n\nThe brief.\n');

        const ready = await runCLI(['status', '--change', 'lean-change'], { cwd: tempDir });
        expect(ready.exitCode).toBe(0);
        expect(lastLine(ready)).toBe(
          'Next: openspec instructions plan --change "lean-change" --json'
        );

        await fs.writeFile(path.join(changeDir, 'plan.md'), '# Plan\n\nThe plan.\n');

        const complete = await runCLI(['status', '--change', 'lean-change'], { cwd: tempDir });
        expect(complete.exitCode).toBe(0);
        expect(lastLine(complete)).toBe(
          'Next: openspec instructions apply --change "lean-change" --json'
        );
      });

      it('never points at a skipped artifact', async () => {
        const changeDir = await createTestChange('skip-next-step', ['proposal']);
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\nskip_specs: true\n'
        );

        const result = await runCLI(['status', '--change', 'skip-next-step'], { cwd: tempDir });

        expect(result.exitCode).toBe(0);
        // A skipped artifact satisfies its dependents but must never be
        // created, so naming it would send the author to write a file the
        // change forbids.
        expect(result.stdout).toContain('[~] specs');
        expect(lastLine(result)).toBe(
          'Next: openspec instructions design --change "skip-next-step" --json'
        );
      });

      it('stays out of the JSON payload', async () => {
        await createTestChange('json-clean');

        const result = await runCLI(['status', '--change', 'json-clean', '--json'], {
          cwd: tempDir,
        });

        expect(result.exitCode).toBe(0);
        // The text line must not leak into --json: it would break the parse
        // for every agent reading this command.
        expect(result.stdout).not.toContain('Next: ');
        expect(() => JSON.parse(result.stdout)).not.toThrow();
      });

      it('prints the same command the JSON nextSteps sentence names', async () => {
        for (const artifacts of [[], ['proposal', 'design', 'specs', 'tasks']] as const) {
          const changeName = `parity-${artifacts.length}`;
          await createTestChange(changeName, [...artifacts]);

          const text = await runCLI(['status', '--change', changeName], { cwd: tempDir });
          const json = await runCLI(['status', '--change', changeName, '--json'], { cwd: tempDir });

          const printed = text.stdout
            .split('\n')
            .find((line) => line.startsWith('Next: '))
            ?.slice('Next: '.length)
            .trim();

          expect(printed).toBeDefined();
          // One source of truth: the printed command must appear verbatim
          // inside the published JSON sentence.
          expect(JSON.parse(json.stdout).nextSteps[0]).toContain(printed);
        }
      });
    });

    it('shows planning completion when all artifacts exist', async () => {
      await createTestChange('complete-change', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(['status', '--change', 'complete-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('4/4 artifacts complete');
      expect(result.stdout).toContain('All planning artifacts complete!');
      expect(result.stdout).not.toContain('All artifacts complete!');
    });

    it('distinguishes planning completion from implementation task completion', async () => {
      await createTestChange('planned-change', ['proposal', 'design', 'specs', 'tasks']);

      const statusResult = await runCLI(['status', '--change', 'planned-change', '--json'], {
        cwd: tempDir,
      });
      const applyResult = await runCLI(
        ['instructions', 'apply', '--change', 'planned-change', '--json'],
        { cwd: tempDir }
      );

      expect(statusResult.exitCode).toBe(0);
      expect(applyResult.exitCode).toBe(0);

      const status = JSON.parse(statusResult.stdout);
      const apply = JSON.parse(applyResult.stdout);
      expect(status.isPlanningComplete).toBe(true);
      expect(status.isComplete).toBe(true);
      expect(status.nextSteps[0]).toContain(
        'openspec instructions apply --change "planned-change" --json'
      );
      expect(status.nextSteps[0]).not.toContain('before implementation');
      expect(apply.state).toBe('ready');
      expect(apply.progress.remaining).toBe(1);
    });

    it('reports skipped planning artifacts as complete without creating them', async () => {
      const changeDir = await createTestChange('skip-specs-change', [
        'proposal',
        'design',
        'tasks',
      ]);
      await fs.writeFile(
        path.join(changeDir, '.openspec.yaml'),
        'schema: spec-driven\nskip_specs: true\n'
      );

      const result = await runCLI(['status', '--change', 'skip-specs-change', '--json'], {
        cwd: tempDir,
      });

      expect(result.exitCode).toBe(0);
      const status = JSON.parse(result.stdout);
      expect(status.isPlanningComplete).toBe(true);
      expect(status.isComplete).toBe(status.isPlanningComplete);
      expect(status.artifacts.find((artifact: any) => artifact.id === 'specs')?.status).toBe(
        'skipped'
      );
      await expect(fs.stat(path.join(changeDir, 'specs'))).rejects.toMatchObject({ code: 'ENOENT' });
    });

    it('exits gracefully when no changes exist', async () => {
      const result = await runCLI(['status'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('No active changes');
      expect(result.stdout).toContain('openspec new change');
    });

    it('exits gracefully with JSON when no changes exist', async () => {
      const result = await runCLI(['status', '--json'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      expect(json.changes).toEqual([]);
      expect(json.message).toBe('No active changes.');
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
      await createTestChange('schema-change');

      const result = await runCLI(['status', '--change', 'schema-change', '--schema', 'spec-driven'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('spec-driven');
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

    it('rejects hidden directory names', async () => {
      const result = await runCLI(['status', '--change', '.hidden'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });

    it('rejects the reserved archive directory name', async () => {
      await fs.mkdir(path.join(changesDir, 'archive'), { recursive: true });

      const result = await runCLI(['status', '--change', 'archive'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid change name');
    });

    it('accepts digit-leading change names that exist on disk (#1308)', async () => {
      await createTestChange('2026-07-04-voice-copilot-v1', ['proposal', 'design']);

      const result = await runCLI(['status', '--change', '2026-07-04-voice-copilot-v1'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('2026-07-04-voice-copilot-v1');
      expect(result.stdout).toContain('2/4 artifacts complete');
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
      expect(result.stderr).toBe('');

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

    it('accepts digit-leading change names that exist on disk (#1308)', async () => {
      await createTestChange('2026-07-04-voice-copilot-v1', ['proposal']);

      const result = await runCLI(
        ['instructions', 'design', '--change', '2026-07-04-voice-copilot-v1'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('<artifact id="design"');
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

    it('shows template paths for specified schema', async () => {
      const result = await runCLI(['templates', '--schema', 'spec-driven'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Schema: spec-driven');
      expect(result.stdout).toContain('proposal:');
      expect(result.stdout).toContain('design:');
    });

    it('outputs JSON mapping of templates', async () => {
      const result = await runCLI(['templates', '--json'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

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

      const metadata = await fs.readFile(path.join(changeDir, '.openspec.yaml'), 'utf-8');
      expect(metadata).not.toContain('skip_specs');
    });

    it('marks changes as skip_specs when their schema cannot generate specs', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'no-specs');
      await fs.mkdir(path.join(schemaDir, 'templates'), { recursive: true });
      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        `name: no-specs
version: 1
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
  - id: tasks
    generates: tasks.md
    description: Tasks
    template: tasks.md
    requires: [proposal]
apply:
  requires: [tasks]
  tracks: tasks.md
`
      );
      await fs.writeFile(path.join(schemaDir, 'templates', 'proposal.md'), '# Proposal\n');
      await fs.writeFile(path.join(schemaDir, 'templates', 'tasks.md'), '# Tasks\n');
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        'schema: no-specs\n'
      );

      const result = await runCLI(['new', 'change', 'no-spec-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);

      const metadata = await fs.readFile(
        path.join(changesDir, 'no-spec-change', '.openspec.yaml'),
        'utf-8'
      );
      expect(metadata).toContain('skip_specs: true');

      const validation = await runCLI(
        ['validate', 'no-spec-change', '--type', 'change'],
        { cwd: tempDir }
      );
      expect(validation.exitCode).toBe(0);
    });

    it('does not mark spec-producing schemas that use Windows separators', async () => {
      const schemaName = 'windows-specs';
      const generates = String.raw`specs\**\*.md`;
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', schemaName);
      await fs.mkdir(path.join(schemaDir, 'templates'), { recursive: true });
      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        `name: ${schemaName}
version: 1
artifacts:
  - id: specs
    generates: '${generates}'
    description: Specs
    template: spec.md
    requires: []
`
      );
      await fs.writeFile(path.join(schemaDir, 'templates', 'spec.md'), '# Spec\n');
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: ${schemaName}\n`
      );

      const changeName = `${schemaName}-change`;
      const result = await runCLI(['new', 'change', changeName], { cwd: tempDir });
      expect(result.exitCode).toBe(0);

      const changeDir = path.join(changesDir, changeName);
      const metadata = await fs.readFile(path.join(changeDir, '.openspec.yaml'), 'utf-8');
      expect(metadata).not.toContain('skip_specs');

      const specDir = path.join(changeDir, 'specs', 'example');
      await fs.mkdir(specDir, { recursive: true });
      await fs.writeFile(
        path.join(specDir, 'spec.md'),
        `## ADDED Requirements
### Requirement: Example behavior
The system SHALL support the example behavior.

#### Scenario: Example succeeds
- **WHEN** the example runs
- **THEN** it succeeds
`
      );

      const status = await runCLI(['status', '--change', changeName, '--json'], {
        cwd: tempDir,
      });
      expect(status.exitCode).toBe(0);
      expect(JSON.parse(status.stdout).artifacts[0].status).toBe('done');

      const validation = await runCLI(['validate', changeName, '--type', 'change'], {
        cwd: tempDir,
      });
      expect(validation.exitCode).toBe(0);
    });

    it('rejects --initiative and writes no change', async () => {
      const result = await runCLI(
        ['new', 'change', 'linked-change', '--initiative', 'billing-launch'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('--initiative is no longer supported');
      await expect(fs.stat(path.join(changesDir, 'linked-change'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    });

    it('rejects --areas and writes no affected-area metadata', async () => {
      const result = await runCLI(['new', 'change', 'area-change', '--areas', 'api'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('--areas is no longer supported');
      await expect(fs.stat(path.join(changesDir, 'area-change'))).rejects.toMatchObject({
        code: 'ENOENT',
      });
    });

    it('keeps --goal as ordinary metadata without switching schema', async () => {
      const result = await runCLI(
        ['new', 'change', 'goal-change', '--goal', 'Improve billing'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const metadata = await fs.readFile(
        path.join(changesDir, 'goal-change', '.openspec.yaml'),
        'utf-8'
      );
      expect(metadata).toContain('schema: spec-driven');
      expect(metadata).toContain('goal: Improve billing');
      expect(metadata).not.toContain('affected_areas');
      expect(metadata).not.toContain('initiative');
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

  describe('instructions apply command', () => {
    it('shows apply instructions for spec-driven schema with tasks', async () => {
      await createTestChange('apply-change', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(['instructions', 'apply', '--change', 'apply-change'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('## Apply: apply-change');
      expect(result.stdout).toContain('Schema: spec-driven');
      expect(result.stdout).toContain('### Context Files');
      expect(result.stdout).toContain('### Instruction');
    });

    it('shows blocked state when required artifacts are missing', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
context: Required blocked-state context
operations:
  apply:
    guidance:
      - Advisory blocked-state guidance
`
      );
      // Only create proposal - missing tasks (required by spec-driven apply block)
      await createTestChange('blocked-apply', ['proposal']);

      const result = await runCLI(['instructions', 'apply', '--change', 'blocked-apply'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Blocked');
      expect(result.stdout).toContain('Missing artifacts: tasks');
      expect(result.stdout).toContain('### Project Context (required instruction input)');
      expect(result.stdout).toContain('### Operation Guidance (advisory)');
    });

    it('outputs JSON for apply instructions', async () => {
      await createTestChange('json-apply', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'json-apply', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');

      const json = JSON.parse(result.stdout);
      const expectedProposalPath = canonical(path.join(changesDir, 'json-apply', 'proposal.md'));
      const expectedSpecPath = canonical(path.join(changesDir, 'json-apply', 'specs', 'test-spec.md'));
      expect(json.changeName).toBe('json-apply');
      expect(json.schemaName).toBe('spec-driven');
      expect(json.state).toBe('ready');
      expect(json.contextFiles).toBeDefined();
      expect(typeof json.contextFiles).toBe('object');
      expect(json.contextFiles.proposal).toEqual([expectedProposalPath]);
      expect(json.contextFiles.specs).toEqual([expectedSpecPath]);
    });

    it('returns current context and matching apply guidance as separate JSON fields', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
context: |
  Current project context
rules:
  specs:
    - Artifact-only rule
operations:
  apply:
    guidance:
      - Apply guidance
  archive:
    guidance:
      - Archive guidance
`
      );
      await createTestChange('apply-inputs', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-inputs', '--json'],
        { cwd: tempDir }
      );

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.context).toBe('Current project context\n');
      expect(json.operationGuidance).toEqual(['Apply guidance']);
      expect(JSON.stringify(json)).not.toContain('Archive guidance');
      expect(JSON.stringify(json)).not.toContain('Artifact-only rule');
      expect(json.state).toBe('ready');
      expect(json.progress).toEqual({ total: 1, complete: 0, remaining: 1 });
      expect(json.tasks).toEqual([{ id: '1', description: 'Task 1', done: false }]);
      expect(json.contextFiles).toBeDefined();
      expect(json.root).toBeDefined();
    });

    it('renders required context and advisory apply guidance as distinct text sections', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
context: Project background
operations:
  apply:
    guidance:
      - Keep summaries concise
`
      );
      await createTestChange('apply-text-inputs', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-text-inputs'],
        { cwd: tempDir }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('### Instruction');
      expect(result.stdout).toContain('### Project Context (required instruction input)');
      expect(result.stdout).toContain('Project background');
      expect(result.stdout).toContain('### Operation Guidance (advisory)');
      expect(result.stdout).toContain('- Keep summaries concise');
      expect(result.stdout).not.toContain('### Project Context (advisory)');
    });

    it('omits absent operation inputs without changing apply state behavior', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
rules:
  specs:
    - Artifact-only rule
`
      );
      await createTestChange('apply-no-inputs', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-no-inputs', '--json'],
        { cwd: tempDir }
      );

      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.context).toBeUndefined();
      expect(json.operationGuidance).toBeUndefined();
      expect(json.state).toBe('ready');
      expect(JSON.stringify(json)).not.toContain('Artifact-only rule');
    });

    it('reads a fresh apply config snapshot on every command invocation', async () => {
      const configPath = path.join(tempDir, 'openspec', 'config.yaml');
      await createTestChange('apply-fresh-inputs', ['proposal', 'design', 'specs', 'tasks']);
      await fs.writeFile(
        configPath,
        `schema: spec-driven
context: Initial context
operations:
  apply:
    guidance:
      - Initial guidance
`
      );

      const first = await runCLI(
        ['instructions', 'apply', '--change', 'apply-fresh-inputs', '--json'],
        { cwd: tempDir }
      );
      await fs.writeFile(
        configPath,
        `schema: spec-driven
context: Updated context
operations:
  apply:
    guidance:
      - Updated guidance
`
      );
      const second = await runCLI(
        ['instructions', 'apply', '--change', 'apply-fresh-inputs', '--json'],
        { cwd: tempDir }
      );

      expect(JSON.parse(first.stdout)).toMatchObject({
        context: 'Initial context',
        operationGuidance: ['Initial guidance'],
      });
      expect(JSON.parse(second.stdout)).toMatchObject({
        context: 'Updated context',
        operationGuidance: ['Updated guidance'],
      });
    });

    it('reads malformed operation config once and emits one warning per command', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
operations:
  apply:
    guidance: invalid
`
      );
      await createTestChange('apply-one-warning', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-one-warning', '--json'],
        { cwd: tempDir }
      );

      expect(result.exitCode).toBe(0);
      const matches = result.stderr.match(
        /Guidance for operation 'apply' must be an array of strings/g
      );
      expect(matches).toHaveLength(1);
      expect(JSON.parse(result.stdout).operationGuidance).toBeUndefined();
    });

    it('resolves single-star glob artifacts consistently between status and apply', async () => {
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'glob-test');
      const templatesDir = path.join(schemaDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });

      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        `name: glob-test
version: 1
description: Test schema for single-star globs
artifacts:
  - id: specs
    generates: specs/*/spec.md
    description: Nested specs
    template: spec.md
    requires: []
apply:
  requires: [specs]
  instruction: Ready when specs exist.
`
      );
      await fs.writeFile(path.join(templatesDir, 'spec.md'), '# Spec\n');

      const changeDir = path.join(changesDir, 'single-star-glob');
      const specPath = path.join(changeDir, 'specs', 'single-star-glob', 'spec.md');
      await fs.mkdir(path.dirname(specPath), { recursive: true });
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: glob-test\n');
      await fs.writeFile(specPath, '# Nested spec\n');

      const statusResult = await runCLI(['status', '--change', 'single-star-glob', '--json'], {
        cwd: tempDir,
      });
      expect(statusResult.exitCode).toBe(0);
      const statusJson = JSON.parse(statusResult.stdout);
      expect(statusJson.artifacts).toEqual([
        {
          id: 'specs',
          outputPath: 'specs/*/spec.md',
          status: 'done',
          requires: [],
        },
      ]);

      const applyResult = await runCLI(
        ['instructions', 'apply', '--change', 'single-star-glob', '--json'],
        { cwd: tempDir }
      );
      expect(applyResult.exitCode).toBe(0);
      const applyJson = JSON.parse(applyResult.stdout);
      const resolvedSpecPath = canonical(specPath);
      expect(applyJson.state).toBe('ready');
      expect(applyJson.missingArtifacts).toBeUndefined();
      expect(applyJson.contextFiles).toEqual({
        specs: [resolvedSpecPath],
      });
    });

    it('shows schema instruction from apply block', async () => {
      await createTestChange('instr-apply', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(['instructions', 'apply', '--change', 'instr-apply'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      // Should show the instruction from spec-driven schema apply block
      expect(result.stdout).toContain('work through pending tasks');
    });

    it('shows all_done state when all tasks are complete', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
context: Required all-done context
operations:
  apply:
    guidance:
      - Advisory all-done guidance
`
      );
      const changeDir = await createTestChange('done-apply', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      // Overwrite tasks with all completed
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '## Tasks\n- [x] Task 1\n- [x] Task 2'
      );

      const result = await runCLI(['instructions', 'apply', '--change', 'done-apply'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('complete ✓');
      expect(result.stdout).toContain('ready to be archived');
      expect(result.stdout).toContain('### Project Context (required instruction input)');
      expect(result.stdout).toContain('### Operation Guidance (advisory)');
    });

    it('uses spec-driven schema apply configuration', async () => {
      // Create a spec-driven style change with all artifacts
      await createTestChange('apply-schema-test', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-schema-test', '--schema', 'spec-driven'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Schema: spec-driven');
    });

    it('spec-driven schema uses apply block configuration', async () => {
      // Verify that spec-driven schema uses its apply block (requires: [tasks])
      await createTestChange('apply-config-test', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'apply-config-test', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      // spec-driven schema has apply block with requires: [tasks], so should be ready
      expect(json.schemaName).toBe('spec-driven');
      expect(json.state).toBe('ready');
    });

    it('fallback: requires all artifacts when schema has no apply block', async () => {
      // Create a minimal schema without an apply block in user schemas dir
      const userDataDir = path.join(tempDir, 'user-data');
      const noApplySchemaDir = path.join(userDataDir, 'openspec', 'schemas', 'no-apply');
      const templatesDir = path.join(noApplySchemaDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });

      // Minimal schema with 2 artifacts, no apply block
      const schemaContent = `
name: no-apply
version: 1
description: Test schema without apply block
artifacts:
  - id: first
    generates: first.md
    description: First artifact
    template: first.md
    requires: []
  - id: second
    generates: second.md
    description: Second artifact
    template: second.md
    requires: [first]
`;
      await fs.writeFile(path.join(noApplySchemaDir, 'schema.yaml'), schemaContent);
      await fs.writeFile(path.join(templatesDir, 'first.md'), '# First\n');
      await fs.writeFile(path.join(templatesDir, 'second.md'), '# Second\n');

      // Create a change with only the first artifact (missing second)
      const changeDir = path.join(changesDir, 'no-apply-test');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'first.md'), '# First artifact content');

      // Run with XDG_DATA_HOME pointing to our temp user data dir
      const result = await runCLI(
        ['instructions', 'apply', '--change', 'no-apply-test', '--schema', 'no-apply', '--json'],
        {
          cwd: tempDir,
          env: { XDG_DATA_HOME: userDataDir },
        }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      // Without apply block, fallback requires ALL artifacts - second is missing
      expect(json.schemaName).toBe('no-apply');
      expect(json.state).toBe('blocked');
      expect(json.missingArtifacts).toContain('second');
    });

    it('fallback: ready when all artifacts exist for schema without apply block', async () => {
      // Create a minimal schema without an apply block
      const userDataDir = path.join(tempDir, 'user-data-2');
      const noApplySchemaDir = path.join(userDataDir, 'openspec', 'schemas', 'no-apply-full');
      const templatesDir = path.join(noApplySchemaDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });

      const schemaContent = `
name: no-apply-full
version: 1
description: Test schema without apply block
artifacts:
  - id: only
    generates: only.md
    description: Only artifact
    template: only.md
    requires: []
`;
      await fs.writeFile(path.join(noApplySchemaDir, 'schema.yaml'), schemaContent);
      await fs.writeFile(path.join(templatesDir, 'only.md'), '# Only\n');

      // Create a change with the artifact present
      const changeDir = path.join(changesDir, 'no-apply-full-test');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, 'only.md'), '# Content');

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'no-apply-full-test', '--schema', 'no-apply-full', '--json'],
        {
          cwd: tempDir,
          env: { XDG_DATA_HOME: userDataDir },
        }
      );
      expect(result.exitCode).toBe(0);

      const json = JSON.parse(result.stdout);
      // All artifacts exist, should be ready with default instruction
      expect(json.schemaName).toBe('no-apply-full');
      expect(json.state).toBe('ready');
      expect(json.instruction).toContain('All required artifacts complete');
    });
  });

  describe('instructions archive command', () => {
    it('returns current archive context, guidance, and the root envelope in JSON', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
context: Archive project context
rules:
  specs:
    - Artifact-only rule
operations:
  apply:
    guidance:
      - Apply guidance
  archive:
    guidance:
      - Archive guidance
`
      );
      await createTestChange('archive-inputs', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'archive', '--change', 'archive-inputs', '--json'],
        { cwd: tempDir }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(JSON.parse(result.stdout)).toEqual({
        changeName: 'archive-inputs',
        context: 'Archive project context',
        operationGuidance: ['Archive guidance'],
        root: {
          path: canonical(tempDir),
          source: 'nearest',
        },
      });
      expect(result.stdout).not.toContain('Apply guidance');
      expect(result.stdout).not.toContain('Artifact-only rule');
      expect(result.stdout).not.toContain('Perform the archive');
    });

    it('renders required context and advisory archive guidance as separate text sections', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        `schema: spec-driven
context: Archive background
operations:
  archive:
    guidance:
      - Summarize the outcome
`
      );
      await createTestChange('archive-text-inputs');

      const result = await runCLI(
        ['instructions', 'archive', '--change', 'archive-text-inputs'],
        { cwd: tempDir }
      );

      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('## Archive Inputs: archive-text-inputs');
      expect(result.stdout).toContain('### Project Context (required instruction input)');
      expect(result.stdout).toContain('Archive background');
      expect(result.stdout).toContain('### Operation Guidance (advisory)');
      expect(result.stdout).toContain('- Summarize the outcome');
      expect(result.stdout).not.toContain('### Project Context (advisory)');
    });

    it('succeeds with valid empty inputs and omits optional JSON fields', async () => {
      await fs.writeFile(
        path.join(tempDir, 'openspec', 'config.yaml'),
        'schema: spec-driven\n'
      );
      await createTestChange('archive-no-inputs');

      const jsonResult = await runCLI(
        ['instructions', 'archive', '--change', 'archive-no-inputs', '--json'],
        { cwd: tempDir }
      );
      const textResult = await runCLI(
        ['instructions', 'archive', '--change', 'archive-no-inputs'],
        { cwd: tempDir }
      );

      expect(jsonResult.exitCode).toBe(0);
      const json = JSON.parse(jsonResult.stdout);
      expect(json.changeName).toBe('archive-no-inputs');
      expect(json.context).toBeUndefined();
      expect(json.operationGuidance).toBeUndefined();
      expect(textResult.stdout).toContain(
        'No project context or operation guidance configured.'
      );
    });

    it('requires a change and rejects changes outside the selected root', async () => {
      await createTestChange('available-change');

      const missing = await runCLI(['instructions', 'archive', '--json'], {
        cwd: tempDir,
      });
      const invalid = await runCLI(
        ['instructions', 'archive', '--change', 'missing-change', '--json'],
        { cwd: tempDir }
      );

      expect(missing.exitCode).toBe(1);
      expect(JSON.parse(missing.stdout).status[0].message).toContain(
        'Missing required option --change'
      );
      expect(invalid.exitCode).toBe(1);
      expect(JSON.parse(invalid.stdout).status[0].message).toContain(
        "Change 'missing-change' not found"
      );
    });

    it('reads fresh archive inputs without mutating specs or the change', async () => {
      const configPath = path.join(tempDir, 'openspec', 'config.yaml');
      const changeDir = await createTestChange('archive-read-only', [
        'proposal',
        'design',
        'specs',
        'tasks',
      ]);
      const proposalPath = path.join(changeDir, 'proposal.md');
      const proposalBefore = await fs.readFile(proposalPath, 'utf-8');
      await fs.writeFile(
        configPath,
        `schema: spec-driven
context: First archive context
operations:
  archive:
    guidance:
      - First archive guidance
`
      );

      const first = await runCLI(
        ['instructions', 'archive', '--change', 'archive-read-only', '--json'],
        { cwd: tempDir }
      );
      await fs.writeFile(
        configPath,
        `schema: spec-driven
context: Second archive context
operations:
  archive:
    guidance:
      - Second archive guidance
`
      );
      const second = await runCLI(
        ['instructions', 'archive', '--change', 'archive-read-only', '--json'],
        { cwd: tempDir }
      );

      expect(JSON.parse(first.stdout)).toMatchObject({
        context: 'First archive context',
        operationGuidance: ['First archive guidance'],
      });
      expect(JSON.parse(second.stdout)).toMatchObject({
        context: 'Second archive context',
        operationGuidance: ['Second archive guidance'],
      });
      expect(await fs.readFile(proposalPath, 'utf-8')).toBe(proposalBefore);
      expect(await fs.readdir(path.join(changeDir, 'specs'))).toEqual(['test-spec.md']);
      expect(
        await fs.readdir(path.join(tempDir, 'openspec', 'changes'))
      ).toContain('archive-read-only');
      expect(
        await fs
          .stat(path.join(tempDir, 'openspec', 'specs'))
          .then(() => true)
          .catch(() => false)
      ).toBe(false);
    });
  });

  describe('help text', () => {
    it('status command help shows description', async () => {
      const result = await runCLI(['status', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Display artifact completion status');
    });

    it('instructions command help shows description', async () => {
      const result = await runCLI(['instructions', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Output enriched instructions');
    });

    it('templates command help shows description', async () => {
      const result = await runCLI(['templates', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Show resolved template paths');
    });

    it('new command help shows description', async () => {
      const result = await runCLI(['new', '--help']);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Create new items');
    });
  });

  describe('experimental command (deprecated alias for init)', () => {
    it('shows deprecation notice', async () => {
      const result = await runCLI(['experimental', '--tool', 'claude'], { cwd: tempDir });
      // May succeed or fail depending on setup, but should show deprecation notice
      const output = getOutput(result);
      expect(output).toContain('deprecated');
    });

    it('errors for unknown tool', async () => {
      const result = await runCLI(['experimental', '--tool', 'unknown-tool'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(1);
      const output = getOutput(result);
      expect(output).toContain('Invalid tool(s): unknown-tool');
    });

    it('creates skills for the shared agents target', async () => {
      const result = await runCLI(['experimental', '--tool', 'agents'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);

      const skillFile = path.join(tempDir, '.agents', 'skills', 'openspec-explore', 'SKILL.md');
      const stat = await fs.stat(skillFile);
      expect(stat.isFile()).toBe(true);
    });

    it('creates skills for Claude tool', async () => {
      const result = await runCLI(['experimental', '--tool', 'claude'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      const output = normalizePaths(getOutput(result));
      expect(output).toContain('Claude Code');
      expect(output).toContain('.claude/');

      // Verify skill files were created
      const skillFile = path.join(tempDir, '.claude', 'skills', 'openspec-explore', 'SKILL.md');
      const stat = await fs.stat(skillFile);
      expect(stat.isFile()).toBe(true);
    });

    it('creates skills for Cursor tool', async () => {
      const result = await runCLI(['experimental', '--tool', 'cursor'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      const output = normalizePaths(getOutput(result));
      expect(output).toContain('Cursor');
      expect(output).toContain('.cursor/');

      // Verify skill files were created
      const skillFile = path.join(tempDir, '.cursor', 'skills', 'openspec-explore', 'SKILL.md');
      const stat = await fs.stat(skillFile);
      expect(stat.isFile()).toBe(true);

      // Verify commands were created with Cursor format
      const commandFile = path.join(tempDir, '.cursor', 'commands', 'opsx-explore.md');
      const content = await fs.readFile(commandFile, 'utf-8');
      expect(content).toContain('name: "/opsx-explore"');
    });

    it('creates skills for the retired windsurf id, under Devin Desktop', async () => {
      const result = await runCLI(['experimental', '--tool', 'windsurf'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      const output = normalizePaths(getOutput(result));
      expect(output).toContain('Devin Desktop');
      expect(output).toContain('.devin/');

      // Verify skill files were created
      const skillFile = path.join(tempDir, '.devin', 'skills', 'openspec-explore', 'SKILL.md');
      const stat = await fs.stat(skillFile);
      expect(stat.isFile()).toBe(true);
    });
  });

  describe('project config integration', () => {
    describe('new change uses config schema', () => {
      it('creates change with schema from project config', async () => {
        // Create project config with spec-driven schema
        // Note: changesDir is already at tempDir/openspec/changes (created in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          'schema: spec-driven\n'
        );

        // Create a new change without specifying schema
        const result = await runCLI(['new', 'change', 'test-change'], { cwd: tempDir, timeoutMs: 30000 });
        expect(result.exitCode).toBe(0);

        // Verify the change was created with spec-driven schema
        const metadataPath = path.join(changesDir, 'test-change', '.openspec.yaml');
        const metadata = await fs.readFile(metadataPath, 'utf-8');
        expect(metadata).toContain('schema: spec-driven');
      }, 60000);

      it('CLI schema overrides config schema', async () => {
        // Create project config with spec-driven schema
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          'schema: spec-driven\n'
        );

        // Create change with explicit schema
        const result = await runCLI(
          ['new', 'change', 'override-test', '--schema', 'spec-driven'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);

        // Verify the change uses the CLI-specified schema
        const metadataPath = path.join(changesDir, 'override-test', '.openspec.yaml');
        const metadata = await fs.readFile(metadataPath, 'utf-8');
        expect(metadata).toContain('schema: spec-driven');
      }, 60000);
    });

    describe('instructions command with config', () => {
      it('injects context and rules from config into instructions', async () => {
        // Create project config with context and rules
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
context: |
  Tech stack: TypeScript, React
  API style: RESTful
rules:
  proposal:
    - Include rollback plan
    - Identify affected teams
`
        );

        // Create a test change
        await createTestChange('config-test');

        // Get instructions for proposal
        const result = await runCLI(
          ['instructions', 'proposal', '--change', 'config-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);

        // Verify context is injected
        expect(result.stdout).toContain('Tech stack: TypeScript, React');
        expect(result.stdout).toContain('API style: RESTful');

        // Verify rules are injected for proposal
        expect(result.stdout).toContain('Include rollback plan');
        expect(result.stdout).toContain('Identify affected teams');
      }, 60000);

      it('does not inject rules for non-matching artifact', async () => {
        // Create project config with rules only for proposal
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
rules:
  proposal:
    - Include rollback plan
`
        );

        // Create a test change
        await createTestChange('non-matching-test');

        // Get instructions for design (not proposal)
        const result = await runCLI(
          ['instructions', 'design', '--change', 'non-matching-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);

        // Verify rules are NOT injected for design
        expect(result.stdout).not.toContain('Include rollback plan');
      }, 60000);
    });

    describe('backwards compatibility', () => {
      it('existing changes work without config file', async () => {
        // Create change without any config file
        await createTestChange('no-config-change', ['proposal']);

        // Status command should work
        const statusResult = await runCLI(
          ['status', '--change', 'no-config-change'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(statusResult.exitCode).toBe(0);
        expect(statusResult.stdout).toContain('no-config-change');
        expect(statusResult.stdout).toContain('spec-driven'); // Default schema

        // Instructions command should work
        const instrResult = await runCLI(
          ['instructions', 'design', '--change', 'no-config-change'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(instrResult.exitCode).toBe(0);
        expect(instrResult.stdout).toContain('<artifact');
      }, 60000);

      it('changes with metadata work without config file', async () => {
        // Create change with explicit schema in metadata
        const changeDir = await createTestChange('metadata-only-change');
        await fs.writeFile(
          path.join(changeDir, '.openspec.yaml'),
          'schema: spec-driven\ncreated: "2025-01-05"\n'
        );

        // Status should use schema from metadata
        const result = await runCLI(
          ['status', '--change', 'metadata-only-change'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('spec-driven');
      }, 60000);
    });

    describe('config changes reflected immediately', () => {
      it('config changes are reflected without restart', async () => {
        // Create initial config
        // Note: openspec directory already exists (from changesDir creation in beforeEach)
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
context: Initial context
`
        );

        // Create a test change
        await createTestChange('immediate-test');

        // Get instructions - should have initial context
        const result1 = await runCLI(
          ['instructions', 'proposal', '--change', 'immediate-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result1.exitCode).toBe(0);
        expect(result1.stdout).toContain('Initial context');

        // Update config
        await fs.writeFile(
          path.join(tempDir, 'openspec', 'config.yaml'),
          `schema: spec-driven
context: Updated context
`
        );

        // Get instructions again - should have updated context
        const result2 = await runCLI(
          ['instructions', 'proposal', '--change', 'immediate-test'],
          { cwd: tempDir, timeoutMs: 30000 }
        );
        expect(result2.exitCode).toBe(0);
        expect(result2.stdout).toContain('Updated context');
        expect(result2.stdout).not.toContain('Initial context');
      }, 60000);
    });
  });
});
