import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { randomUUID } from 'crypto';
import { getAvailableChanges, validateChangeExists } from '../../../src/commands/workflow/shared.js';

async function writeMarker(
  root: string,
  relativeDir: string,
  marker: '.openspec.yaml' | 'proposal.md'
): Promise<void> {
  const fullDir = path.join(root, ...relativeDir.split('/'));
  await fs.mkdir(fullDir, { recursive: true });
  await fs.writeFile(
    path.join(fullDir, marker),
    marker === 'proposal.md' ? '# Proposal\n' : 'schema: spec-driven\n',
    'utf-8'
  );
}

describe('workflow shared change discovery', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-workflow-shared-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('returns scaffolded and proposal-only slash ids from the supplied changesDir', async () => {
    const changesDir = path.join(tempDir, 'custom-changes');

    await writeMarker(changesDir, 'Platform/API/add-auth', '.openspec.yaml');
    await writeMarker(changesDir, 'legacy/add-logs', 'proposal.md');
    await writeMarker(changesDir, 'archive/legacy-only', 'proposal.md');

    await expect(getAvailableChanges(tempDir, changesDir)).resolves.toEqual([
      'Platform/API/add-auth',
      'legacy/add-logs',
    ]);
  });

  it('accepts slash ids whose domain passes domain-path validation and whose leaf is kebab-case', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');
    await writeMarker(changesDir, 'Platform/API/add-auth', '.openspec.yaml');
    await writeMarker(changesDir, 'legacy/add-logs', 'proposal.md');

    await expect(validateChangeExists('Platform/API/add-auth', tempDir, changesDir)).resolves.toBe(
      'Platform/API/add-auth'
    );
    await expect(validateChangeExists('legacy/add-logs', tempDir, changesDir)).resolves.toBe(
      'legacy/add-logs'
    );
  });

  it('rejects invalid domain traversal segments', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');

    await expect(
      validateChangeExists('Platform/../add-auth', tempDir, changesDir)
    ).rejects.toThrow(
      "Invalid change name 'Platform/../add-auth': Domain path cannot contain \".\" or \"..\" segments"
    );
  });

  it('rejects non-kebab-case leaf segments even when the domain is valid', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');

    await expect(
      validateChangeExists('Platform/API/Add-Auth', tempDir, changesDir)
    ).rejects.toThrow(
      "Invalid change name 'Platform/API/Add-Auth': Change name must be lowercase (use kebab-case)"
    );
  });
});
