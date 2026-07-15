import path from 'path';
import { promises as fs } from 'fs';
import { FileSystemUtils } from './file-system.js';
import { writeChangeMetadata, validateSchemaName } from './change-metadata.js';
import {
  splitChangeId,
  validateChangeName,
  validateDomainPath,
} from './change-path.js';
import { readProjectConfig } from '../core/project-config.js';
import type { ChangeMetadata } from '../core/change-metadata/index.js';

const DEFAULT_SCHEMA = 'spec-driven';
const CHANGE_MARKERS = ['.openspec.yaml', 'proposal.md'] as const;

async function canonicalizeProspectivePath(targetPath: string): Promise<string> {
  const missingSegments: string[] = [];
  let currentPath = path.resolve(targetPath);

  while (true) {
    try {
      const existingPath = await fs.realpath(currentPath);
      return path.resolve(existingPath, ...missingSegments.reverse());
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }

      const parentPath = path.dirname(currentPath);
      if (parentPath === currentPath) {
        throw error;
      }
      missingSegments.push(path.basename(currentPath));
      currentPath = parentPath;
    }
  }
}

function pathStaysWithin(basePath: string, targetPath: string): boolean {
  const relativePath = path.relative(basePath, targetPath);
  return (
    relativePath === '' ||
    (!path.isAbsolute(relativePath) &&
      relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`))
  );
}

async function pathIsFile(targetPath: string): Promise<boolean> {
  try {
    return (await fs.stat(targetPath)).isFile();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

async function assertDomainPrefixesAreNotChanges(
  changesDir: string,
  domain: string[]
): Promise<void> {
  const prefix: string[] = [];
  for (const segment of domain) {
    prefix.push(segment);
    const prefixDir = path.join(changesDir, ...prefix);
    for (const marker of CHANGE_MARKERS) {
      if (await pathIsFile(path.join(prefixDir, marker))) {
        throw new Error(`Domain prefix '${prefix.join('/')}' is already a change`);
      }
    }
  }
}

/**
 * Options for creating a change.
 */
export interface CreateChangeOptions {
  /** The workflow schema to use (default: 'spec-driven') */
  schema?: string;
  /** Default schema to use when no explicit schema or project config is present */
  defaultSchema?: string;
  /** Directory that should contain the change directories */
  changesDir?: string;
  /** Additional metadata to persist in the change's .openspec.yaml */
  metadata?: Partial<Pick<ChangeMetadata, 'goal' | 'affected_areas' | 'initiative'>>;
}

/**
 * Result of creating a change.
 */
export interface CreateChangeResult {
  /** The schema that was actually used (resolved from options, config, or default) */
  schema: string;
  /** Absolute path to the created change directory */
  changeDir: string;
}

export { validateChangeName } from './change-path.js';
export type { ValidationResult } from './change-path.js';

/**
 * Creates a new change directory with metadata file.
 *
 * @param projectRoot - The root directory of the project (where `openspec/` lives)
 * @param changeId - Full change ID; domain segments are optional and the final name must be kebab-case
 * @param options - Optional settings for the change
 * @throws Error if the domain path or final change name is invalid
 * @throws Error if the schema name is invalid
 * @throws Error if the change directory already exists
 *
 * @returns Result containing the resolved schema name
 *
 * @example
 * // Creates openspec/changes/add-auth/ with default schema
 * const result = await createChange('/path/to/project', 'add-auth')
 * console.log(result.schema) // 'spec-driven' or value from config
 *
 * @example
 * // Creates openspec/changes/Platform/API/add-auth/ with custom schema
 * const result = await createChange('/path/to/project', 'Platform/API/add-auth', { schema: 'my-workflow' })
 * console.log(result.schema) // 'my-workflow'
 */
export async function createChange(
  projectRoot: string,
  changeId: string,
  options: CreateChangeOptions = {}
): Promise<CreateChangeResult> {
  const { domain, name } = splitChangeId(changeId);
  const domainValidation = validateDomainPath(domain.join('/'));
  if (!domainValidation.valid) {
    throw new Error(domainValidation.error);
  }

  const validation = validateChangeName(name);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const rootSegment = domain[0] ?? name;
  if (rootSegment.toLowerCase() === 'archive') {
    throw new Error("Change ID root segment 'archive' is reserved");
  }

  const defaultSchema = options.defaultSchema ?? DEFAULT_SCHEMA;

  // Determine schema: explicit option → project config → supplied default
  let schemaName: string;
  if (options.schema) {
    schemaName = options.schema;
  } else {
    // Try to read from project config
    try {
      const config = readProjectConfig(projectRoot);
      schemaName = config?.schema ?? defaultSchema;
    } catch {
      // If config read fails, use default
      schemaName = defaultSchema;
    }
  }

  // Validate the resolved schema
  validateSchemaName(schemaName, projectRoot);

  const changesDir = path.resolve(
    options.changesDir ?? path.join(projectRoot, 'openspec', 'changes')
  );
  const changeDir = path.resolve(changesDir, ...domain, name);
  if (!pathStaysWithin(changesDir, changeDir)) {
    throw new Error('Change path must stay within changesDir');
  }

  const canonicalChangesDir = await canonicalizeProspectivePath(changesDir);
  const canonicalChangeDir = await canonicalizeProspectivePath(changeDir);
  if (!pathStaysWithin(canonicalChangesDir, canonicalChangeDir)) {
    throw new Error('Change path must stay within changesDir');
  }

  await assertDomainPrefixesAreNotChanges(changesDir, domain);

  // Check if change already exists
  if (await FileSystemUtils.directoryExists(changeDir)) {
    throw new Error(`Change '${changeId}' already exists at ${changeDir}`);
  }

  // Creating a change may scaffold or complete the root itself (an
  // implicit root, or a config-only/incomplete clone). Never leave a
  // half-root behind that doctor immediately calls unhealthy: ensure
  // specs/ and archive/ exist, and write a config only when
  // none exists. The config records the PROJECT default schema, never
  // a one-change --schema override.
  const openspecDir = path.join(projectRoot, 'openspec');

  // Create the directory (including parent directories if needed)
  await FileSystemUtils.createDirectory(changeDir);
  await FileSystemUtils.createDirectory(path.join(openspecDir, 'specs'));
  await FileSystemUtils.createDirectory(path.join(openspecDir, 'archive'));
  const configPath = path.join(openspecDir, 'config.yaml');
  const configYmlPath = path.join(openspecDir, 'config.yml');
  if (
    !(await FileSystemUtils.fileExists(configPath)) &&
    !(await FileSystemUtils.fileExists(configYmlPath))
  ) {
    await FileSystemUtils.writeFile(configPath, `schema: ${defaultSchema}\n`);
  }

  // Write metadata file with schema and creation date
  const today = new Date().toISOString().split('T')[0];
  writeChangeMetadata(changeDir, {
    schema: schemaName,
    created: today,
    ...options.metadata,
  }, projectRoot);

  return { schema: schemaName, changeDir };
}
