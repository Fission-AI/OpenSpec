import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { ChangeMetadataSchema, type ChangeMetadata } from '../core/change-metadata/index.js';
import { listSchemas, resolveSchema } from '../core/artifact-graph/resolver.js';
import { readProjectConfig } from '../core/project-config.js';

export const METADATA_FILENAME = '.openspec.yaml';

/**
 * Error thrown when change metadata validation fails.
 */
export class ChangeMetadataError extends Error {
  constructor(
    message: string,
    public readonly metadataPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'ChangeMetadataError';
  }
}

/**
 * Validates that a schema name is valid (exists in available schemas).
 *
 * @param schemaName - The schema name to validate
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns The validated schema name
 * @throws Error if schema is not found
 */
export function validateSchemaName(
  schemaName: string,
  projectRoot?: string
): string {
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(schemaName)) {
    throw new Error(
      `Unknown schema '${schemaName}'. Available: ${availableSchemas.join(', ')}`
    );
  }
  return schemaName;
}

/**
 * Writes change metadata to .openspec.yaml in the change directory.
 *
 * @param changeDir - The path to the change directory
 * @param metadata - The metadata to write
 * @param projectRoot - Optional project root for project-local schema resolution
 * @throws ChangeMetadataError if validation fails or write fails
 */
