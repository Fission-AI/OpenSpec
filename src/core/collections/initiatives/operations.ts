import * as nodeFs from 'node:fs';

import type { MountedCollection } from '../runtime.js';
import {
  INITIATIVE_COLLECTION_ID,
  INITIATIVE_FILE_NAME,
  parseInitiativeState,
  serializeInitiativeState,
  validateInitiativeId,
  type InitiativeMetadata,
  type InitiativeState,
  type InitiativeStatus,
} from './schema.js';
import {
  buildDefaultInitiativeFiles,
  type InitiativeTemplateFile,
} from './templates.js';

const fs = nodeFs.promises;

export interface InitiativeDirectoryEntry {
  name: string;
  isDirectory(): boolean;
}

export interface InitiativeOperationsFileSystem {
  mkdir(dirPath: string, options: { recursive?: boolean }): Promise<void>;
  writeFile(
    filePath: string,
    content: string,
    options: { flag?: nodeFs.OpenMode }
  ): Promise<void>;
  readFile(filePath: string): Promise<string>;
  readdir(
    dirPath: string,
    options: { withFileTypes: true }
  ): Promise<readonly InitiativeDirectoryEntry[]>;
  rm(dirPath: string, options: { recursive?: boolean; force?: boolean }): Promise<void>;
}

export interface InitiativeOperationDependencies {
  fileSystem?: InitiativeOperationsFileSystem;
}

export interface CreateInitiativeInput extends InitiativeOperationDependencies {
  collection: MountedCollection;
  id: string;
  title: string;
  summary: string;
  status?: InitiativeStatus;
  owners?: string[];
  metadata?: InitiativeMetadata;
  getCurrentDate?: () => string;
  buildTemplateFiles?: (state: InitiativeState) => readonly InitiativeTemplateFile[];
}

export interface ListInitiativesInput extends InitiativeOperationDependencies {
  collection: MountedCollection;
}

export interface ReadInitiativeInput extends InitiativeOperationDependencies {
  collection: MountedCollection;
  id: string;
}

const nodeFileSystem: InitiativeOperationsFileSystem = {
  async mkdir(dirPath, options) {
    await fs.mkdir(dirPath, options);
  },

  async writeFile(filePath, content, options) {
    await fs.writeFile(filePath, content, {
      encoding: 'utf-8',
      flag: options.flag ?? 'w',
    });
  },

  async readFile(filePath) {
    return fs.readFile(filePath, 'utf-8');
  },

  async readdir(dirPath, options) {
    return fs.readdir(dirPath, options);
  },

  async rm(dirPath, options) {
    await fs.rm(dirPath, options);
  },
};

function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getFileSystem(fileSystem?: InitiativeOperationsFileSystem): InitiativeOperationsFileSystem {
  return fileSystem ?? nodeFileSystem;
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'ENOENT'
  );
}

function isPathExistsError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as NodeJS.ErrnoException).code === 'EEXIST'
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function assertInitiativesCollection(collection: MountedCollection): void {
  if (collection.collectionId !== INITIATIVE_COLLECTION_ID) {
    throw new Error(
      `Expected mounted '${INITIATIVE_COLLECTION_ID}' collection, got '${collection.collectionId}'`
    );
  }
}

function resolveInitiativeFilePath(
  collection: MountedCollection,
  initiativeId: string,
  fileName: string
): string {
  return collection.resolvePath(`${initiativeId}/${fileName}`);
}

function normalizeCreateState(input: CreateInitiativeInput): InitiativeState {
  return parseInitiativeState(serializeInitiativeState({
    version: 1,
    id: validateInitiativeId(input.id),
    title: input.title,
    summary: input.summary,
    status: input.status ?? 'exploring',
    created: (input.getCurrentDate ?? getCurrentDate)(),
    owners: input.owners ?? [],
    metadata: input.metadata ?? {},
  }));
}

async function writeExclusiveFile(
  fileSystem: InitiativeOperationsFileSystem,
  filePath: string,
  content: string
): Promise<void> {
  await fileSystem.writeFile(filePath, content, { flag: 'wx' });
}

async function cleanupCreatedInitiative(
  fileSystem: InitiativeOperationsFileSystem,
  initiativeRoot: string,
  originalError: unknown,
  initiativeId: string
): Promise<never> {
  try {
    await fileSystem.rm(initiativeRoot, { recursive: true, force: true });
  } catch (cleanupError) {
    throw new Error(
      `Failed to create initiative '${initiativeId}' and cleanup failed: ${errorMessage(originalError)}; cleanup: ${errorMessage(cleanupError)}`
    );
  }

  throw new Error(`Failed to create initiative '${initiativeId}': ${errorMessage(originalError)}`);
}

