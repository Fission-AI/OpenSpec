import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  DEFAULT_OPENSPEC_SCHEMA,
  ensureOpenSpecRoot,
  inspectOpenSpecRoot,
  rollbackCreatedPaths,
} from '../../src/core/index.js';

vi.mock('node:fs/promises', async (importOriginal) => ({
  ...await importOriginal<typeof import('node:fs/promises')>(),
}));

describe('OpenSpec root helper', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-root-helper-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  function createHealthyRoot(root: string, configName = 'config.yaml'): void {
    fs.mkdirSync(path.join(root, 'openspec', 'specs'), { recursive: true });
    fs.mkdirSync(path.join(root, 'openspec', 'changes', 'archive'), { recursive: true });
    fs.writeFileSync(path.join(root, 'openspec', configName), `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`);
  }

  it('inspects a healthy root with config.yaml', async () => {
    const root = path.join(tempDir, 'store');
    createHealthyRoot(root);

    await expect(inspectOpenSpecRoot(root)).resolves.toEqual(expect.objectContaining({
      healthy: true,
      present: true,
      config: {
        present: true,
        path: 'openspec/config.yaml',
      },
      diagnostics: [],
    }));
  });

  it('inspects a healthy root with config.yml', async () => {
    const root = path.join(tempDir, 'store');
    createHealthyRoot(root, 'config.yml');

    await expect(inspectOpenSpecRoot(root)).resolves.toEqual(expect.objectContaining({
      healthy: true,
      config: {
        present: true,
        path: 'openspec/config.yml',
      },
    }));
  });

  it('reports missing root pieces without mutating files', async () => {
    const root = path.join(tempDir, 'store');
    fs.mkdirSync(path.join(root, 'openspec', 'changes'), { recursive: true });

    const inspection = await inspectOpenSpecRoot(root);

    expect(inspection.healthy).toBe(false);
    expect(inspection.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'openspec_config_missing',
    ]);
    expect(fs.existsSync(path.join(root, 'openspec', 'changes', 'archive'))).toBe(false);
  });

  it('accepts roots before changes, applied specs, or archives exist', async () => {
    const root = path.join(tempDir, 'store');
    fs.mkdirSync(path.join(root, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`);

    const inspection = await inspectOpenSpecRoot(root);

    expect(inspection).toEqual(expect.objectContaining({
      healthy: true,
      specs: { present: false },
      changes: { present: false },
      archive: { present: false },
      diagnostics: [],
    }));
  });

  it('reports malformed optional planning paths without throwing', async () => {
    const root = path.join(tempDir, 'store');
    fs.mkdirSync(path.join(root, 'openspec'), { recursive: true });
    fs.writeFileSync(path.join(root, 'openspec', 'config.yaml'), `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`);
    fs.writeFileSync(path.join(root, 'openspec', 'changes'), 'not a directory\n');

    const inspection = await inspectOpenSpecRoot(root);

    expect(inspection.healthy).toBe(false);
    expect(inspection.changes).toEqual({ present: false });
    expect(inspection.archive).toEqual({ present: false });
    expect(inspection.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'openspec_changes_not_directory',
    ]);
  });

  it('ensures the default root shape and records created paths', async () => {
    const root = path.join(tempDir, 'store');

    const result = await ensureOpenSpecRoot(root);

    expect(result.createdArtifacts).toEqual([
      'openspec/',
      'openspec/specs/',
      'openspec/changes/',
      'openspec/changes/archive/',
      'openspec/config.yaml',
    ]);
    expect(result.inspection.healthy).toBe(true);
    expect(fs.readFileSync(path.join(root, 'openspec', 'config.yaml'), 'utf-8')).toContain(
      `schema: ${DEFAULT_OPENSPEC_SCHEMA}`
    );
  });

  it('preserves existing config and user files', async () => {
    const root = path.join(tempDir, 'store');
    createHealthyRoot(root, 'config.yml');
    fs.writeFileSync(path.join(root, 'openspec', 'specs', 'note.md'), 'keep me\n');

    const result = await ensureOpenSpecRoot(root);

    expect(result.createdArtifacts).toEqual([]);
    expect(fs.existsSync(path.join(root, 'openspec', 'config.yaml'))).toBe(false);
    expect(fs.readFileSync(path.join(root, 'openspec', 'config.yml'), 'utf-8')).toBe(
      `schema: ${DEFAULT_OPENSPEC_SCHEMA}\n`
    );
    expect(fs.readFileSync(path.join(root, 'openspec', 'specs', 'note.md'), 'utf-8')).toBe(
      'keep me\n'
    );
  });

  it('records only new anchors and includes them in rollback', async () => {
    const root = path.join(tempDir, 'store');
    createHealthyRoot(root);

    const result = await ensureOpenSpecRoot(root, { anchorEmptyDirectories: true });

    expect(result.createdArtifacts).toEqual([
      'openspec/specs/.gitkeep',
      'openspec/changes/archive/.gitkeep',
    ]);
    expect((await ensureOpenSpecRoot(root, { anchorEmptyDirectories: true })).createdPaths).toEqual([]);

    await rollbackCreatedPaths(result.createdPaths);

    expect(fs.readdirSync(path.join(root, 'openspec', 'specs'))).toEqual([]);
    expect(fs.readdirSync(path.join(root, 'openspec', 'changes', 'archive'))).toEqual([]);
  });

  it.each(['file', 'directory', 'symlink'] as const)(
    'preserves a competing %s created after checking an empty directory',
    async (kind) => {
      const root = path.join(tempDir, 'store');
      createHealthyRoot(root);
      const marker = path.join(root, 'openspec', 'specs', '.gitkeep');
      const target = path.join(tempDir, 'outside-target');
      fs.mkdirSync(target);
      fs.writeFileSync(path.join(target, 'user.txt'), 'keep me');
      vi.spyOn(fsPromises, 'readdir').mockImplementationOnce(async () => {
        if (kind === 'file') fs.writeFileSync(marker, 'keep me');
        if (kind === 'directory') fs.mkdirSync(marker);
        if (kind === 'symlink') fs.symlinkSync(target, marker, process.platform === 'win32' ? 'junction' : 'dir');
        return [];
      });

      const result = await ensureOpenSpecRoot(root, { anchorEmptyDirectories: true });

      expect(result.createdArtifacts).toEqual(['openspec/changes/archive/.gitkeep']);
      if (kind === 'file') expect(fs.readFileSync(marker, 'utf-8')).toBe('keep me');
      if (kind === 'directory') expect(fs.lstatSync(marker).isDirectory()).toBe(true);
      if (kind === 'symlink') expect(fs.lstatSync(marker).isSymbolicLink()).toBe(true);
      expect(fs.readFileSync(path.join(target, 'user.txt'), 'utf-8')).toBe('keep me');
    },
  );

  it('propagates anchor write failures other than an existing path', async () => {
    const root = path.join(tempDir, 'store');
    createHealthyRoot(root);
    const error = Object.assign(new Error('permission denied'), { code: 'EACCES' });
    vi.spyOn(fsPromises, 'writeFile').mockRejectedValueOnce(error);

    await expect(ensureOpenSpecRoot(root, { anchorEmptyDirectories: true })).rejects.toBe(error);
  });

  it('rolls back only ledger-created files and empty directories', async () => {
    const root = path.join(tempDir, 'store');
    const result = await ensureOpenSpecRoot(root);
    fs.writeFileSync(path.join(root, 'user.md'), 'mine\n');

    await rollbackCreatedPaths(result.createdPaths);

    expect(fs.existsSync(path.join(root, 'openspec'))).toBe(false);
    expect(fs.readFileSync(path.join(root, 'user.md'), 'utf-8')).toBe('mine\n');
  });
});
