import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { applySpecs, findSpecUpdates } from '../../src/core/specs-apply.js';

const ADDED_DELTA = `## ADDED Requirements

### Requirement: OAuth login
The system SHALL support OAuth login.

#### Scenario: Successful login
- **WHEN** a user signs in with OAuth
- **THEN** access is granted
`;

describe('domain-prefixed spec application', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-specs-apply-'));
    await fs.mkdir(path.join(tempDir, 'openspec', 'specs'), { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function writeDelta(changeId: string): Promise<string> {
    const changeDir = path.join(tempDir, 'openspec', 'changes', ...changeId.split('/'));
    const deltaDir = path.join(changeDir, 'specs', 'login');
    await fs.mkdir(deltaDir, { recursive: true });
    await fs.writeFile(path.join(deltaDir, 'spec.md'), ADDED_DELTA);
    return changeDir;
  }

  it('prepends the change domain to discovered capability targets', async () => {
    const changeDir = await writeDelta('auth/oauth/add-login');
    const specsDir = path.join(tempDir, 'openspec', 'specs');

    const updates = await findSpecUpdates(changeDir, specsDir, ['auth', 'oauth']);

    expect(updates).toEqual([
      {
        source: path.join(changeDir, 'specs', 'login', 'spec.md'),
        target: path.join(specsDir, 'auth', 'oauth', 'login', 'spec.md'),
        exists: false,
      },
    ]);
  });

  it('applies nested change deltas under the matching spec domain', async () => {
    await writeDelta('auth/oauth/add-login');

    await applySpecs(tempDir, 'auth/oauth/add-login', { skipValidation: true, silent: true });

    await expect(
      fs.readFile(path.join(tempDir, 'openspec', 'specs', 'auth', 'oauth', 'login', 'spec.md'), 'utf8')
    ).resolves.toContain('### Requirement: OAuth login');
    await expect(
      fs.access(path.join(tempDir, 'openspec', 'specs', 'login', 'spec.md'))
    ).rejects.toThrow();
  });

  it('leaves root change capability targets unchanged', async () => {
    await writeDelta('add-login');

    await applySpecs(tempDir, 'add-login', { skipValidation: true, silent: true });

    await expect(
      fs.readFile(path.join(tempDir, 'openspec', 'specs', 'login', 'spec.md'), 'utf8')
    ).resolves.toContain('### Requirement: OAuth login');
  });

  it('rejects traversal IDs without reading changes or writing specs outside their roots', async () => {
    const outsideChangeDir = path.join(tempDir, 'outside');
    const deltaDir = path.join(outsideChangeDir, 'specs', 'login');
    const escapedTarget = path.join(tempDir, 'login', 'spec.md');
    await fs.mkdir(deltaDir, { recursive: true });
    await fs.writeFile(path.join(deltaDir, 'spec.md'), ADDED_DELTA);

    await expect(
      applySpecs(tempDir, '../../outside', { skipValidation: true, silent: true })
    ).rejects.toThrow(/Invalid change name/);

    await expect(fs.access(escapedTarget)).rejects.toThrow();
    await expect(fs.readFile(path.join(deltaDir, 'spec.md'), 'utf8')).resolves.toBe(ADDED_DELTA);
  });

  it.each([
    'auth//add-login',
    'auth/add-login/',
    'auth/oauth/Add-Login',
    'archive/legacy-change',
  ])('rejects malformed or reserved change ID %s', async (changeId) => {
    await expect(
      applySpecs(tempDir, changeId, { skipValidation: true, silent: true })
    ).rejects.toThrow(/Invalid change name/);
  });
});
