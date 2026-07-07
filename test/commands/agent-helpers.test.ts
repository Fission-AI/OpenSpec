import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs, realpathSync } from 'fs';
import path from 'path';
import os from 'os';
import { runCLI } from '../helpers/run-cli.js';

/**
 * End-to-end coverage for the three agent-facing helper commands:
 *   - openspec agent resolve-change
 *   - openspec agent next-artifact
 *   - openspec agent mark-task-done
 *
 * Plus enrichment cases for the existing `instructions apply --json`
 * payload (numericId / nextPendingId on tasks).
 *
 * Mirrors the fixture style in `artifact-workflow.test.ts`: each test
 * gets its own tmpdir with a freshly scaffolded `openspec/changes/`
 * tree. We do not call `openspec init` because the workflow commands
 * only need the changes directory to exist.
 */
describe('agent helper CLI commands', () => {
  let tempDir: string;
  let changesDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-agent-helpers-'));
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

  async function makeChange(
    changeName: string,
    artifacts: ('proposal' | 'design' | 'specs' | 'tasks')[] = []
  ): Promise<string> {
    const changeDir = path.join(changesDir, changeName);
    await fs.mkdir(changeDir, { recursive: true });

    // Proposal always present so the change is detected as active.
    const proposalContent = artifacts.includes('proposal')
      ? '## Why\nReason long enough to satisfy validation.\n\n## What Changes\n- **test:** Something'
      : '## Why\nMinimal proposal.\n\n## What Changes\n- **test:** Placeholder';
    await fs.writeFile(path.join(changeDir, 'proposal.md'), proposalContent);

    if (artifacts.includes('design')) {
      await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\nTechnical design.');
    }
    if (artifacts.includes('specs')) {
      const specsDir = path.join(changeDir, 'specs');
      await fs.mkdir(specsDir, { recursive: true });
      await fs.writeFile(path.join(specsDir, 'test-spec.md'), '## Purpose\nTest spec.');
    }
    if (artifacts.includes('tasks')) {
      await fs.writeFile(
        path.join(changeDir, 'tasks.md'),
        '## Tasks\n- [ ] 1.1 First task\n- [ ] 1.2 Second task\n'
      );
    }

    return changeDir;
  }

  // ---------------------------------------------------------------------------
  // resolve-change
  // ---------------------------------------------------------------------------
  describe('resolve-change command', () => {
    it('prints empty list when no changes exist', async () => {
      const result = await runCLI(['agent', 'resolve-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.changes).toEqual([]);
    });

    it('lists every active change as JSON when no name and no --auto', async () => {
      await makeChange('alpha');
      await makeChange('beta');

      const result = await runCLI(['agent', 'resolve-change'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.changes.map((c: { name: string }) => c.name).sort()).toEqual(['alpha', 'beta']);
    });

    it('echoes the name when a valid change is supplied', async () => {
      await makeChange('alpha');
      const result = await runCLI(['agent', 'resolve-change', 'alpha'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('alpha');
    });

    it('exits 2 when the named change does not exist', async () => {
      await makeChange('alpha');
      const result = await runCLI(['agent', 'resolve-change', 'bogus'], { cwd: tempDir });
      expect(result.exitCode).toBe(2);
      expect(getOutput(result)).toContain("Change 'bogus' is not active");
      expect(getOutput(result)).toContain('alpha');
    });

    it('exits 2 with an invalid change name (path traversal)', async () => {
      const result = await runCLI(['agent', 'resolve-change', '../etc'], { cwd: tempDir });
      expect(result.exitCode).toBe(2);
      expect(getOutput(result)).toContain('Invalid change name');
    });

    it('--auto exits 1 when no changes exist', async () => {
      const result = await runCLI(['agent', 'resolve-change', '--auto'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('No active changes');
    });

    it('--auto echoes the only active change', async () => {
      await makeChange('only-one');
      const result = await runCLI(['agent', 'resolve-change', '--auto'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(result.stdout.trim()).toBe('only-one');
    });

    it('--auto exits 3 with a distinct message when multiple changes are active', async () => {
      await makeChange('alpha');
      await makeChange('beta');
      const result = await runCLI(['agent', 'resolve-change', '--auto'], { cwd: tempDir });
      expect(result.exitCode).toBe(3);
      const out = getOutput(result);
      expect(out).toContain('Multiple active changes');
      expect(out).toContain('alpha');
      expect(out).toContain('beta');
    });

    it('--json with a named change emits structured payload', async () => {
      await makeChange('alpha');
      const result = await runCLI(['agent', 'resolve-change', 'alpha', '--json'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.name).toBe('alpha');
      expect(typeof json.path).toBe('string');
      // Canonicalize both sides so the symlinked macOS tmpdir
      // (/var → /private/var) does not cause a spurious mismatch.
      const expectedPath = realpathSync.native(path.join(changesDir, 'alpha'));
      const actualPath = realpathSync.native(json.path);
      expect(actualPath).toBe(expectedPath);
    });
  });

  // ---------------------------------------------------------------------------
  // next-artifact
  // ---------------------------------------------------------------------------
  describe('next-artifact command', () => {
    it('returns proposal as the first ready artifact on a scaffolded change', async () => {
      const changeDir = path.join(changesDir, 'scaffolded');
      await fs.mkdir(changeDir, { recursive: true });

      const result = await runCLI(['agent', 'next-artifact', '--change', 'scaffolded'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.done).toBe(false);
      expect(json.artifactId).toBe('proposal');
      expect(json.template).toBeTruthy();
      expect(Array.isArray(json.dependencies)).toBe(true);
    });

    it('skips completed artifacts and surfaces the next ready one', async () => {
      // proposal + design done; next ready should be specs (no longer blocked
      // by design).
      await makeChange('mid-stream', ['proposal', 'design']);

      const result = await runCLI(['agent', 'next-artifact', '--change', 'mid-stream'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.done).toBe(false);
      // spec-driven order: proposal → design → specs → tasks. With proposal+design
      // done, "specs" is the next ready node.
      expect(json.artifactId).toBe('specs');
    });

    it('emits { done: true } when every artifact is complete', async () => {
      await makeChange('all-done', ['proposal', 'design', 'specs', 'tasks']);
      const result = await runCLI(['agent', 'next-artifact', '--change', 'all-done'], { cwd: tempDir });
      expect(result.exitCode).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ done: true });
    });

    it('--no-json prints a compact human summary', async () => {
      const changeDir = path.join(changesDir, 'humanmode');
      await fs.mkdir(changeDir, { recursive: true });

      const result = await runCLI(['agent', 'next-artifact', '--change', 'humanmode', '--no-json'], {
        cwd: tempDir,
      });
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Next artifact: proposal');
      expect(result.stdout).toContain('Use --json');
    });

    it('errors with a helpful message when --change is omitted', async () => {
      await makeChange('something');
      const result = await runCLI(['agent', 'next-artifact'], { cwd: tempDir });
      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain('Missing required option --change');
    });
  });

  // ---------------------------------------------------------------------------
  // mark-task-done + parser/nextPendingId enrichment
  // ---------------------------------------------------------------------------
  describe('mark-task-done command', () => {
    async function writeTasks(changeName: string, body: string): Promise<string> {
      const tasksPath = path.join(changesDir, changeName, 'tasks.md');
      await fs.writeFile(tasksPath, body);
      return tasksPath;
    }

    it('flips a single unchecked task and reports flipped status', async () => {
      await makeChange('flipme', ['proposal', 'design', 'specs']);
      const tasksPath = await writeTasks(
        'flipme',
        '## Tasks\n- [ ] 1.1 First\n- [ ] 1.2 Second\n'
      );

      const result = await runCLI(
        ['agent', 'mark-task-done', '--change', 'flipme', '1.1', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.status).toBe('flipped');
      expect(payload.taskId).toBe('1.1');

      const after = await fs.readFile(tasksPath, 'utf8');
      expect(after).toContain('- [x] 1.1 First');
      expect(after).toContain('- [ ] 1.2 Second');
    });

    it('is idempotent on an already-checked task', async () => {
      await makeChange('already-done', ['proposal', 'design', 'specs']);
      await writeTasks(
        'already-done',
        '## Tasks\n- [x] 1.1 Done\n- [ ] 1.2 Pending\n'
      );

      const result = await runCLI(
        ['agent', 'mark-task-done', '--change', 'already-done', '1.1', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      const payload = JSON.parse(result.stdout);
      expect(payload.status).toBe('already-done');
    });

    it('distinguishes 1.1 from 1.10 with a hierarchical-id boundary', async () => {
      await makeChange('boundary', ['proposal', 'design', 'specs']);
      const tasksPath = await writeTasks(
        'boundary',
        '## Tasks\n- [ ] 1.1 First\n- [ ] 1.10 Tenth\n'
      );

      // Mark 1.1; 1.10 must stay unchecked.
      const r1 = await runCLI(
        ['agent', 'mark-task-done', '--change', 'boundary', '1.1'],
        { cwd: tempDir }
      );
      expect(r1.exitCode).toBe(0);

      let body = await fs.readFile(tasksPath, 'utf8');
      expect(body).toContain('- [x] 1.1 First');
      expect(body).toContain('- [ ] 1.10 Tenth');

      // Now mark 1.10; 1.1 stays as it was.
      const r2 = await runCLI(
        ['agent', 'mark-task-done', '--change', 'boundary', '1.10'],
        { cwd: tempDir }
      );
      expect(r2.exitCode).toBe(0);
      body = await fs.readFile(tasksPath, 'utf8');
      expect(body).toContain('- [x] 1.10 Tenth');
    });

    it('exits 2 when the task id has no matching line', async () => {
      await makeChange('nomatch', ['proposal', 'design', 'specs']);
      await writeTasks('nomatch', '## Tasks\n- [ ] 1.1 Only one\n');

      const result = await runCLI(
        ['agent', 'mark-task-done', '--change', 'nomatch', '9.9'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(2);
      expect(getOutput(result)).toContain("No unchecked task line with id '9.9'");
    });

    it('preserves CRLF line endings when rewriting the file', async () => {
      await makeChange('crlf', ['proposal', 'design', 'specs']);
      const tasksPath = path.join(changesDir, 'crlf', 'tasks.md');
      // Explicit CRLF body.
      const crlfBody = '## Tasks\r\n- [ ] 1.1 First\r\n- [ ] 1.2 Second\r\n';
      await fs.writeFile(tasksPath, crlfBody);

      const result = await runCLI(
        ['agent', 'mark-task-done', '--change', 'crlf', '1.1'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);

      const after = await fs.readFile(tasksPath, 'utf8');
      // Should still use CRLF.
      expect(after.includes('\r\n')).toBe(true);
      expect(after).toContain('- [x] 1.1 First\r\n');
      expect(after).toContain('- [ ] 1.2 Second\r\n');
    });

    it('errors when the schema has no apply.tracks configured', async () => {
      // Build a custom schema with no tracks setting.
      const schemaDir = path.join(tempDir, 'openspec', 'schemas', 'no-tracks');
      const templatesDir = path.join(schemaDir, 'templates');
      await fs.mkdir(templatesDir, { recursive: true });
      await fs.writeFile(
        path.join(schemaDir, 'schema.yaml'),
        `name: no-tracks
version: 1
description: Schema without an apply.tracks configuration
artifacts:
  - id: proposal
    generates: proposal.md
    description: Proposal
    template: proposal.md
    requires: []
apply:
  requires: [proposal]
  instruction: Proceed.
`
      );
      await fs.writeFile(path.join(templatesDir, 'proposal.md'), '# Proposal\n');

      const changeDir = path.join(changesDir, 'no-tracks-change');
      await fs.mkdir(changeDir, { recursive: true });
      await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: no-tracks\n');
      await fs.writeFile(path.join(changeDir, 'proposal.md'), '# Proposal\n');

      const result = await runCLI(
        ['agent', 'mark-task-done', '--change', 'no-tracks-change', '1.1'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(2);
      expect(getOutput(result)).toContain("does not configure 'apply.tracks'");
    });

    it('exits 1 when the change cannot be resolved (unknown --change)', async () => {
      // Change resolution failures are distinct from the exit-2 "bad input"
      // cases: validateChangeExists throws and the CLI wrapper surfaces it as
      // exit 1, matching `agent next-artifact`.
      await makeChange('real-one', ['proposal', 'design', 'specs']);

      const result = await runCLI(
        ['agent', 'mark-task-done', '--change', 'ghost', '1.1'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(1);
      expect(getOutput(result)).toContain("Change 'ghost' not found");
    });
  });

  // ---------------------------------------------------------------------------
  // parseTasksFile enrichment + nextPendingId (via existing `instructions apply --json`)
  // ---------------------------------------------------------------------------
  describe('instructions apply --json (enriched payload)', () => {
    it('extracts numericId from numbered tasks and exposes nextPendingId', async () => {
      await makeChange('enriched', ['proposal', 'design', 'specs']);
      await fs.writeFile(
        path.join(changesDir, 'enriched', 'tasks.md'),
        [
          '## Tasks',
          '- [ ] 1.1 First',
          '- [x] 1.2 Already done',
          '- [ ] 1.10 Tenth',
          '- [ ] 2.1 Section two',
        ].join('\n') + '\n'
      );

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'enriched', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);

      const numericIds = json.tasks.map((t: { numericId?: string }) => t.numericId);
      expect(numericIds).toEqual(['1.1', '1.2', '1.10', '2.1']);

      // Description should no longer contain the numeric prefix.
      const first = json.tasks[0];
      expect(first.description).toBe('First');
      expect(first.done).toBe(false);

      // First unchecked task with a numericId, in document order.
      expect(json.nextPendingId).toBe('1.1');
    });

    it('leaves tasks without numeric prefix unaffected and falls back to null nextPendingId', async () => {
      await makeChange('unnumbered', ['proposal', 'design', 'specs']);
      await fs.writeFile(
        path.join(changesDir, 'unnumbered', 'tasks.md'),
        '## Tasks\n- [ ] Plain unnumbered task\n- [x] Another plain task\n'
      );

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'unnumbered', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);

      expect(json.tasks).toHaveLength(2);
      expect(json.tasks[0].numericId).toBeUndefined();
      expect(json.tasks[0].description).toBe('Plain unnumbered task');
      expect(json.nextPendingId).toBeNull();
    });

    it('returns null nextPendingId when every numeric task is done', async () => {
      await makeChange('alldone', ['proposal', 'design', 'specs']);
      await fs.writeFile(
        path.join(changesDir, 'alldone', 'tasks.md'),
        '## Tasks\n- [x] 1.1 First\n- [x] 1.2 Second\n'
      );

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'alldone', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);
      expect(json.nextPendingId).toBeNull();
    });

    it('includes actionContext so the apply flow guards without a separate status call', async () => {
      await makeChange('with-context', ['proposal', 'design', 'specs', 'tasks']);

      const result = await runCLI(
        ['instructions', 'apply', '--change', 'with-context', '--json'],
        { cwd: tempDir }
      );
      expect(result.exitCode).toBe(0);
      const json = JSON.parse(result.stdout);

      // Repo-local fixture (no workspace) → repo-local mode with the project
      // root editable. The apply-change workspace guard reads these straight
      // from this payload now, so no extra `status --json` round-trip is needed.
      expect(json.actionContext).toBeDefined();
      expect(json.actionContext.mode).toBe('repo-local');
      expect(Array.isArray(json.actionContext.allowedEditRoots)).toBe(true);
      expect(json.actionContext.allowedEditRoots.length).toBeGreaterThan(0);
    });
  });
});
