import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { FileSystemUtils } from '../utils/file-system.js';
import { serializeConfig } from './config-prompts.js';
import {
  makeStoreDiagnostic,
  type StoreDiagnostic,
} from './store/errors.js';

export const OPENSPEC_ROOT_DIR = 'openspec';
export const OPENSPEC_CONFIG_YAML = 'openspec/config.yaml';
export const OPENSPEC_CONFIG_YML = 'openspec/config.yml';
export const OPENSPEC_SPECS_DIR = 'openspec/specs';
export const OPENSPEC_CHANGES_DIR = 'openspec/changes';
export const OPENSPEC_ARCHIVE_DIR = 'openspec/changes/archive';
export const DEFAULT_OPENSPEC_SCHEMA = 'spec-driven';
export const DIRECTORY_ANCHOR_FILE_NAME = '.gitkeep';

// Git cannot track empty directories, so setup anchors otherwise-empty
// conventional store directories for teammates who clone the repo later.
export const ANCHORED_OPENSPEC_DIRS = [OPENSPEC_SPECS_DIR, OPENSPEC_ARCHIVE_DIR] as const;

type PathKind = 'missing' | 'directory' | 'file' | 'other';

export interface CreatedPathLedgerEntry {
  relativePath: string;
  absolutePath: string;
  kind: 'directory' | 'file';
}

export interface OpenSpecRootInspection {
  present: boolean | null;
  config: {
    present: boolean | null;
    path?: string;
  };
  specs: {
    present: boolean | null;
  };
  changes: {
    present: boolean | null;
  };
  archive: {
    present: boolean | null;
  };
  healthy: boolean;
  diagnostics: StoreDiagnostic[];
}

export interface EnsureOpenSpecRootResult {
  inspection: OpenSpecRootInspection;
  createdArtifacts: string[];
  createdPaths: CreatedPathLedgerEntry[];
}

async function pathKind(targetPath: string): Promise<PathKind> {
  try {
    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) return 'directory';
    if (stat.isFile()) return 'file';
    return 'other';
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as NodeJS.ErrnoException).code === 'ENOENT'
    ) {
      return 'missing';
    }

    throw error;
  }
}

function relativeArtifact(relativePath: string, kind: CreatedPathLedgerEntry['kind']): string {
  const normalized = FileSystemUtils.toPosixPath(relativePath);
  return kind === 'directory' ? `${normalized}/` : normalized;
}

function unresolvedInspection(): OpenSpecRootInspection {
  return {
    present: null,
    config: { present: null },
    specs: { present: null },
    changes: { present: null },
    archive: { present: null },
    healthy: false,
    diagnostics: [],
  };
}

function missingDirectoryDiagnostic(
  code: string,
  message: string,
  target: string
): StoreDiagnostic {
  return makeStoreDiagnostic('error', code, message, { target });
}

type OptionalPlanningDirectoryKey = 'specs' | 'changes' | 'archive';

async function inspectOptionalPlanningDirectory(
  inspection: OpenSpecRootInspection,
  storeRoot: string,
  key: OptionalPlanningDirectoryKey,
  relativePath: string,
  notDirectoryCode: string,
  target: string
): Promise<PathKind> {
  const kind = await pathKind(path.join(storeRoot, relativePath));
  inspection[key] = { present: kind === 'directory' };
  if (kind === 'directory' || kind === 'missing') return kind;

  inspection.diagnostics.push(missingDirectoryDiagnostic(
    notDirectoryCode,
    `${relativePath}/ exists but is not a directory.`,
    target
  ));
  return kind;
}

export async function inspectOpenSpecRoot(storeRoot: string): Promise<OpenSpecRootInspection> {
  const rootKind = await pathKind(storeRoot);
  const inspection = unresolvedInspection();

  if (rootKind === 'missing') {
    inspection.diagnostics.push(missingDirectoryDiagnostic(
      'openspec_store_root_missing',
      'Store root does not exist.',
      'store.root'
    ));
    return inspection;
  }

  if (rootKind !== 'directory') {
    inspection.diagnostics.push(missingDirectoryDiagnostic(
      'openspec_store_root_not_directory',
      'Store root is not a directory.',
      'store.root'
    ));
    return inspection;
  }

  const openspecPath = path.join(storeRoot, OPENSPEC_ROOT_DIR);
  const openspecKind = await pathKind(openspecPath);
  inspection.present = openspecKind === 'directory';

  if (openspecKind === 'missing') {
    inspection.diagnostics.push(missingDirectoryDiagnostic(
      'openspec_root_missing',
      'Missing openspec/ directory.',
      'openspec.root'
    ));
    return inspection;
  }

  if (openspecKind !== 'directory') {
    inspection.diagnostics.push(missingDirectoryDiagnostic(
      'openspec_root_not_directory',
      'openspec/ exists but is not a directory.',
      'openspec.root'
    ));
    return inspection;
  }

  const configYamlKind = await pathKind(path.join(storeRoot, OPENSPEC_CONFIG_YAML));
  const configYmlKind = await pathKind(path.join(storeRoot, OPENSPEC_CONFIG_YML));
  if (configYamlKind === 'file') {
    inspection.config = { present: true, path: OPENSPEC_CONFIG_YAML };
  } else if (configYmlKind === 'file') {
    inspection.config = { present: true, path: OPENSPEC_CONFIG_YML };
  } else {
    inspection.config = { present: false };
    if (configYamlKind !== 'missing' || configYmlKind !== 'missing') {
      inspection.diagnostics.push(missingDirectoryDiagnostic(
        'openspec_config_not_file',
        'OpenSpec config path exists but is not a file.',
        'openspec.config'
      ));
    } else {
      inspection.diagnostics.push(missingDirectoryDiagnostic(
        'openspec_config_missing',
        'Missing openspec/config.yaml or openspec/config.yml.',
        'openspec.config'
      ));
    }
  }

  await inspectOptionalPlanningDirectory(
    inspection,
    storeRoot,
    'specs',
    OPENSPEC_SPECS_DIR,
    'openspec_specs_not_directory',
    'openspec.specs'
  );
  const changesKind = await inspectOptionalPlanningDirectory(
    inspection,
    storeRoot,
    'changes',
    OPENSPEC_CHANGES_DIR,
    'openspec_changes_not_directory',
    'openspec.changes'
  );
  if (changesKind === 'directory') {
    await inspectOptionalPlanningDirectory(
      inspection,
      storeRoot,
      'archive',
      OPENSPEC_ARCHIVE_DIR,
      'openspec_archive_not_directory',
      'openspec.archive'
    );
  } else {
    inspection.archive = { present: false };
  }

  inspection.healthy =
    inspection.present === true &&
    inspection.config.present === true &&
    inspection.diagnostics.length === 0;

  return inspection;
}

