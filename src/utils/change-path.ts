import { promises as fs } from 'fs';
import path from 'path';

const DOMAIN_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export type InvalidChangeIdCode =
  | 'invalid_domain'
  | 'invalid_name'
  | 'reserved_root'
  | 'outside_changes';

export class InvalidChangeIdError extends Error {
  constructor(
    readonly changeId: string,
    readonly code: InvalidChangeIdCode,
    message: string
  ) {
    super(`Invalid change name '${changeId}': ${message}`);
    this.name = 'InvalidChangeIdError';
  }
}

export class ChangeNotFoundError extends Error {
  constructor(readonly changeId: string) {
    super(`Change '${changeId}' not found.`);
    this.name = 'ChangeNotFoundError';
  }
}

export interface ResolvedChangeId {
  id: string;
  domain: string[];
  name: string;
  path: string;
}

export function splitChangeId(id: string): { domain: string[]; name: string } {
  const segments = id.split('/');
  return {
    domain: segments.slice(0, -1),
    name: segments[segments.length - 1] ?? '',
  };
}

export function validateDomainPath(domainPath: string): ValidationResult {
  if (domainPath === '') {
    return { valid: true };
  }

  if (domainPath.includes('\\')) {
    return { valid: false, error: 'Domain path must use forward slashes' };
  }

  for (const segment of domainPath.split('/')) {
    if (segment.length === 0) {
      return { valid: false, error: 'Domain path cannot contain empty segments' };
    }

    if (/\s/.test(segment)) {
      return { valid: false, error: 'Domain path cannot contain whitespace' };
    }

    if (segment === '.' || segment === '..') {
      return { valid: false, error: 'Domain path cannot contain "." or ".." segments' };
    }

    if (segment.startsWith('.')) {
      return { valid: false, error: 'Domain path segments cannot start with a dot' };
    }

    if (!DOMAIN_SEGMENT_PATTERN.test(segment)) {
      return {
        valid: false,
        error: 'Domain path can only contain letters, numbers, hyphens, underscores, and dots',
      };
    }
  }

  return { valid: true };
}

export function validateChangeName(name: string): ValidationResult {
  const kebabCasePattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

  if (!name) {
    return { valid: false, error: 'Change name cannot be empty' };
  }

  if (!kebabCasePattern.test(name)) {
    if (/[A-Z]/.test(name)) {
      return { valid: false, error: 'Change name must be lowercase (use kebab-case)' };
    }
    if (/\s/.test(name)) {
      return { valid: false, error: 'Change name cannot contain spaces (use hyphens instead)' };
    }
    if (/_/.test(name)) {
      return { valid: false, error: 'Change name cannot contain underscores (use hyphens instead)' };
    }
    if (name.startsWith('-')) {
      return { valid: false, error: 'Change name cannot start with a hyphen' };
    }
    if (name.endsWith('-')) {
      return { valid: false, error: 'Change name cannot end with a hyphen' };
    }
    if (/--/.test(name)) {
      return { valid: false, error: 'Change name cannot contain consecutive hyphens' };
    }
    if (/[^a-z0-9-]/.test(name)) {
      return { valid: false, error: 'Change name can only contain lowercase letters, numbers, and hyphens' };
    }
    if (/^[0-9]/.test(name)) {
      return { valid: false, error: 'Change name must start with a letter' };
    }

    return {
      valid: false,
      error: 'Change name must follow kebab-case convention (e.g., add-auth, refactor-db)',
    };
  }

  return { valid: true };
}

export async function resolveExistingChangeId(
  changeId: string,
  changesDir: string
): Promise<ResolvedChangeId> {
  const { domain, name } = splitChangeId(changeId);
  const domainValidation = validateDomainPath(domain.join('/'));
  if (!domainValidation.valid) {
    throw new InvalidChangeIdError(
      changeId,
      'invalid_domain',
      domainValidation.error ?? 'Invalid domain path'
    );
  }

  const nameValidation = validateChangeName(name);
  if (!nameValidation.valid) {
    throw new InvalidChangeIdError(
      changeId,
      'invalid_name',
      nameValidation.error ?? 'Invalid change name'
    );
  }

  const rootSegment = domain[0] ?? name;
  if (rootSegment.toLowerCase() === 'archive') {
    throw new InvalidChangeIdError(
      changeId,
      'reserved_root',
      "Change ID root segment 'archive' is reserved"
    );
  }

  const changesRoot = path.resolve(changesDir);
  const changePath = path.resolve(changesRoot, ...domain, name);
  assertContainedChangePath(changeId, changesRoot, changePath);

  let stat;
  try {
    stat = await fs.stat(changePath);
  } catch (error) {
    if (isChangeLookupNotFoundError(error)) {
      throw new ChangeNotFoundError(changeId);
    }
    throw error;
  }
  if (!stat.isDirectory()) {
    throw new ChangeNotFoundError(changeId);
  }

  const [canonicalRoot, canonicalChange] = await Promise.all([
    fs.realpath(changesRoot),
    fs.realpath(changePath),
  ]);
  assertContainedChangePath(changeId, canonicalRoot, canonicalChange);

  if (!(await hasOwnChangeMarker(changePath))) {
    const nestedChanges = await findChangeIds(changePath, false);
    if (nestedChanges.length > 0) {
      throw new ChangeNotFoundError(changeId);
    }
  }

  return { id: changeId, domain, name, path: changePath };
}

