import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import os from 'os';
import { randomUUID } from 'crypto';
import { runCLI } from '../helpers/run-cli.js';

/**
 * Integration coverage for the atd-close hard gate: the CLI signal the close
 * façade gates on (`openspec instructions apply --json` → state) must move
 * from not-all_done to all_done only when every tracked task is checked, and
 * a completed full-schema change must expose its delta specs to the sync
 * assessment via status JSON.
 */
describe('atd-close gate signal (CLI integration)', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = path.join(os.tmpdir(), `openspec-atd-close-gate-${randomUUID()}`);
    await fs.mkdir(path.join(projectDir, 'openspec', 'changes'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(projectDir, { recursive: true, force: true });
  });

  async function makeLiteChange(name: string, tasksContent: string): Promise<string> {
    const changeDir = path.join(projectDir, 'openspec', 'changes', name);
    await fs.mkdir(changeDir, { recursive: true });
    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: atd-sdlc-lite\n');
    await fs.writeFile(path.join(changeDir, 'ticket.md'), '# Ticket: ABC-1\n');
    await fs.writeFile(path.join(changeDir, 'analysis.md'), '# Analysis\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), tasksContent);
    return changeDir;
  }

  async function applyState(name: string): Promise<{ state: string; tasks?: unknown[] }> {
    const result = await runCLI(['instructions', 'apply', '--change', name, '--json'], { cwd: projectDir });
    expect(result.exitCode).toBe(0);
    return JSON.parse(result.stdout);
  }

  it('reports non-all_done while any tracked task (including a closure task) is unchecked', async () => {
    await makeLiteChange('abc-1-fix', [
      '# Tasks',
      '',
      '## 1. Fix',
      '',
      '- [x] 1.1 Correct the condition',
      '',
      '## 2. Closure',
      '',
      '- [ ] 2.1 Close the Jira ticket (idempotent)',
      '',
    ].join('\n'));

    const payload = await applyState('abc-1-fix');
    expect(payload.state).not.toBe('all_done');
  });

  it('reports all_done only when every tracked task is checked', async () => {
    await makeLiteChange('abc-2-fix', [
      '# Tasks',
      '',
      '## 1. Fix',
      '',
      '- [x] 1.1 Correct the condition',
      '',
      '## 2. Closure',
      '',
      '- [x] 2.1 Close the Jira ticket (idempotent)',
      '',
    ].join('\n'));

    const payload = await applyState('abc-2-fix');
    expect(payload.state).toBe('all_done');
  });

  it('a completed full-schema change exposes its delta specs to the sync assessment', async () => {
    const changeDir = path.join(projectDir, 'openspec', 'changes', 'abc-3-feature');
    await fs.mkdir(path.join(changeDir, 'specs', 'exports'), { recursive: true });
    await fs.writeFile(path.join(changeDir, '.openspec.yaml'), 'schema: atd-sdlc\n');
    await fs.writeFile(path.join(changeDir, 'ticket.md'), '# Ticket: ABC-3\n');
    await fs.writeFile(path.join(changeDir, 'analysis.md'), '# Analysis\n');
    await fs.writeFile(
      path.join(changeDir, 'specs', 'exports', 'spec.md'),
      '# exports Specification (delta)\n\n## ADDED Requirements\n\n### Requirement: Export\nThe system SHALL export.\n\n#### Scenario: Exports\n- **WHEN** asked\n- **THEN** exports\n'
    );
    await fs.writeFile(path.join(changeDir, 'design.md'), '# Design\n');
    await fs.writeFile(path.join(changeDir, 'solution.md'), '# Solution\n');
    await fs.writeFile(path.join(changeDir, 'tasks.md'), '# Tasks\n\n- [x] 1.1 Done\n');

    const payload = await applyState('abc-3-feature');
    expect(payload.state).toBe('all_done');

    // The sync assessment in close reads delta specs from status JSON.
    const statusResult = await runCLI(['status', '--change', 'abc-3-feature', '--json'], { cwd: projectDir });
    expect(statusResult.exitCode).toBe(0);
    const status = JSON.parse(statusResult.stdout);
    expect(status.schemaName).toBe('atd-sdlc');
    expect(status.artifactPaths.specs.existingOutputPaths).toHaveLength(1);
    expect(status.artifactPaths.specs.existingOutputPaths[0]).toContain(path.join('specs', 'exports', 'spec.md'));
  });
});