async function ensureDirectory(
  storeRoot: string,
  relativePath: string,
  ledger: CreatedPathLedgerEntry[]
): Promise<void> {
  const absolutePath = path.join(storeRoot, relativePath);
  const kind = await pathKind(absolutePath);

  if (kind === 'directory') return;
  if (kind !== 'missing') {
    throw new Error(`${relativePath}/ exists but is not a directory.`);
  }

  await fs.mkdir(absolutePath, { recursive: true });
  ledger.push({
    relativePath: relativeArtifact(relativePath, 'directory'),
    absolutePath,
    kind: 'directory',
  });
}

async function ensureDefaultConfig(
  storeRoot: string,
  ledger: CreatedPathLedgerEntry[]
): Promise<void> {
  const configYamlPath = path.join(storeRoot, OPENSPEC_CONFIG_YAML);
  const configYmlPath = path.join(storeRoot, OPENSPEC_CONFIG_YML);
  const yamlKind = await pathKind(configYamlPath);
  const ymlKind = await pathKind(configYmlPath);

  if (yamlKind === 'file' || ymlKind === 'file') return;
  if (yamlKind !== 'missing' || ymlKind !== 'missing') {
    throw new Error('OpenSpec config path exists but is not a file.');
  }

  await FileSystemUtils.writeFile(
    configYamlPath,
    serializeConfig({ schema: DEFAULT_OPENSPEC_SCHEMA })
  );
  ledger.push({
    relativePath: relativeArtifact(OPENSPEC_CONFIG_YAML, 'file'),
    absolutePath: configYamlPath,
    kind: 'file',
  });
}

async function ensureDirectoryAnchor(
  storeRoot: string,
  relativeDir: string,
  ledger: CreatedPathLedgerEntry[]
): Promise<void> {
  const directory = path.join(storeRoot, relativeDir);
  if ((await fs.readdir(directory)).length > 0) return;

  const relativePath = `${relativeDir}/${DIRECTORY_ANCHOR_FILE_NAME}`;
  const absolutePath = path.join(directory, DIRECTORY_ANCHOR_FILE_NAME);
  await fs.writeFile(absolutePath, '', 'utf-8');
  ledger.push({
    relativePath: relativeArtifact(relativePath, 'file'),
    absolutePath,
    kind: 'file',
  });
}

export interface EnsureOpenSpecRootOptions {
  anchorEmptyDirectories?: boolean;
}

export async function ensureOpenSpecRoot(
  storeRoot: string,
  options: EnsureOpenSpecRootOptions = {}
): Promise<EnsureOpenSpecRootResult> {
  const ledger: CreatedPathLedgerEntry[] = [];
  const rootKind = await pathKind(storeRoot);

  if (rootKind === 'missing') {
    await fs.mkdir(storeRoot, { recursive: true });
  } else if (rootKind !== 'directory') {
    throw new Error('Store root is not a directory.');
  }

  await ensureDirectory(storeRoot, OPENSPEC_ROOT_DIR, ledger);
  await ensureDirectory(storeRoot, OPENSPEC_SPECS_DIR, ledger);
  await ensureDirectory(storeRoot, OPENSPEC_CHANGES_DIR, ledger);
  await ensureDirectory(storeRoot, OPENSPEC_ARCHIVE_DIR, ledger);
  await ensureDefaultConfig(storeRoot, ledger);

  if (options.anchorEmptyDirectories) {
    for (const relativeDir of ANCHORED_OPENSPEC_DIRS) {
      await ensureDirectoryAnchor(storeRoot, relativeDir, ledger);
    }
  }

  return {
    inspection: await inspectOpenSpecRoot(storeRoot),
    createdArtifacts: ledger.map((entry) => entry.relativePath),
    createdPaths: ledger,
  };
}

export async function rollbackCreatedPaths(entries: CreatedPathLedgerEntry[]): Promise<void> {
  for (const entry of [...entries].reverse()) {
    if (entry.kind === 'file') {
      await fs.rm(entry.absolutePath, { force: true }).catch(() => undefined);
    } else {
      await fs.rmdir(entry.absolutePath).catch(() => undefined);
    }
  }
}