export async function createInitiative(input: CreateInitiativeInput): Promise<InitiativeState> {
  assertInitiativesCollection(input.collection);

  const state = normalizeCreateState(input);
  const fileSystem = getFileSystem(input.fileSystem);
  const initiativeRoot = input.collection.resolvePath(state.id);
  const buildTemplateFiles = input.buildTemplateFiles ?? buildDefaultInitiativeFiles;

  try {
    await fileSystem.mkdir(input.collection.resolvePath(), { recursive: true });
    await fileSystem.mkdir(initiativeRoot, { recursive: false });
  } catch (error) {
    if (isPathExistsError(error)) {
      throw new Error(`Initiative '${state.id}' already exists at ${initiativeRoot}`);
    }

    throw new Error(`Failed to create initiative '${state.id}': ${errorMessage(error)}`);
  }

  try {
    await writeExclusiveFile(
      fileSystem,
      resolveInitiativeFilePath(input.collection, state.id, INITIATIVE_FILE_NAME),
      serializeInitiativeState(state)
    );

    for (const templateFile of buildTemplateFiles(state)) {
      await writeExclusiveFile(
        fileSystem,
        resolveInitiativeFilePath(input.collection, state.id, templateFile.fileName),
        templateFile.content
      );
    }
  } catch (error) {
    await cleanupCreatedInitiative(fileSystem, initiativeRoot, error, state.id);
  }

  return state;
}

export async function readInitiative(input: ReadInitiativeInput): Promise<InitiativeState | null> {
  assertInitiativesCollection(input.collection);

  const initiativeId = validateInitiativeId(input.id);
  const fileSystem = getFileSystem(input.fileSystem);
  const initiativeFilePath = resolveInitiativeFilePath(
    input.collection,
    initiativeId,
    INITIATIVE_FILE_NAME
  );

  let content: string;
  try {
    content = await fileSystem.readFile(initiativeFilePath);
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return null;
    }

    throw new Error(
      `Invalid initiative '${initiativeId}': failed to read ${INITIATIVE_FILE_NAME}: ${errorMessage(error)}`
    );
  }

  let state: InitiativeState;
  try {
    state = parseInitiativeState(content);
  } catch (error) {
    throw new Error(`Invalid initiative '${initiativeId}': ${errorMessage(error)}`);
  }

  if (state.id !== initiativeId) {
    throw new Error(
      `Invalid initiative '${initiativeId}': ${INITIATIVE_FILE_NAME} id '${state.id}' must match folder name`
    );
  }

  return state;
}

export async function listInitiatives(input: ListInitiativesInput): Promise<InitiativeState[]> {
  assertInitiativesCollection(input.collection);

  const fileSystem = getFileSystem(input.fileSystem);
  let entries: readonly InitiativeDirectoryEntry[];

  try {
    entries = await fileSystem.readdir(input.collection.resolvePath(), { withFileTypes: true });
  } catch (error) {
    if (isFileNotFoundError(error)) {
      return [];
    }

    throw new Error(`Failed to list initiatives: ${errorMessage(error)}`);
  }

  const initiatives: InitiativeState[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const initiativeFilePath = resolveInitiativeFilePath(
      input.collection,
      entry.name,
      INITIATIVE_FILE_NAME
    );

    let content: string;
    try {
      content = await fileSystem.readFile(initiativeFilePath);
    } catch (error) {
      if (isFileNotFoundError(error)) {
        continue;
      }

      throw new Error(
        `Invalid initiative '${entry.name}': failed to read ${INITIATIVE_FILE_NAME}: ${errorMessage(error)}`
      );
    }

    let state: InitiativeState;
    try {
      state = parseInitiativeState(content);
    } catch (error) {
      throw new Error(`Invalid initiative '${entry.name}': ${errorMessage(error)}`);
    }

    if (state.id !== entry.name) {
      throw new Error(
        `Invalid initiative '${entry.name}': ${INITIATIVE_FILE_NAME} id '${state.id}' must match folder name`
      );
    }

    initiatives.push(state);
  }

  return initiatives.sort((a, b) => a.id.localeCompare(b.id));
}
