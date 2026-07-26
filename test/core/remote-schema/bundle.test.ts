import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  assertPortableBundleEntries,
  computeBundleIntegrity,
  normalizeBundlePath,
} from '../../../src/core/remote-schema/bundle.js';

describe('remote schema bundle boundary', () => {
  describe('normalizeBundlePath', () => {
    it('accepts a repository-relative Git path without platform conversion', () => {
      expect(normalizeBundlePath('schemas/qeda-sdd')).toBe('schemas/qeda-sdd');
    });

    it.each([
      ['parent traversal', '../schemas/qeda-sdd'],
      ['nested parent traversal', 'schemas/../qeda-sdd'],
      ['POSIX absolute', '/schemas/qeda-sdd'],
      ['Windows drive path', 'C:/schemas/qeda-sdd'],
      ['Windows drive with backslashes', String.raw`C:\schemas\qeda-sdd`],
      ['UNC path', String.raw`\\server\share\qeda-sdd`],
      ['backslash separator', String.raw`schemas\qeda-sdd`],
      ['dot segment', './schemas/qeda-sdd'],
      ['empty path', ''],
      ['control character', 'schemas/qeda-sdd\nother'],
      ['Windows wildcard', 'schemas/qeda?sdd'],
      ['Windows reserved segment', 'schemas/CON/templates'],
      ['trailing dot segment', 'schemas/qeda-sdd./templates'],
    ])('rejects %s', (_name, value) => {
      expect(() => normalizeBundlePath(value)).toThrow(/Invalid schema bundle path/);
    });
  });

  it('rejects portable path collisions independently of host filesystem case rules', () => {
    expect(() =>
      assertPortableBundleEntries([
        'schema.yaml',
        'templates/Proposal.md',
        'templates/proposal.md',
      ])
    ).toThrow(/portable path collision/i);
  });

  it('rejects directory-prefix collisions on case-insensitive filesystems', () => {
    expect(() =>
      assertPortableBundleEntries([
        'Templates/proposal.md',
        'templates/design.md',
      ])
    ).toThrow(/portable path collision/i);
  });
});

describe('remote schema bundle integrity', () => {
  let bundleDir: string;

  beforeEach(() => {
    bundleDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-bundle-'));
    fs.mkdirSync(path.join(bundleDir, 'templates'), { recursive: true });
    fs.writeFileSync(path.join(bundleDir, 'schema.yaml'), 'name: example\n');
    fs.writeFileSync(path.join(bundleDir, 'templates', 'proposal.md'), '# Proposal\n');
  });

  afterEach(() => {
    fs.rmSync(bundleDir, { recursive: true, force: true });
  });

  it('is deterministic and changes when a file is added, removed, or modified', () => {
    const first = computeBundleIntegrity(bundleDir);
    const second = computeBundleIntegrity(bundleDir);
    expect(second).toEqual(first);
    expect(first).toMatchObject({ fileCount: 2 });
    expect(first.integrity).toMatch(/^sha256:[0-9a-f]{64}$/);

    fs.writeFileSync(path.join(bundleDir, 'templates', 'design.md'), '# Design\n');
    const added = computeBundleIntegrity(bundleDir);
    expect(added.integrity).not.toBe(first.integrity);

    fs.rmSync(path.join(bundleDir, 'templates', 'design.md'));
    fs.writeFileSync(path.join(bundleDir, 'templates', 'proposal.md'), '# Changed\n');
    const modified = computeBundleIntegrity(bundleDir);
    expect(modified.integrity).not.toBe(first.integrity);

    fs.rmSync(path.join(bundleDir, 'templates', 'proposal.md'));
    const removed = computeBundleIntegrity(bundleDir);
    expect(removed.integrity).not.toBe(first.integrity);
  });

  it('rejects file-count and byte limits before accepting cache content', () => {
    expect(() => computeBundleIntegrity(bundleDir, { maxFiles: 1, maxBytes: 1024 })).toThrow(
      /more than 1 files/
    );
    expect(() => computeBundleIntegrity(bundleDir, { maxFiles: 10, maxBytes: 5 })).toThrow(
      /more than 5 bytes/
    );
  });

  it('enforces byte limits while traversing the bundle', () => {
    fs.writeFileSync(path.join(bundleDir, 'a-oversized.bin'), '123456');
    const link = path.join(bundleDir, 'z-link');
    try {
      fs.symlinkSync(path.join(bundleDir, 'missing-target'), link, 'file');
    } catch {
      // The byte-limit assertion remains valid on hosts that cannot create symlinks.
    }

    expect(() =>
      computeBundleIntegrity(bundleDir, { maxFiles: 10, maxBytes: 5 })
    ).toThrow(/more than 5 bytes/);
  });

  it('rejects symlinks without reading their targets', (ctx) => {
    const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'openspec-schema-outside-'));
    const outside = path.join(outsideDir, 'secret.txt');
    fs.writeFileSync(outside, 'do-not-read');
    const link = path.join(bundleDir, 'templates', 'linked.md');
    try {
      fs.symlinkSync(outside, link, 'file');
    } catch {
      fs.rmSync(outsideDir, { recursive: true, force: true });
      ctx.skip();
      return;
    }

    try {
      expect(() => computeBundleIntegrity(bundleDir)).toThrow(/symbolic link/);
    } finally {
      fs.rmSync(outsideDir, { recursive: true, force: true });
    }
  });
});
