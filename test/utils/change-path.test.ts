import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import {
  splitChangeId,
  validateDomainPath,
  buildArchivePath,
  findAllChangeIds,
  findAllArchivedChangeIds,
  resolveExistingChangeId,
  InvalidChangeIdError,
  ChangeNotFoundError,
} from '../../src/utils/change-path.js';

afterEach(() => {
  vi.restoreAllMocks();
});

async function writeMarker(root: string, relativeDir: string, marker: '.openspec.yaml' | 'proposal.md'): Promise<void> {
  const fullDir = path.join(root, ...relativeDir.split('/'));
  await fs.mkdir(fullDir, { recursive: true });
  await fs.writeFile(path.join(fullDir, marker), marker === 'proposal.md' ? '# Proposal\n' : 'schema: spec-driven\n', 'utf-8');
}

describe('splitChangeId', () => {
  it('returns an empty domain for single-segment change ids', () => {
    expect(splitChangeId('add-auth')).toEqual({
      domain: [],
      name: 'add-auth',
    });
  });

  it('splits nested change ids into domain segments and the final name', () => {
    expect(splitChangeId('Platform/API/add-auth')).toEqual({
      domain: ['Platform', 'API'],
      name: 'add-auth',
    });
  });
});

describe('validateDomainPath', () => {
  it('accepts an empty domain path', () => {
    expect(validateDomainPath('')).toEqual({ valid: true });
  });

  it('accepts case-preserving domain segments with dots, underscores, and hyphens', () => {
    expect(validateDomainPath('Platform/API.v2/team_alpha')).toEqual({ valid: true });
  });

  it('rejects empty segments', () => {
    expect(validateDomainPath('Platform//API')).toEqual({
      valid: false,
      error: 'Domain path cannot contain empty segments',
    });
  });

  it('rejects whitespace in any segment', () => {
    expect(validateDomainPath('Platform/API Team')).toEqual({
      valid: false,
      error: 'Domain path cannot contain whitespace',
    });
  });

  it('rejects backslashes', () => {
    expect(validateDomainPath('Platform\\API')).toEqual({
      valid: false,
      error: 'Domain path must use forward slashes',
    });
  });

  it('rejects dot and dot-dot segments', () => {
    expect(validateDomainPath('Platform/../API')).toEqual({
      valid: false,
      error: 'Domain path cannot contain "." or ".." segments',
    });
  });

  it('rejects every leading-dot segment', () => {
    expect(validateDomainPath('Platform/.hidden')).toEqual({
      valid: false,
      error: 'Domain path segments cannot start with a dot',
    });
  });
});

describe('buildArchivePath', () => {
  it('prefixes only the final change-name segment', () => {
    expect(buildArchivePath(path.join('tmp', 'archive'), 'Platform/API/add-auth', '2026-07-15')).toBe(
      path.join('tmp', 'archive', 'Platform', 'API', '2026-07-15-add-auth')
    );
  });
});

describe('resolveExistingChangeId', () => {
  let testDir: string;
  let changesDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-resolve-change-${randomUUID()}`);
    changesDir = path.join(testDir, 'openspec', 'changes');
    await fs.mkdir(changesDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns parsed segments and the contained path for an existing slash ID', async () => {
    const changePath = path.join(changesDir, 'Platform', 'API', 'add-auth');
    await fs.mkdir(changePath, { recursive: true });

    await expect(resolveExistingChangeId('Platform/API/add-auth', changesDir)).resolves.toEqual({
      id: 'Platform/API/add-auth',
      domain: ['Platform', 'API'],
      name: 'add-auth',
      path: changePath,
    });
  });

  it('rejects invalid IDs with a typed validation error', async () => {
    await expect(resolveExistingChangeId('../specs', changesDir)).rejects.toMatchObject({
      name: 'InvalidChangeIdError',
      code: 'invalid_domain',
    } satisfies Partial<InvalidChangeIdError>);
  });

  it('rejects valid missing IDs with a distinct typed error', async () => {
    await expect(resolveExistingChangeId('missing-change', changesDir)).rejects.toBeInstanceOf(
      ChangeNotFoundError
    );
  });

  it('maps an ENOTDIR path failure to the stable not-found error', async () => {
    const notDirectory = Object.assign(new Error('not a directory'), { code: 'ENOTDIR' });
    vi.spyOn(fs, 'stat').mockRejectedValueOnce(notDirectory);

    await expect(resolveExistingChangeId('auth/add-login', changesDir)).rejects.toBeInstanceOf(
      ChangeNotFoundError
    );
  });
});

describe('findAllChangeIds', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-change-path-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('returns sorted forward-slash ids from proposal and metadata leaf directories', async () => {
    const changesDir = path.join(testDir, 'openspec', 'changes');

    await writeMarker(changesDir, 'z-last', 'proposal.md');
    await writeMarker(changesDir, 'Platform/API/add-auth', '.openspec.yaml');
    await writeMarker(changesDir, 'Platform/archive/add-logs', 'proposal.md');
    await writeMarker(changesDir, 'archive/legacy-change', 'proposal.md');
    await writeMarker(changesDir, '.hidden/ignored-change', 'proposal.md');
    await fs.mkdir(path.join(changesDir, 'draft-only'), { recursive: true });

    await expect(findAllChangeIds(changesDir)).resolves.toEqual([
      'Platform/API/add-auth',
      'Platform/archive/add-logs',
      'z-last',
    ]);
  });

  it('returns an empty array when the changes root is missing', async () => {
    await expect(findAllChangeIds(path.join(testDir, 'missing'))).resolves.toEqual([]);
  });

  it('propagates unexpected readdir errors', async () => {
    const changesDir = path.join(testDir, 'openspec', 'changes');
    await writeMarker(changesDir, 'Platform/API/add-auth', '.openspec.yaml');

    const diskFailure = Object.assign(new Error('disk failure'), { code: 'EIO' });
    const originalReaddir = fs.readdir.bind(fs);

    vi.spyOn(fs, 'readdir').mockImplementation(async (targetPath, options) => {
      if (targetPath === changesDir) {
        throw diskFailure;
      }

      return originalReaddir(targetPath, options as { withFileTypes?: boolean } | BufferEncoding | null | undefined);
    });

    await expect(findAllChangeIds(changesDir)).rejects.toBe(diskFailure);
  });
});

describe('findAllArchivedChangeIds', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-archived-change-path-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  it('discovers archived change ids without reserving the archive domain name', async () => {
    const archiveDir = path.join(testDir, 'openspec', 'archive');

    await writeMarker(archiveDir, '2026-07-15-add-auth', 'proposal.md');
    await writeMarker(archiveDir, 'archive/legacy/add-logs', '.openspec.yaml');
    await writeMarker(archiveDir, '.hidden/ignored-change', 'proposal.md');

    await expect(findAllArchivedChangeIds(archiveDir)).resolves.toEqual([
      '2026-07-15-add-auth',
      'archive/legacy/add-logs',
    ]);
  });

  it('returns an empty array when the archive root is missing', async () => {
    await expect(findAllArchivedChangeIds(path.join(testDir, 'missing'))).resolves.toEqual([]);
  });
});
