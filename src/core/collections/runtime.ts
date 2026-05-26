import * as path from 'node:path';

import { FileSystemUtils } from '../../utils/file-system.js';

export type CollectionMetadata = Readonly<Record<string, unknown>>;
export type CollectionHooks = Readonly<Record<string, unknown>>;

export interface CollectionDefinition<THandle = unknown> {
  id: string;
  mount: string;
  metadata?: CollectionMetadata;
  hooks?: CollectionHooks;
  createHandle?: (context: MountedCollectionContext) => THandle;
}

export interface CollectionRegistry {
  list(): readonly CollectionDefinition[];
  get<THandle = unknown>(collectionId: string): CollectionDefinition<THandle> | undefined;
  require<THandle = unknown>(collectionId: string): CollectionDefinition<THandle>;
}

export interface MountedCollectionContext {
  storeRoot: string;
  collectionId: string;
  mount: string;
  mountRoot: string;
  resolvePath(relativePath?: string): string;
  toStorePath(relativePath?: string): string;
}

export interface MountedCollection<THandle = unknown> {
  collectionId: string;
  mount: string;
  mountRoot: string;
  context: MountedCollectionContext;
  handle: THandle | undefined;
  resolvePath(relativePath?: string): string;
  toStorePath(relativePath?: string): string;
}

export interface MountedCollectionRegistry {
  list(): readonly MountedCollection[];
  get<THandle = unknown>(collectionId: string): MountedCollection<THandle> | undefined;
  require<THandle = unknown>(collectionId: string): MountedCollection<THandle>;
}

export interface MountCollectionsInput {
  storeRoot: string;
  collections: CollectionRegistry;
}

function assertNoNul(value: string, label: string): void {
  if (value.includes('\0')) {
    throw new Error(`${label} must not contain NUL bytes`);
  }
}

function validateKebabSegment(value: string, label: string): string {
  assertNoNul(value, label);

  if (value.length === 0) {
    throw new Error(`${label} must not be empty`);
  }

  if (value === '.' || value === '..') {
    throw new Error(`${label} must not be '${value}'`);
  }

  if (/[\\/]/u.test(value)) {
    throw new Error(`${label} must not contain path separators`);
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(value)) {
    throw new Error(
      `${label} must be kebab-case with lowercase letters, numbers, and single hyphen separators`
    );
  }

  return value;
}

export function validateCollectionId(id: string): string {
  return validateKebabSegment(id, 'Collection id');
}

export function validateMount(mount: string): string {
  assertNoNul(mount, 'Collection mount');

  if (mount.startsWith('.')) {
    throw new Error(`Collection mount '${mount}' is reserved`);
  }

  return validateKebabSegment(mount, 'Collection mount');
}

function isWindowsDrivePath(value: string): boolean {
  return /^[A-Za-z]:/u.test(value);
}

function isUncPath(value: string): boolean {
  return value.startsWith('\\\\') || value.startsWith('//');
}

export function parseCollectionPath(input = ''): string {
  assertNoNul(input, 'Collection path');

  if (input.length === 0) {
    return '';
  }

  if (input.includes('\\')) {
    throw new Error('Collection path must use forward slashes');
  }

  if (isWindowsDrivePath(input)) {
    throw new Error('Collection path must not be a Windows drive path');
  }

  if (isUncPath(input) || path.posix.isAbsolute(input)) {
    throw new Error('Collection path must be relative');
  }

  const segments = input.split('/');

  for (const segment of segments) {
    if (segment.length === 0) {
      throw new Error('Collection path must not contain empty segments');
    }

    if (segment === '.' || segment === '..') {
      throw new Error('Collection path must not contain dot segments');
    }
  }

  return segments.join('/');
}

function compareCollectionDefinitions(
  a: CollectionDefinition,
  b: CollectionDefinition
): number {
  return a.id.localeCompare(b.id);
}

export function createCollectionRegistry(
  definitions: readonly CollectionDefinition[]
): CollectionRegistry {
  const byId = new Map<string, CollectionDefinition>();
  const mountOwners = new Map<string, string>();

  for (const definition of definitions) {
    const id = validateCollectionId(definition.id);
    const mount = validateMount(definition.mount);

    if (byId.has(id)) {
      throw new Error(`Duplicate collection id '${id}'`);
    }

    const existingMountOwner = mountOwners.get(mount);
    if (existingMountOwner) {
      throw new Error(
        `Duplicate collection mount '${mount}' for '${existingMountOwner}' and '${id}'`
      );
    }

    const normalizedDefinition = {
      ...definition,
      id,
      mount,
    };

    byId.set(id, normalizedDefinition);
    mountOwners.set(mount, id);
  }

  const sortedDefinitions = Array.from(byId.values()).sort(compareCollectionDefinitions);

  return {
    list() {
      return [...sortedDefinitions];
    },

    get<THandle = unknown>(collectionId: string): CollectionDefinition<THandle> | undefined {
      const id = validateCollectionId(collectionId);
      return byId.get(id) as CollectionDefinition<THandle> | undefined;
    },

    require<THandle = unknown>(collectionId: string): CollectionDefinition<THandle> {
      const definition = this.get<THandle>(collectionId);

      if (!definition) {
        throw new Error(`Unknown collection '${collectionId}'`);
      }

      return definition;
    },
  };
}

