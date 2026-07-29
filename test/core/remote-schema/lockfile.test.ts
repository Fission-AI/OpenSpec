import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  getSchemaLockPath,
  readSchemaLock,
  writeSchemaLock,
} from '../../../src/core/remote-schema/lockfile.js';
import type { RemoteSchemaLock } from '../../../src/core/remote-schema/types.js';

describe('remote schema lockfile', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-lock-'));
    fs.mkdirSync(path.join(projectRoot, 'openspec'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(projectRoot, { recursive: true, force: true });
  });

  it('writes entries in deterministic schema-name order and reads them strictly', () => {
    const lock: RemoteSchemaLock = {
      version: 1,
      schemas: {
        'z-flow': {
          git: 'git@github.com:example/z.git',
          requestedRef: 'main',
          resolvedCommit: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
          bundlePath: 'schemas/z-flow',
          integrity: `sha256:${'2'.repeat(64)}`,
        },
        'a-flow': {
          git: 'https://github.com/example/a.git',
          requestedRef: 'v1.0.0',
          resolvedCommit: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          bundlePath: 'schemas/a-flow',
          integrity: `sha256:${'1'.repeat(64)}`,
        },
      },
    };

    writeSchemaLock(projectRoot, lock);

    expect(fs.readFileSync(getSchemaLockPath(projectRoot), 'utf8')).toBe(
      `version: 1
schemas:
  a-flow:
    git: https://github.com/example/a.git
    requestedRef: v1.0.0
    resolvedCommit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    bundlePath: schemas/a-flow
    integrity: sha256:${'1'.repeat(64)}
  z-flow:
    git: git@github.com:example/z.git
    requestedRef: main
    resolvedCommit: bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
    bundlePath: schemas/z-flow
    integrity: sha256:${'2'.repeat(64)}
`
    );
    expect(readSchemaLock(projectRoot)).toEqual({
      version: 1,
      schemas: {
        'a-flow': lock.schemas['a-flow'],
        'z-flow': lock.schemas['z-flow'],
      },
    });
  });

  it.each([
    ['unsupported version', `version: 2\nschemas: {}\n`],
    [
      'short commit',
      `version: 1
schemas:
  bad:
    git: https://example.com/a.git
    requestedRef: main
    resolvedCommit: abc
    bundlePath: schema
    integrity: sha256:${'1'.repeat(64)}
`,
    ],
    [
      'malformed digest',
      `version: 1
schemas:
  bad:
    git: https://example.com/a.git
    requestedRef: main
    resolvedCommit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    bundlePath: schema
    integrity: sha256:not-a-digest
`,
    ],
    [
      'credential-bearing source',
      `version: 1
schemas:
  bad:
    git: https://oauth2:secret@example.com/a.git
    requestedRef: main
    resolvedCommit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    bundlePath: schema
    integrity: sha256:${'1'.repeat(64)}
`,
    ],
    [
      'Git remote-helper source',
      `version: 1
schemas:
  bad:
    git: ext::malicious
    requestedRef: main
    resolvedCommit: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
    bundlePath: schema
    integrity: sha256:${'1'.repeat(64)}
`,
    ],
  ])('rejects %s metadata', (_name, content) => {
    fs.writeFileSync(getSchemaLockPath(projectRoot), content);

    expect(() => readSchemaLock(projectRoot)).toThrow(/Invalid remote schema lockfile/);
  });

  it('returns null when the project has no lockfile', () => {
    expect(readSchemaLock(projectRoot)).toBeNull();
  });

  it('preserves the existing lock when replacement data is invalid', () => {
    const existing: RemoteSchemaLock = {
      version: 1,
      schemas: {
        demo: {
          git: 'https://example.com/demo.git',
          requestedRef: 'main',
          resolvedCommit: 'a'.repeat(40),
          bundlePath: 'schemas/demo',
          integrity: `sha256:${'1'.repeat(64)}`,
        },
      },
    };
    writeSchemaLock(projectRoot, existing);
    const before = fs.readFileSync(getSchemaLockPath(projectRoot));

    expect(() =>
      writeSchemaLock(projectRoot, {
        ...existing,
        schemas: {
          demo: { ...existing.schemas.demo, resolvedCommit: 'not-a-commit' },
        },
      })
    ).toThrow(/Invalid remote schema lockfile data/);
    expect(fs.readFileSync(getSchemaLockPath(projectRoot))).toEqual(before);
  });
});
