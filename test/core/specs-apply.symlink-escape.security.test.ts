import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { findSpecUpdates } from '../../src/core/specs-apply.js';

const itWithSymlinks = it.skipIf(process.platform === 'win32');

/**
 * A capability directory may be a link within the project (monorepo layout),
 * but a link that leaves the project let a hostile repo make `openspec archive`
 * write attacker-controlled markdown to `<external-dir>/spec.md` while printing
 * the in-project path.
 */
describe('a linked capability directory cannot leave the project', () => {
  let tempDir: string;
  let projectDir: string;
  let changeDir: string;
  let mainSpecsDir: string;
  let outsideDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-link-escape-'));
    projectDir = path.join(tempDir, 'repo');
    changeDir = path.join(projectDir, 'openspec', 'changes', 'test-change');
    mainSpecsDir = path.join(projectDir, 'openspec', 'specs');
    outsideDir = path.join(tempDir, 'outside');
    await fs.mkdir(path.join(changeDir, 'specs', 'widgets'), { recursive: true });
    await fs.mkdir(mainSpecsDir, { recursive: true });
    await fs.mkdir(outsideDir, { recursive: true });
    await fs.writeFile(
      path.join(changeDir, 'specs', 'widgets', 'spec.md'),
      [
        '## ADDED Requirements',
        '',
        '### Requirement: Pwned',
        'The system SHALL be pwned.',
        '',
        '#### Scenario: Apply',
        '- **WHEN** the change is archived',
        '- **THEN** the spec is updated',
        '',
      ].join('\n')
    );
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  itWithSymlinks('refuses a capability directory linked outside the project root', async () => {
    await fs.symlink(outsideDir, path.join(mainSpecsDir, 'widgets'));

    await expect(findSpecUpdates(changeDir, mainSpecsDir)).rejects.toThrow(
      'Path is outside the allowed directory'
    );
    await expect(fs.readdir(outsideDir)).resolves.toEqual([]);
  });

  itWithSymlinks('still allows a capability directory linked within the project', async () => {
    const insideDir = path.join(projectDir, 'shared', 'widgets');
    await fs.mkdir(insideDir, { recursive: true });
    await fs.symlink(insideDir, path.join(mainSpecsDir, 'widgets'));

    const [update] = await findSpecUpdates(changeDir, mainSpecsDir);

    expect(update.target).toBe(
      path.join(await fs.realpath(insideDir), 'spec.md')
    );
  });
});
