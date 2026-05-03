import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { runCLI } from '../helpers/run-cli.js';

// Note: We cannot truly simulate TTY prompts in this test runner easily.
// Instead, we verify non-interactive fallback behavior and basic invocation.

describe('change validate (interactive behavior)', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-change-validate-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');

  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
    const content = `# Change: Demo\n\n## Why\nBecause reasons that are sufficiently long.\n\n## What Changes\n- **spec-x:** Add something`;
    await fs.mkdir(path.join(changesDir, 'demo'), { recursive: true });
    await fs.writeFile(path.join(changesDir, 'demo', 'proposal.md'), content, 'utf-8');
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints list hint and exits non-zero when no arg and non-interactive', async () => {
    const result = await runCLI(['change', 'validate'], {
      cwd: testDir,
      env: { OPENSPEC_INTERACTIVE: '0' },
    });
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('IDs disponíveis:');
    expect(result.stderr).toContain('openspec list');
  });
});


