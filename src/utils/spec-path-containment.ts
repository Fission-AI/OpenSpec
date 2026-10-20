import * as nodeFs from 'fs';
import path from 'path';
import { OPENSPEC_DIR_NAME } from '../core/config.js';
import { FileSystemUtils } from './file-system.js';

/**
 * The project a specs root belongs to, or null when it cannot be named.
 *
 * Every specs root OpenSpec reads is addressed through the project's
 * `openspec` directory - `<project>/openspec/specs` for main specs and
 * `<project>/openspec/changes/<change>/specs` (or `.../changes/archive/...`)
 * for a change's deltas - so the project is the parent of that `openspec`
 * directory.
 *
 * The directory below the match has to be `specs` or `changes`, which is what
 * makes this a planning root rather than a directory that merely shares the
 * name: a store kept at `~/openspec/my-store` would otherwise hand out `~` as
 * its boundary. A specs root reached some other way (a store given by path)
 * has no project to name, and containment stays at the specs root.
 */
function findProjectRoot(specsRoot: string): string | null {
  let current = path.resolve(specsRoot);
  let below: string | null = null;
  while (true) {
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    if (
      path.basename(current) === OPENSPEC_DIR_NAME &&
      (below === 'specs' || below === 'changes')
    ) {
      return parent;
    }
    below = path.basename(current);
    current = parent;
  }
}

/** Path-segment containment on the paths as written, without resolving links. */
function isLexicallyWithin(allowedDirectory: string, targetPath: string): boolean {
  const relative = path.relative(path.resolve(allowedDirectory), path.resolve(targetPath));
  return (
    relative === '' ||
    (relative !== '..' &&
      !relative.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relative))
  );
}

/**
 * A project may keep a capability's spec file elsewhere - beside the product
 * documentation it belongs to - and leave a relative symlink at
 * `openspec/specs/<capability>/spec.md`, so OpenSpec and the docs read and
 * write the same bytes. Accept such a link, and refuse one that leaves the
 * project, so a link swapped underneath a repo cannot turn a spec read or an
 * archive write into an arbitrary file access.
 *
 * `outsideError` is rethrown when the file is not a link at all, so a path
 * that simply escapes its root keeps reporting that.
 */
function assertLinkedSpecFileInProject(
  root: string,
  specFile: string,
  outsideError: unknown
): void {
  const projectRoot = findProjectRoot(root);
  if (projectRoot === null) {
    throw outsideError;
  }

  const resolvedFile = path.resolve(specFile);
  let isLink = false;
  try {
    isLink = nodeFs.lstatSync(resolvedFile).isSymbolicLink();
  } catch {
    isLink = false;
  }
  if (!isLink) {
    throw outsideError;
  }

  // Only where the link points is the project's choice. The directory holding
  // it must still be reached from inside the root.
  FileSystemUtils.assertPathWithin(root, path.dirname(resolvedFile));
  // Canonicalizes through the link, so a target outside the project is refused
  // and a dangling link - which cannot be proven contained - fails loudly.
  FileSystemUtils.assertPathWithin(projectRoot, resolvedFile);
}

/**
 * Containment for a `spec.md` under a trust root already established for it:
 * inside the root, or a link out of the root that stays inside the project.
 *
 * Deliberately does not re-derive a trust root from the file's own capability
 * directory. Callers use this to recheck a path immediately before reading or
 * writing it, and a capability directory swapped for a link since the path was
 * resolved has to be refused rather than trusted afresh.
 */
export function assertSpecFileWithin(root: string, specFile: string): void {
  try {
    FileSystemUtils.assertPathWithin(root, specFile);
  } catch (error) {
    assertLinkedSpecFileInProject(root, specFile, error);
  }
}

/**
 * Containment for a `spec.md` as it is discovered, where the capability
 * directory itself may deliberately be a link into another repository and is
 * then the file's own trust root.
 */
export function assertDiscoveredSpecFile(specsRoot: string, specFile: string): void {
  const capabilityDir = path.dirname(path.resolve(specFile));
  try {
    FileSystemUtils.assertPathWithin(specsRoot, specFile);
    return;
  } catch (error) {
    // The capability directory is the file's own trust root only while it is
    // addressed from inside the specs root: the link it may be is deliberate,
    // a `..` out of the root is not.
    if (isLexicallyWithin(specsRoot, capabilityDir)) {
      try {
        FileSystemUtils.assertPathWithin(capabilityDir, specFile);
        return;
      } catch {
        // Not a file of its own capability either; the link rule decides.
      }
    }
    assertLinkedSpecFileInProject(specsRoot, specFile, error);
  }
}
