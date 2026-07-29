import { afterEach, describe, expect, it, vi } from 'vitest';
import * as actualFs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const mockedFile = vi.hoisted(() => ({ path: '' }));

vi.mock('node:fs', async (importOriginal) => {
  const fs = await importOriginal<typeof import('node:fs')>();
  return {
    ...fs,
    statSync(filePath: fs.PathLike, options?: fs.StatOptions) {
      const stat = fs.statSync(filePath, options);
      if (String(filePath) === mockedFile.path) {
        return { ...stat, size: 1 };
      }
      return stat;
    },
  };
});

import { computeBundleIntegrity } from '../../../src/core/remote-schema/bundle.js';

describe('remote schema bundle size race', () => {
  let bundleDir: string | undefined;

  afterEach(() => {
    if (bundleDir) {
      actualFs.rmSync(bundleDir, { recursive: true, force: true });
    }
    mockedFile.path = '';
  });

  it('rechecks bytes read when a file grows after the stat preflight', () => {
    bundleDir = actualFs.mkdtempSync(path.join(os.tmpdir(), 'openspec-bundle-race-'));
    mockedFile.path = path.join(bundleDir, 'growing.bin');
    actualFs.writeFileSync(mockedFile.path, '123456');

    expect(() =>
      computeBundleIntegrity(bundleDir!, { maxFiles: 10, maxBytes: 5 })
    ).toThrow(/more than 5 bytes/);
  });
});
