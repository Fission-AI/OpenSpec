import { describe, it, expect } from 'vitest';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { discoverSpecFiles } from '../../src/utils/spec-discovery.js';

async function withTempDir(run: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'openspec-spec-discovery-'));
  try {
    await run(dir);
  } finally {
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
}

async function writeSpec(root: string, ...segments: string[]) {
  const dir = path.join(root, ...segments);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'spec.md'), '# Spec\n', 'utf8');
}

describe('discoverSpecFiles', () => {
  it('discovers flat specs one level below the root', async () => {
    await withTempDir(async (dir) => {
      await writeSpec(dir, 'auth');
      await writeSpec(dir, 'payments');

      const found = await discoverSpecFiles(dir);
      expect(found.map((s) => s.id)).toEqual(['auth', 'payments']);
      expect(found[0].specFile).toBe(path.join(dir, 'auth', 'spec.md'));
    });
  });

  it('discovers nested specs and returns forward-slash ids (#1353)', async () => {
    await withTempDir(async (dir) => {
      await writeSpec(dir, 'platform', 'platform-session-layout');
      await writeSpec(dir, 'mobile', 'mobile-session-layout');
      await writeSpec(dir, 'flat-capability');

      const found = await discoverSpecFiles(dir);
      expect(found.map((s) => s.id)).toEqual([
        'flat-capability',
        'mobile/mobile-session-layout',
        'platform/platform-session-layout',
      ]);
      expect(found[2].specFile).toBe(
        path.join(dir, 'platform', 'platform-session-layout', 'spec.md')
      );
    });
  });

  it('ignores a spec.md directly in the root, dot-directories, and non-spec files', async () => {
    await withTempDir(async (dir) => {
      await fs.writeFile(path.join(dir, 'spec.md'), '# Root spec\n', 'utf8');
      await writeSpec(dir, '.hidden', 'secret');
      await writeSpec(dir, 'real');
      await fs.writeFile(path.join(dir, 'real', 'design.md'), '# Design\n', 'utf8');

      const found = await discoverSpecFiles(dir);
      expect(found.map((s) => s.id)).toEqual(['real']);
    });
  });

  it('returns an empty list when the specs root does not exist', async () => {
    await withTempDir(async (dir) => {
      const found = await discoverSpecFiles(path.join(dir, 'missing'));
      expect(found).toEqual([]);
    });
  });

  it('throws on a non-ENOENT read error instead of silently dropping specs', async () => {
    await withTempDir(async (dir) => {
      // A file where a directory is expected surfaces ENOTDIR from readdir.
      const notADir = path.join(dir, 'not-a-dir');
      await fs.writeFile(notADir, 'not a directory\n', 'utf8');

      await expect(discoverSpecFiles(notADir)).rejects.toMatchObject({
        code: 'ENOTDIR',
      });
    });
  });

  it('surfaces an unreadable nested directory rather than skipping it', async () => {
    await withTempDir(async (dir) => {
      await writeSpec(dir, 'platform', 'session-layout');
      const nested = path.join(dir, 'platform');
      await fs.chmod(nested, 0o000);

      // Root (and some CI/filesystems) ignore permission bits — skip if not enforced.
      let enforced = false;
      try {
        await fs.readdir(nested);
      } catch {
        enforced = true;
      }
      if (!enforced) {
        await fs.chmod(nested, 0o755);
        return;
      }

      try {
        await expect(discoverSpecFiles(dir)).rejects.toMatchObject({
          code: 'EACCES',
        });
      } finally {
        await fs.chmod(nested, 0o755);
      }
    });
  });

  it.skipIf(process.platform === 'win32')('discovers an in-capability symlinked spec.md file', async () => {
    await withTempDir(async (dir) => {
      // hasAnyFileUnder and the artifact graph's globs both count a symlinked
      // spec.md as content, so discovery must not silently drop it.
      await fs.mkdir(path.join(dir, 'auth'), { recursive: true });
      const target = path.join(dir, 'auth', 'shared-delta.md');
      await fs.writeFile(target, '# Spec\n', 'utf8');
      await fs.symlink(target, path.join(dir, 'auth', 'spec.md'), 'file');

      const found = await discoverSpecFiles(dir);
      expect(found.map((s) => s.id)).toEqual(['auth']);
      expect(found[0].specFile).toBe(path.join(dir, 'auth', 'spec.md'));
    });
  });

  it.skipIf(process.platform === 'win32')('rejects a spec.md symlink outside its capability', async () => {
    await withTempDir(async (dir) => {
      const target = path.join(dir, 'outside.md');
      await fs.writeFile(target, '# Outside\n', 'utf8');
      await fs.mkdir(path.join(dir, 'auth'), { recursive: true });
      await fs.symlink(target, path.join(dir, 'auth', 'spec.md'), 'file');

      await expect(discoverSpecFiles(dir)).rejects.toThrow(
        'Path is outside the allowed directory'
      );
    });
  });

  it.skipIf(process.platform === 'win32')('skips a dangling spec.md symlink', async () => {
    await withTempDir(async (dir) => {
      await writeSpec(dir, 'real');
      await fs.mkdir(path.join(dir, 'ghost'), { recursive: true });
      await fs.symlink(
        path.join(dir, 'missing-target.md'),
        path.join(dir, 'ghost', 'spec.md'),
        'file'
      );

      const found = await discoverSpecFiles(dir);
      expect(found.map((s) => s.id)).toEqual(['real']);
    });
  });

  it.skipIf(process.platform === 'win32')('does not follow symlinked directories', async () => {
    await withTempDir(async (dir) => {
      await writeSpec(dir, 'real');
      const target = path.join(dir, 'real');
      const link = path.join(dir, 'linked');
      await fs.symlink(target, link, 'dir');

      const found = await discoverSpecFiles(dir);
      expect(found.map((s) => s.id)).toEqual(['real']);
    });
  });
});
