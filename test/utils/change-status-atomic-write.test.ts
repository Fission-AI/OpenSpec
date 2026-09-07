import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fsp } from 'fs';
import path from 'path';
import os from 'os';

/**
 * `writeChangeStatus` writes through a sibling temp file and renames it into
 * place. A direct write that fails partway truncates `.openspec.yaml`, and that
 * file carries the change's `schema:` — losing it breaks every command that
 * reads the change, not only the field being set.
 *
 * Injected through a module mock rather than filesystem permissions: chmod does
 * not constrain root and does not exist on Windows, so a permissions-based test
 * would not run on two of the three CI legs.
 */
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    default: actual,
    writeFileSync: (...args: Parameters<typeof actual.writeFileSync>) => {
      if (String(args[0]).includes('.openspec-status-')) {
        throw new Error('ENOSPC: no space left on device');
      }
      return actual.writeFileSync(...args);
    },
  };
});

const { writeChangeStatus } = await import('../../src/utils/change-metadata.js');

describe('writeChangeStatus durability', () => {
  let tempDir: string;
  const changeDir = (): string => path.join(tempDir, 'openspec', 'changes', 'c');
  const metaPath = (): string => path.join(changeDir(), '.openspec.yaml');

  beforeEach(async () => {
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'openspec-atomic-'));
    await fsp.mkdir(changeDir(), { recursive: true });
  });

  afterEach(async () => {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  it('leaves the original file intact when the write fails', async () => {
    const original = '# hand-authored\nschema: spec-driven\ncreated: 2026-09-07\n';
    await fsp.writeFile(metaPath(), original);

    expect(() => writeChangeStatus(changeDir(), 'shipped')).toThrow(/ENOSPC/);

    expect(await fsp.readFile(metaPath(), 'utf-8')).toBe(original);
  });

  it('leaves no temp file behind when the write fails', async () => {
    await fsp.writeFile(metaPath(), 'schema: spec-driven\n');

    expect(() => writeChangeStatus(changeDir(), 'shipped')).toThrow();

    const strays = (await fsp.readdir(changeDir())).filter((name) =>
      name.includes('.openspec-status-')
    );
    expect(strays).toEqual([]);
  });
});
