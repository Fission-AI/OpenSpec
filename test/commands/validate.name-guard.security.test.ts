import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

/**
 * `--type` short-circuits the membership check, so the id reached
 * `path.join(root.specsDir, id, 'spec.md')` unguarded and
 * `openspec validate ../../secret --type spec` traversed out of the root.
 * `openspec show` already rejects the same input.
 */
describe('validate --type name guard', () => {
  const testDir = path.join(process.cwd(), 'test-validate-name-guard-tmp');
  const specsDir = path.join(testDir, 'openspec', 'specs');

  beforeEach(async () => {
    await fs.mkdir(path.join(testDir, 'openspec', 'changes'), { recursive: true });
    await fs.mkdir(specsDir, { recursive: true });
    await fs.mkdir(path.join(testDir, 'secret'), { recursive: true });
    await fs.writeFile(path.join(testDir, 'secret', 'spec.md'), '# secret\n', 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('refuses a traversing spec id', async () => {
    const result = await runCLI(['validate', '../../secret', '--type', 'spec'], { cwd: testDir });
    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('must not contain path separators');
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
