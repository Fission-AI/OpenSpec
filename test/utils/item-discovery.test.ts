import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { getActiveChangeIds, getArchivedChangeIds } from '../../src/utils/item-discovery.js';

describe('item discovery', () => {
  let root: string;
  let changesDir: string;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-item-discovery-'));
    changesDir = path.join(root, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  const makeChange = async (name: string, files: Record<string, string> = {}) => {
    const dir = path.join(changesDir, name);
    await fs.mkdir(dir, { recursive: true });
    for (const [file, content] of Object.entries(files)) {
      await fs.writeFile(path.join(dir, file), content, 'utf-8');
    }
  };

  describe('getActiveChangeIds', () => {
    it('resolves a scaffolded change that has no proposal.md', async () => {
      // What `openspec new change <name>` leaves on disk: metadata only.
      await makeChange('scaffolded', { '.openspec.yaml': 'schema: spec-driven\n' });
      await makeChange('with-proposal', { 'proposal.md': '# With proposal' });

      expect(await getActiveChangeIds(root)).toEqual(['scaffolded', 'with-proposal']);
    });

    it('resolves a change whose schema defines no proposal artifact', async () => {
      await makeChange('no-proposal-schema', {
        '.openspec.yaml': 'schema: custom\n',
        'tasks.md': '## 1. Work\n\n- [ ] 1.1 do it\n',
      });

      expect(await getActiveChangeIds(root)).toEqual(['no-proposal-schema']);
    });

    it('excludes the archive directory and hidden directories', async () => {
      await makeChange('real-change');
      await fs.mkdir(path.join(changesDir, 'archive', '2026-01-01-old'), { recursive: true });
      await fs.mkdir(path.join(changesDir, '.scratch'), { recursive: true });
      await fs.writeFile(path.join(changesDir, 'stray-file.md'), 'not a change', 'utf-8');

      expect(await getActiveChangeIds(root)).toEqual(['real-change']);
    });

    it('returns an empty list when the changes directory is missing', async () => {
      await fs.rm(changesDir, { recursive: true, force: true });

      expect(await getActiveChangeIds(root)).toEqual([]);
    });
  });

  describe('getArchivedChangeIds', () => {
    it('resolves archived changes without requiring proposal.md', async () => {
      const archiveDir = path.join(changesDir, 'archive');
      await fs.mkdir(path.join(archiveDir, '2026-01-02-no-proposal'), { recursive: true });
      await fs.mkdir(path.join(archiveDir, '2026-01-01-with-proposal'), { recursive: true });
      await fs.writeFile(
        path.join(archiveDir, '2026-01-01-with-proposal', 'proposal.md'),
        '# Archived',
        'utf-8'
      );
      await fs.mkdir(path.join(archiveDir, '.tmp'), { recursive: true });

      expect(await getArchivedChangeIds(root)).toEqual([
        '2026-01-01-with-proposal',
        '2026-01-02-no-proposal',
      ]);
    });

    it('returns an empty list when nothing has been archived', async () => {
      expect(await getArchivedChangeIds(root)).toEqual([]);
    });
  });
});
