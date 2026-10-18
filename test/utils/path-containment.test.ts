import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { FileSystemUtils } from '../../src/utils/file-system.js';

/**
 * Coverage for the containment guard itself, rather than for a copy of it.
 *
 * `assertPathWithin` is what keeps every managed write inside the project, so
 * the contract worth pinning is the guard's own: what it accepts, what it
 * throws on, and that it reads a path as path segments rather than as a string
 * prefix. `openspec-evil` starts with `openspec` and must still be rejected.
 *
 * The cases run through real directories because the guard canonicalizes
 * before deciding, so a purely notional path would not exercise it.
 */
describe('FileSystemUtils.assertPathWithin', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), 'openspec-containment-'));
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('accepts a path inside the allowed directory', () => {
    const inside = path.join(root, 'specs', 'widgets', 'spec.md');
    expect(() => FileSystemUtils.assertPathWithin(root, inside)).not.toThrow();
  });

  it('accepts the allowed directory itself', () => {
    expect(() => FileSystemUtils.assertPathWithin(root, root)).not.toThrow();
  });

  it('rejects a sibling that merely shares the root as a string prefix', () => {
    // `${root}-evil` starts with `${root}`, so a prefix comparison would let it
    // through. The guard compares path segments, so it must not.
    const sibling = `${root}-evil`;
    mkdirSync(sibling, { recursive: true });
    try {
      expect(() => FileSystemUtils.assertPathWithin(root, sibling)).toThrow(
        /outside the allowed directory/
      );
    } finally {
      rmSync(sibling, { recursive: true, force: true });
    }
  });

  it('rejects a directory link inside the root that resolves outside it', () => {
    // The guard canonicalizes before deciding, which is the half that a
    // lexical containment check cannot do: the link's own path looks inside.
    const outside = mkdtempSync(path.join(tmpdir(), 'openspec-outside-'));
    const link = path.join(root, 'linked');
    try {
      symlinkSync(outside, link, 'junction');
    } catch {
      // Creating a directory link needs a privilege the runner may not have.
      rmSync(outside, { recursive: true, force: true });
      return;
    }
    try {
      expect(() => FileSystemUtils.assertPathWithin(root, link)).toThrow(
        /outside the allowed directory/
      );
      expect(() =>
        FileSystemUtils.assertPathWithin(root, path.join(link, 'spec.md'))
      ).toThrow(/outside the allowed directory/);
    } finally {
      rmSync(link, { recursive: true, force: true });
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('rejects a traversal escape', () => {
    const escape = path.join(root, '..', 'elsewhere');
    expect(() => FileSystemUtils.assertPathWithin(root, escape)).toThrow(
      /outside the allowed directory/
    );
  });

  it('rejects the parent of the allowed directory', () => {
    expect(() => FileSystemUtils.assertPathWithin(root, path.dirname(root))).toThrow(
      /outside the allowed directory/
    );
  });
});

describe('FileSystemUtils.resolveProjectArtifactPath', () => {
  let project: string;

  beforeEach(() => {
    project = mkdtempSync(path.join(tmpdir(), 'openspec-artifact-'));
  });

  afterEach(() => {
    rmSync(project, { recursive: true, force: true });
  });

  it('resolves a relative artifact path inside the project', () => {
    const resolved = FileSystemUtils.resolveProjectArtifactPath(
      project,
      path.join('openspec', 'project.md')
    );
    expect(resolved).toBe(path.join(project, 'openspec', 'project.md'));
  });

  it('accepts a separator-joined artifact path on this platform', () => {
    // Artifact paths are composed with path.join, so the separator the guard
    // sees is the platform's own. Both halves must survive the round trip.
    const resolved = FileSystemUtils.resolveProjectArtifactPath(
      project,
      path.join('openspec', 'changes', 'add-widgets', 'tasks.md')
    );
    expect(resolved.startsWith(project + path.sep)).toBe(true);
    expect(resolved.endsWith(path.join('add-widgets', 'tasks.md'))).toBe(true);
  });

  it('refuses an absolute artifact path', () => {
    expect(() =>
      FileSystemUtils.resolveProjectArtifactPath(project, path.resolve(project, 'openspec'))
    ).toThrow(/Refusing to manage an artifact outside the project/);
  });

  it('refuses an artifact path that climbs out of the project', () => {
    expect(() =>
      FileSystemUtils.resolveProjectArtifactPath(project, path.join('..', 'escape.md'))
    ).toThrow(/outside the allowed directory/);
  });
});
