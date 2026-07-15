import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { getActiveChangeIds, getArchivedChangeIds } from '../../src/utils/item-discovery.js';

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

describe('item discovery', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = path.join(os.tmpdir(), `openspec-item-discovery-${randomUUID()}`);
    await fs.mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('discovers root, one-level, and multi-level active change ids recursively', async () => {
    const changesDir = path.join(tempDir, 'openspec', 'changes');

    await writeMarker(changesDir, 'add-root', 'proposal.md');
    await writeMarker(changesDir, 'platform/add-api', '.openspec.yaml');
    await writeMarker(changesDir, 'platform/mobile/add-ios', '.openspec.yaml');
    await writeMarker(changesDir, 'archive/legacy-change', 'proposal.md');
    await writeMarker(changesDir, '.hidden/ignored-change', 'proposal.md');

    await expect(getActiveChangeIds(tempDir)).resolves.toEqual([
      'add-root',
      'platform/add-api',
      'platform/mobile/add-ios',
    ]);
  });

  it('discovers archived change ids from the sibling openspec/archive tree', async () => {
    const siblingArchiveDir = path.join(tempDir, 'openspec', 'archive');
    const legacyArchiveDir = path.join(tempDir, 'openspec', 'changes', 'archive');

    await writeMarker(siblingArchiveDir, '2026-07-15-add-root', 'proposal.md');
    await writeMarker(siblingArchiveDir, 'platform/2026-07-15-add-api', '.openspec.yaml');
    await writeMarker(legacyArchiveDir, 'legacy-only-change', 'proposal.md');

    await expect(getArchivedChangeIds(tempDir)).resolves.toEqual([
      '2026-07-15-add-root',
      'platform/2026-07-15-add-api',
    ]);
  });
});
