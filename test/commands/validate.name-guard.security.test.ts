import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

/**
 * `--type` short-circuits the membership check, so the id reached
 * `path.join(root.specsDir, id, 'spec.md')` unguarded and
 * `openspec validate ../../secret --type spec` traversed out of the root.
 * `openspec show` already rejects the same input.
 */
describe('validate --type name guard', () => {
  // Outside the repo working tree: an interrupted run must not leave an
  // untracked `openspec/` + `secret/` fixture for the next `git add -A`.
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-validate-name-guard-'));
    await fs.mkdir(path.join(testDir, 'openspec', 'changes'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'openspec', 'specs'), { recursive: true });
    await fs.mkdir(path.join(testDir, 'secret'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'secret', 'spec.md'), '# secret\n', 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('refuses a traversing spec id', async () => {
    const result = await runCLI(['validate', '../../secret', '--type', 'spec'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Spec id must not be '..'");
  });

  it('refuses a Windows-separator traversing spec id', async () => {
    const result = await runCLI(['validate', '..\\..\\secret', '--type', 'spec'], {
      cwd: testDir,
    });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('must not contain path separators');
  });

  it('still accepts a nested spec id', async () => {
    // Nested capabilities (specs/<area>/<capability>/spec.md, #1353) are legal,
    // so the guard runs per segment - rejecting every id containing a `/` would
    // break them, including the hint `validate --specs` prints.
    await fs.mkdir(path.join(testDir, 'openspec', 'specs', 'platform', 'widgets'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(testDir, 'openspec', 'specs', 'platform', 'widgets', 'spec.md'),
      [
        '# widgets',
        '',
        '## Purpose',
        'A nested capability used to prove nested ids still validate cleanly.',
        '',
        '## Requirements',
        '### Requirement: Widgets',
        'The system SHALL provide widgets.',
        '',
        '#### Scenario: Basic',
        '- **WHEN** asked',
        '- **THEN** it responds',
        '',
      ].join('\n')
    );

    const result = await runCLI(['validate', 'platform/widgets', '--type', 'spec'], {
      cwd: testDir,
    });
    expect(result.exitCode).toBe(0);
  });

  it('refuses a traversing change name', async () => {
    const result = await runCLI(['validate', '..', '--type', 'change'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain("Change name must not be '..'");
  });

  it('reports the refusal as JSON for a JSON run', async () => {
    const result = await runCLI(['validate', '../../secret', '--type', 'spec', '--json'], {
      cwd: testDir,
    });
    expect(result.exitCode).toBe(1);
    expect(JSON.parse(result.stdout).status[0].code).toBe('invalid_item');
  });
});
