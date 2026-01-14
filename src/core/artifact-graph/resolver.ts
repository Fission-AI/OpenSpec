import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalDataDir } from '../global-config.js';
import { parseSchema, SchemaValidationError } from './schema.js';
import type { SchemaYaml } from './types.js';

/**
 * Error thrown when loading a schema fails.
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
 * Gets the package's built-in schemas directory path.
 * Uses import.meta.url to resolve relative to the current module.
 */
export function getPackageSchemasDir(): string {
  const currentFile = fileURLToPath(import.meta.url);
  // Navigate from dist/core/artifact-graph/ to package root's schemas/
  return path.join(path.dirname(currentFile), '..', '..', '..', 'schemas');
}

/**
 * Gets the project's local schemas directory path.
 */
export function getProjectSchemasDir(): string {
  return path.join(process.cwd(), 'openspec', 'schemas');
}

/**
 * Gets the user's schema override directory path.
 */
export function getUserSchemasDir(): string {
  return path.join(getGlobalDataDir(), 'schemas');
}

/**
 * Resolves a schema name to its directory path.
 *
 * Resolution order:
 * 1. Project-local: <cwd>/openspec/schemas/<name>/schema.yaml
 * 2. User override: ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
 * 3. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @returns The path to the schema directory, or null if not found
 */
export function getSchemaDir(name: string): string | null {
  // 1. Check project-local directory
  const projectDir = path.join(getProjectSchemasDir(), name);
  const projectSchemaPath = path.join(projectDir, 'schema.yaml');
  if (fs.existsSync(projectSchemaPath)) {
    return projectDir;
  }

  // 2. Check user override directory
  const userDir = path.join(getUserSchemasDir(), name);
  const userSchemaPath = path.join(userDir, 'schema.yaml');
  if (fs.existsSync(userSchemaPath)) {
    return userDir;
  }

  // 3. Check package built-in directory
  const packageDir = path.join(getPackageSchemasDir(), name);
  const packageSchemaPath = path.join(packageDir, 'schema.yaml');
  if (fs.existsSync(packageSchemaPath)) {
    return packageDir;
  }

  return null;
}

/**
 * Resolves a schema name to a SchemaYaml object.
 *
 * Resolution order:
 * 1. User override: ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
 * 2. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @returns The resolved schema object
 * @throws Error if schema is not found in any location
 */
export function resolveSchema(name: string): SchemaYaml {
  // Normalize name (remove .yaml extension if provided)
  const normalizedName = name.replace(/\.ya?ml$/, '');

  const schemaDir = getSchemaDir(normalizedName);
  if (!schemaDir) {
    const availableSchemas = listSchemas();
    throw new Error(
      `Schema '${normalizedName}' not found. Available schemas: ${availableSchemas.join(', ')}`
    );
  }

  const schemaPath = path.join(schemaDir, 'schema.yaml');

  // Load and parse the schema
  let content: string;
  try {
    content = fs.readFileSync(schemaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Failed to read schema at '${schemaPath}': ${ioError.message}`,
      schemaPath,
      ioError
    );
  }

  try {
    return parseSchema(content);
  } catch (err) {
    if (err instanceof SchemaValidationError) {
      throw new SchemaLoadError(
        `Invalid schema at '${schemaPath}': ${err.message}`,
        schemaPath,
        err
      );
    }
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Failed to parse schema at '${schemaPath}': ${parseError.message}`,
      schemaPath,
      parseError
    );
  }
}

/**
 * Lists all available schema names.
 * Combines project-local, user override and package built-in schemas.
 */
export function listSchemas(): string[] {
  const schemas = new Set<string>();

  // Add package built-in schemas
  const packageDir = getPackageSchemasDir();
  if (fs.existsSync(packageDir)) {
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const schemaPath = path.join(packageDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          schemas.add(entry.name);
        }
      }
    }
  }

  // Add user override schemas (may override package schemas)
  const userDir = getUserSchemasDir();
  if (fs.existsSync(userDir)) {
    for (const entry of fs.readdirSync(userDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const schemaPath = path.join(userDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          schemas.add(entry.name);
        }
      }
    }
  }

  // Add project-local schemas (may override both user and package schemas)
  const projectDir = getProjectSchemasDir();
  if (fs.existsSync(projectDir)) {
    for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const schemaPath = path.join(projectDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          schemas.add(entry.name);
        }
      }
    }
  }

  return Array.from(schemas).sort();
}

/**
 * Schema info with metadata (name, description, artifacts).
 */
export interface SchemaInfo {
  name: string;
  description: string;
  artifacts: string[];
  source: 'package' | 'user' | 'project';
}

/**
 * Lists all available schemas with their descriptions and artifact lists.
 * Useful for agent skills to present schema selection to users.
 */
export function listSchemasWithInfo(): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  const seenNames = new Set<string>();

  // Add project-local schemas first (highest precedence)
  const projectDir = getProjectSchemasDir();
  if (fs.existsSync(projectDir)) {
    for (const entry of fs.readdirSync(projectDir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        const schemaPath = path.join(projectDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          try {
            const schema = parseSchema(fs.readFileSync(schemaPath, 'utf-8'));
            schemas.push({
              name: entry.name,
              description: schema.description || '',
              artifacts: schema.artifacts.map((a) => a.id),
              source: 'project',
            });
            seenNames.add(entry.name);
          } catch {
            // Skip invalid schemas
          }
        }
      }
    }
  }

  // Add user override schemas next
  const userDir = getUserSchemasDir();
  if (fs.existsSync(userDir)) {
    for (const entry of fs.readdirSync(userDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !seenNames.has(entry.name)) {
        const schemaPath = path.join(userDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          try {
            const schema = parseSchema(fs.readFileSync(schemaPath, 'utf-8'));
            schemas.push({
              name: entry.name,
              description: schema.description || '',
              artifacts: schema.artifacts.map((a) => a.id),
              source: 'user',
            });
            seenNames.add(entry.name);
          } catch {
            // Skip invalid schemas
          }
        }
      }
    }
  }

  // Add package built-in schemas (if not overridden)
  const packageDir = getPackageSchemasDir();
  if (fs.existsSync(packageDir)) {
    for (const entry of fs.readdirSync(packageDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !seenNames.has(entry.name)) {
        const schemaPath = path.join(packageDir, entry.name, 'schema.yaml');
        if (fs.existsSync(schemaPath)) {
          try {
            const schema = parseSchema(fs.readFileSync(schemaPath, 'utf-8'));
            schemas.push({
              name: entry.name,
              description: schema.description || '',
              artifacts: schema.artifacts.map((a) => a.id),
              source: 'package',
            });
          } catch {
            // Skip invalid schemas
          }
        }
      }
    }
  }

  return schemas.sort((a, b) => a.name.localeCompare(b.name));
}
