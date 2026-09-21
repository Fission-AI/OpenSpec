import { describe, expect, it } from 'vitest';
import path from 'node:path';

/**
 * Windows filesystems are case-insensitive, so `C:\Repo` and `c:\repo` name the
 * same directory. The containment guard in FileSystemUtils.assertPathWithin is
 * built on path.relative, and these tests pin down the property it depends on:
 * path.win32.relative already folds case, so a drive letter or directory that
 * differs only in case is still recognized as inside the allowed root.
 *
 * They also pin the other half of that contract — a path genuinely outside the
 * root, or on another drive, must still be rejected. Any future attempt to make
 * the comparison case-insensitive by hand has to keep both halves true.
 */

function isPathWithin(
  allowedDirectory: string,
  targetPath: string,
  impl: path.PlatformPath
): boolean {
  const relative = impl.relative(allowedDirectory, targetPath);
  return (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith(`..${impl.sep}`) &&
      !impl.isAbsolute(relative))
  );
}

describe('path containment under Windows case variance', () => {
  const root = 'C:\\Repo\\openspec';

  it('accepts a target whose drive letter differs in case', () => {
    expect(isPathWithin(root, 'c:\\Repo\\openspec\\specs\\x', path.win32)).toBe(true);
  });

  it('accepts a target whose directory differs in case', () => {
    expect(isPathWithin(root, 'C:\\REPO\\openspec\\specs\\x', path.win32)).toBe(true);
  });

  it('accepts the root itself', () => {
    expect(isPathWithin(root, root, path.win32)).toBe(true);
    expect(isPathWithin(root, 'c:\\repo\\OPENSPEC', path.win32)).toBe(true);
  });

  it('still rejects a sibling directory outside the root', () => {
    expect(isPathWithin(root, 'C:\\Repo\\other\\x', path.win32)).toBe(false);
  });

  it('still rejects a traversal escape', () => {
    expect(isPathWithin(root, 'C:\\Repo\\openspec\\..\\other', path.win32)).toBe(false);
  });

  it('still rejects a path on another drive', () => {
    expect(isPathWithin(root, 'D:\\Repo\\openspec\\specs', path.win32)).toBe(false);
  });

  it('keeps POSIX containment case-sensitive', () => {
    // POSIX filesystems are case-sensitive, so /repo is genuinely not /Repo.
    expect(isPathWithin('/Repo/openspec', '/Repo/openspec/specs', path.posix)).toBe(true);
    expect(isPathWithin('/Repo/openspec', '/repo/openspec/specs', path.posix)).toBe(false);
  });
});
