import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('validate command enriched human output', () => {
  const projectRoot = process.cwd();
  const testDir = path.join(projectRoot, 'test-validate-enriched-tmp');
  const changesDir = path.join(testDir, 'openspec', 'changes');
  const bin = path.join(projectRoot, 'bin', 'openspec.js');


  beforeEach(async () => {
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('prints Next steps footer and guidance on invalid change', async () => {
    const changeContent = `# Test Change\n\n## Why\nThis is a sufficiently long explanation to pass the why length requirement for validation purposes.\n\n## What Changes\nThere are changes proposed, but no delta specs provided yet.`;
    const changeId = 'c-next-steps';
    const changePath = path.join(changesDir, changeId);
    await fs.mkdir(changePath, { recursive: true });
    await fs.writeFile(path.join(changePath, 'proposal.md'), changeContent);

    const originalCwd = process.cwd();
    try {
      process.chdir(testDir);
      let code = 0;
      let stderr = '';
      try {
        execSync(`node ${bin} change validate ${changeId}`, { encoding: 'utf-8', stdio: 'pipe' });
      } catch (e: any) {
        code = e?.status ?? 1;
        stderr = e?.stderr?.toString?.() ?? '';
      }
      expect(code).not.toBe(0);
      expect(stderr).toContain('has issues');
      expect(stderr).toContain('Next steps:');
      expect(stderr).toContain('openspec change show');
    } finally {
      process.chdir(originalCwd);
    }
  });
});