export function writeChangeMetadata(
  changeDir: string,
  metadata: ChangeMetadata,
  projectRoot?: string
): void {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  // Validate schema exists
  validateSchemaName(metadata.schema, projectRoot);

  // Validate with Zod
  const parseResult = ChangeMetadataSchema.safeParse(metadata);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // Write YAML file
  const content = yaml.stringify(parseResult.data);
  try {
    fs.writeFileSync(metaPath, content, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to write metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }
}

/**
 * Reads change metadata from .openspec.yaml in the change directory.
 *
 * @param changeDir - The path to the change directory
 * @param projectRoot - Optional project root for project-local schema resolution
 * @returns The validated metadata, or null if no metadata file exists
 * @throws ChangeMetadataError if the file exists but is invalid
 */
export function readChangeMetadata(
  changeDir: string,
  projectRoot?: string
): ChangeMetadata | null {
  const metaPath = path.join(changeDir, METADATA_FILENAME);

  if (!fs.existsSync(metaPath)) {
    return null;
  }

  let content: string;
  try {
    content = fs.readFileSync(metaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Failed to read metadata: ${ioError.message}`,
      metaPath,
      ioError
    );
  }

  let parsed: unknown;
  try {
    parsed = yaml.parse(content);
  } catch (err) {
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new ChangeMetadataError(
      `Invalid YAML in metadata file: ${parseError.message}`,
      metaPath,
      parseError
    );
  }

  // Validate with Zod
  const parseResult = ChangeMetadataSchema.safeParse(parsed);
  if (!parseResult.success) {
    throw new ChangeMetadataError(
      `Invalid metadata: ${parseResult.error.message}`,
      metaPath
    );
  }

  // Validate that the schema exists
  const availableSchemas = listSchemas(projectRoot);
  if (!availableSchemas.includes(parseResult.data.schema)) {
    throw new ChangeMetadataError(
      `Unknown schema '${parseResult.data.schema}'. Available: ${availableSchemas.join(', ')}`,
      metaPath
    );
  }

  return parseResult.data;
}

export interface ResolveSchemaForChangeOptions {
  metadata?: ChangeMetadata | null;
}

/**
 * Resolves the schema for a change, with explicit override taking precedence.
 *
 * Resolution order:
 * 1. Explicit schema (if provided)
 * 2. Schema from .openspec.yaml metadata (if exists)
 * 3. Schema from openspec/config.yaml (if exists)
 * 4. Default 'spec-driven'
 *
 * @param changeDir - The path to the change directory
 * @param explicitSchema - Optional explicit schema override
 * @returns The resolved schema name
 */
export function resolveSchemaForChange(
  changeDir: string,
  explicitSchema?: string,
  projectRootOverride?: string,
  options: ResolveSchemaForChangeOptions = {}
): string {
  // Derive project root from changeDir (changeDir is typically projectRoot/openspec/changes/change-name)
  const projectRoot = projectRootOverride ?? path.resolve(changeDir, '../../..');

  // 1. Explicit override wins
  if (explicitSchema) {
    return explicitSchema;
  }

  const metadata =
    options.metadata !== undefined ? options.metadata : readChangeMetadata(changeDir, projectRoot);
  if (metadata?.schema) {
    return metadata.schema;
  }

  // 3. Try reading from project config when metadata is absent.
  try {
    const config = readProjectConfig(projectRoot);
    if (config?.schema) {
      return config.schema;
    }
  } catch {
    // If config read fails, fall back to default
  }

  // 4. Default
  return 'spec-driven';
}

export interface SkipSpecsMarker {
  /**
   * True when the metadata parses under ChangeMetadataSchema, sets
   * skip_specs: true, and names a schema that loads.
   */
  declared: boolean;
  /**
   * Set when the marker cannot be honored: skip_specs appears in a file that
   * fails the metadata contract, or the metadata file exists but cannot be
   * read at all (so whether the marker is set cannot even be determined).
   */
  invalidReason?: string;
}

/**
 * Non-throwing read of the skip_specs marker. The marker only counts when the
 * metadata would load for status/instructions: the file parses under
 * ChangeMetadataSchema, its schema name passes readChangeMetadata's
 * listSchemas membership check, AND the schema itself loads via resolveSchema
 * (a schema.yaml that exists but does not parse fails status just the same).
 * Validate and archive must never honor metadata the rest of the CLI rejects,
 * in either direction. The project root for schema resolution is derived from
 * changeDir exactly like resolveSchemaForChange (changeDir is
 * <root>/openspec/changes/<name> for every root type, including store roots).
 * Missing metadata means "not declared"; a marker that cannot be honored
 * yields invalidReason so callers can say why.
 */
export function readSkipSpecsMarker(changeDir: string): SkipSpecsMarker {
  let raw: string;
  try {
    raw = fs.readFileSync(path.join(changeDir, METADATA_FILENAME), 'utf-8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
      return { declared: false };
    }
    // The file exists but cannot be read (EACCES, EISDIR, ...). Status and
    // instructions reject the change outright here, and whether a marker is
    // set cannot be determined - fail closed rather than let archive treat
    // the change as unmarked while every metadata-reading surface errors.
    const message =
      err instanceof Error ? err.message : String(err);
    return {
      declared: false,
      invalidReason: `the metadata file cannot be read (${message})`,
    };
  }

  let parsed: unknown;
  try {
    parsed = yaml.parse(raw);
  } catch {
    // Anchored so a comment like "# maybe add skip_specs later" does not
    // claim the marker was set.
    return /^\s*(['"]?)skip_specs\1\s*:/m.test(raw)
      ? { declared: false, invalidReason: 'the file is not valid YAML' }
      : { declared: false };
  }

  const result = ChangeMetadataSchema.safeParse(parsed);
  if (result.success) {
    if (result.data.skip_specs !== true) {
      return { declared: false };
    }
    // Schema loading is checked only when the marker is set: a broken schema
    // on an ordinary change is status's problem to report, but honoring a
    // marker that status rejects would let validate/archive pass what the
    // rest of the CLI refuses to load. The membership check mirrors
    // readChangeMetadata (which rejects names like 'spec-driven.yaml' that
    // resolveSchema alone would normalize and accept); resolveSchema then
    // proves the schema actually parses. Any failure fails closed.
    try {
      const projectRoot = path.resolve(changeDir, '../../..');
      if (!listSchemas(projectRoot).includes(result.data.schema)) {
        return {
          declared: false,
          invalidReason: `schema: unknown schema '${result.data.schema}'`,
        };
      }
      resolveSchema(result.data.schema, projectRoot);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { declared: false, invalidReason: message };
    }
    return { declared: true };
  }

  // Key presence, not value: skip_specs: "yes" must surface as unhonorable,
  // not vanish while the zero-delta guidance tells the user to set the very
  // marker they set. An explicit skip_specs: false is the opposite of setting
  // the marker, so it must not drag unrelated metadata problems into
  // validate - the change simply is not marked.
  const markerMentioned =
    typeof parsed === 'object' &&
    parsed !== null &&
    'skip_specs' in parsed &&
    (parsed as Record<string, unknown>).skip_specs !== false;
  if (markerMentioned) {
    const first = result.error.issues[0];
    const where = first.path.length > 0 ? `${first.path.join('.')}: ` : '';
    return { declared: false, invalidReason: `${where}${first.message}` };
  }
  return { declared: false };
}