export function buildArchivePath(archiveDir: string, changeId: string, date: string): string {
  const { domain, name } = splitChangeId(changeId);
  return path.join(archiveDir, ...domain, `${date}-${name}`);
}

export async function findAllChangeIds(changesDir: string): Promise<string[]> {
  return findChangeIds(changesDir, true);
}

export async function findAllArchivedChangeIds(archiveDir: string): Promise<string[]> {
  return findChangeIds(archiveDir, false);
}

export async function pathExistsWithoutFollowingLinks(targetPath: string): Promise<boolean> {
  try {
    await fs.lstat(targetPath);
    return true;
  } catch (error) {
    if (isChangeLookupNotFoundError(error)) {
      return false;
    }
    throw error;
  }
}

export async function assertProspectivePathContained(
  root: string,
  target: string,
  label: string
): Promise<void> {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const containmentError = () => new Error(
    `${label} destination must stay within the selected root.`
  );

  if (!isContainedPath(resolvedRoot, resolvedTarget)) {
    throw containmentError();
  }

  const missingSegments: string[] = [];
  let existingAncestor = resolvedTarget;
  while (!(await pathExistsWithoutFollowingLinks(existingAncestor))) {
    const parent = path.dirname(existingAncestor);
    if (parent === existingAncestor) {
      throw containmentError();
    }
    missingSegments.unshift(path.basename(existingAncestor));
    existingAncestor = parent;
  }

  let canonicalRoot: string;
  let canonicalAncestor: string;
  try {
    [canonicalRoot, canonicalAncestor] = await Promise.all([
      fs.realpath(resolvedRoot),
      fs.realpath(existingAncestor),
    ]);
  } catch (error) {
    if (isChangeLookupNotFoundError(error)) {
      throw containmentError();
    }
    throw error;
  }

  const canonicalTarget = path.resolve(canonicalAncestor, ...missingSegments);
  if (!isContainedPath(canonicalRoot, canonicalTarget)) {
    throw containmentError();
  }
}

async function findChangeIds(rootDir: string, ignoreRootArchive: boolean): Promise<string[]> {
  const ids: string[] = [];

  async function walk(currentDir: string, segments: string[]): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch (error) {
      if (isMissingPathError(error)) {
        return;
      }

      throw error;
    }

    const hasMarker = segments.length > 0 && entries.some(
      (entry) => entry.isFile() && (entry.name === '.openspec.yaml' || entry.name === 'proposal.md')
    );

    if (hasMarker) {
      ids.push(segments.join('/'));
      return;
    }

    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) {
        continue;
      }

      if (ignoreRootArchive && segments.length === 0 && entry.name === 'archive') {
        continue;
      }

      await walk(path.join(currentDir, entry.name), [...segments, entry.name]);
    }
  }

  await walk(rootDir, []);
  return ids.sort();
}

function isMissingPathError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error &&
    error.code === 'ENOENT';
}

function isChangeLookupNotFoundError(error: unknown): error is NodeJS.ErrnoException {
  return isMissingPathError(error) ||
    (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOTDIR');
}

function assertContainedChangePath(changeId: string, root: string, target: string): void {
  if (!isContainedPath(root, target)) {
    throw new InvalidChangeIdError(
      changeId,
      'outside_changes',
      'Change path must stay within changesDir'
    );
  }
}

function isContainedPath(root: string, target: string): boolean {
  const relativePath = path.relative(root, target);
  return !path.isAbsolute(relativePath) &&
    relativePath !== '..' &&
    !relativePath.startsWith(`..${path.sep}`);
}

async function hasOwnChangeMarker(changePath: string): Promise<boolean> {
  for (const marker of ['.openspec.yaml', 'proposal.md']) {
    try {
      const stats = await fs.stat(path.join(changePath, marker));
      if (stats.isFile()) {
        return true;
      }
    } catch (error) {
      if (!isMissingPathError(error)) {
        throw error;
      }
    }
  }
  return false;
}
