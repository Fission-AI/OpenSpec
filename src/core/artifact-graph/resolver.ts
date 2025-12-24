import * as fs from 'node:fs';
import * as path from 'node:path';
import { getGlobalDataDir } from '../global-config.js';
import { BUILTIN_SCHEMAS } from './builtin-schemas.js';
import { parseSchema, SchemaValidationError } from './schema.js';
import type { SchemaYaml } from './types.js';

/**
 * Error thrown when loading a global schema override fails.
 */
export class SchemaLoadError extends Error {
  constructor(
    message: string,
    public readonly schemaPath: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SchemaLoadError';
  }
}

/**
 * Resolves a schema name to a SchemaYaml object.
 *
 * Resolution order:
 * 1. Global user override: ${XDG_DATA_HOME}/openspec/schemas/<name>.yaml
 * 2. Built-in schema
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @returns The resolved schema object
 * @throws Error if schema is not found in any location
 */
export function resolveSchema(name: string): SchemaYaml {
  // Normalize name (remove .yaml extension if provided)
  const normalizedName = name.replace(/\.ya?ml$/, '');
  const builtinNames = Object.keys(BUILTIN_SCHEMAS).join(', ');

  // 1. Check global user override (returns path if found)
  const globalPath = getGlobalSchemaPath(normalizedName);
  if (globalPath) {
    // User override found - load and validate through the same pipeline as other schemas
    let content: string;
    try {
      content = fs.readFileSync(globalPath, 'utf-8');
    } catch (err) {
      const ioError = err instanceof Error ? err : new Error(String(err));
      throw new SchemaLoadError(
        `Failed to read global schema override at '${globalPath}': ${ioError.message}`,
        globalPath,
        ioError
      );
    }

    try {
      return parseSchema(content);
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        // Re-wrap validation errors to include the file path for context
        throw new SchemaLoadError(
          `Invalid global schema override at '${globalPath}': ${err.message}`,
          globalPath,
          err
        );
      }
      // Handle unexpected parse errors (e.g., YAML syntax errors)
      const parseError = err instanceof Error ? err : new Error(String(err));
      throw new SchemaLoadError(
        `Failed to parse global schema override at '${globalPath}': ${parseError.message}`,
        globalPath,
        parseError
      );
    }
  }

  // 2. Check built-in schemas
  const builtin = BUILTIN_SCHEMAS[normalizedName];
  if (builtin) {
    return builtin;
  }

  throw new Error(
    `Schema '${normalizedName}' not found. Checked global overrides and built-in schemas. Available built-ins: ${builtinNames}`
  );
}

/**
 * Gets the path to a global user override schema, if it exists.
 */
function getGlobalSchemaPath(name: string): string | null {
  const globalDir = path.join(getGlobalDataDir(), 'schemas');

  // Check both .yaml and .yml extensions
  for (const ext of ['.yaml', '.yml']) {
    const schemaPath = path.join(globalDir, `${name}${ext}`);
    if (fs.existsSync(schemaPath)) {
      return schemaPath;
    }
  }

  return null;
}

/**
 * Lists all available schema names.
 * Combines built-in and user override schemas.
 */
export function listSchemas(): string[] {
  const schemas = new Set<string>(Object.keys(BUILTIN_SCHEMAS));

  // Add user override schemas
  const globalDir = path.join(getGlobalDataDir(), 'schemas');
  if (fs.existsSync(globalDir)) {
    for (const file of fs.readdirSync(globalDir)) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        schemas.add(file.replace(/\.ya?ml$/, ''));
      }
    }
  }

  return Array.from(schemas).sort();
}