function isWindowsLikePath(candidatePath: string): boolean {
  return /^[A-Za-z]:[\\/]/u.test(candidatePath) || candidatePath.startsWith('\\\\');
}

function relativePath(fromPath: string, toPath: string): string {
  if (isWindowsLikePath(fromPath) || isWindowsLikePath(toPath)) {
    return path.win32.relative(path.win32.normalize(fromPath), path.win32.normalize(toPath));
  }

  return path.posix.relative(fromPath.replace(/\\/g, '/'), toPath.replace(/\\/g, '/'));
}

function isRelativePathAbsolute(value: string, windowsLike: boolean): boolean {
  return windowsLike ? path.win32.isAbsolute(value) : path.posix.isAbsolute(value);
}

function isSameOrDescendant(rootPath: string, candidatePath: string): boolean {
  const windowsLike = isWindowsLikePath(rootPath) || isWindowsLikePath(candidatePath);
  const relative = relativePath(rootPath, candidatePath);
  const escapesRoot = /^\.\.(?:[\\/]|$)/u.test(relative);

  return (
    relative === '' ||
    (!escapesRoot && !isRelativePathAbsolute(relative, windowsLike))
  );
}

function getMountRoot(storeRoot: string, mount: string): string {
  return FileSystemUtils.joinPath(storeRoot, validateMount(mount));
}

function resolvePathInsideMount(mountRoot: string, relativePath?: string): string {
  const collectionPath = parseCollectionPath(relativePath);
  const resolvedPath = collectionPath.length > 0
    ? FileSystemUtils.joinPath(mountRoot, collectionPath)
    : mountRoot;

  if (!isSameOrDescendant(mountRoot, resolvedPath)) {
    throw new Error(`Collection path escapes mount: ${relativePath ?? ''}`);
  }

  return resolvedPath;
}

function toStorePath(mount: string, relativePath?: string): string {
  const collectionPath = parseCollectionPath(relativePath);
  return collectionPath.length > 0
    ? `${validateMount(mount)}/${collectionPath}`
    : validateMount(mount);
}

function createMountedCollection<THandle>(
  storeRoot: string,
  definition: CollectionDefinition<THandle>
): MountedCollection<THandle> {
  const mountRoot = getMountRoot(storeRoot, definition.mount);
  const resolveMountedPath = (relativePath?: string) =>
    resolvePathInsideMount(mountRoot, relativePath);
  const resolveStorePath = (relativePath?: string) => toStorePath(definition.mount, relativePath);

  const context: MountedCollectionContext = {
    storeRoot,
    collectionId: definition.id,
    mount: definition.mount,
    mountRoot,
    resolvePath: resolveMountedPath,
    toStorePath: resolveStorePath,
  };

  return {
    collectionId: definition.id,
    mount: definition.mount,
    mountRoot,
    context,
    handle: definition.createHandle?.(context),
    resolvePath: resolveMountedPath,
    toStorePath: resolveStorePath,
  };
}

export function mountCollections(input: MountCollectionsInput): MountedCollectionRegistry {
  if (input.storeRoot.length === 0) {
    throw new Error('Context store root must not be empty');
  }

  const byId = new Map<string, MountedCollection>();

  for (const definition of input.collections.list()) {
    const mountedCollection = createMountedCollection(input.storeRoot, definition);
    byId.set(mountedCollection.collectionId, mountedCollection);
  }

  const sortedCollections = Array.from(byId.values()).sort((a, b) =>
    a.collectionId.localeCompare(b.collectionId)
  );

  return {
    list() {
      return [...sortedCollections];
    },

    get<THandle = unknown>(collectionId: string): MountedCollection<THandle> | undefined {
      const id = validateCollectionId(collectionId);
      return byId.get(id) as MountedCollection<THandle> | undefined;
    },

    require<THandle = unknown>(collectionId: string): MountedCollection<THandle> {
      const mountedCollection = this.get<THandle>(collectionId);

      if (!mountedCollection) {
        throw new Error(`Unknown mounted collection '${collectionId}'`);
      }

      return mountedCollection;
    },
  };
}
