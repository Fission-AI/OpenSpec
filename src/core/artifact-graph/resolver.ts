import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getGlobalDataDir } from '../global-config.js';
import { parseSchema, SchemaValidationError, validateNoCycles } from './schema.js';
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
 * Gets the user's schema override directory path.
 */
export function getUserSchemasDir(): string {
  return path.join(getGlobalDataDir(), 'schemas');
}

/**
 * Gets the project-local schemas directory path.
 * @param projectRoot - The project root directory
 * @returns The path to the project's schemas directory
 */
export function getProjectSchemasDir(projectRoot: string): string {
  return path.join(projectRoot, 'openspec', 'schemas');
}

/**
 * Resolves a schema name to its directory path.
 *
 * Resolution order (when projectRoot is provided):
 * 1. Project-local: <projectRoot>/openspec/schemas/<name>/schema.yaml
 * 2. User override: ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
 * 3. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * When projectRoot is not provided, only user override and package built-in are checked
 * (backward compatible behavior).
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @param projectRoot - Optional project root directory for project-local schema resolution
 * @returns The path to the schema directory, or null if not found
 */
export function getSchemaDir(
  name: string,
  projectRoot?: string
): string | null {
  // 1. Check project-local directory (if projectRoot provided)
  if (projectRoot) {
    const projectDir = path.join(getProjectSchemasDir(projectRoot), name);
    const projectSchemaPath = path.join(projectDir, 'schema.yaml');
    if (fs.existsSync(projectSchemaPath)) {
      return projectDir;
    }
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
 * Resolution order (when projectRoot is provided):
 * 1. Project-local: <projectRoot>/openspec/schemas/<name>/schema.yaml
 * 2. User override: ${XDG_DATA_HOME}/openspec/schemas/<name>/schema.yaml
 * 3. Package built-in: <package>/schemas/<name>/schema.yaml
 *
 * When projectRoot is not provided, only user override and package built-in are checked
 * (backward compatible behavior).
 *
 * @param name - Schema name (e.g., "spec-driven")
 * @param projectRoot - Optional project root directory for project-local schema resolution
 * @returns The resolved schema object
 * @throws Error if schema is not found in any location
 */
export function resolveSchema(name: string, projectRoot?: string): SchemaYaml {
  // Normalize name (remove .yaml extension if provided)
  const normalizedName = name.replace(/\.ya?ml$/, '');

  const schemaDir = getSchemaDir(normalizedName, projectRoot);
  if (!schemaDir) {
    const availableSchemas = listSchemas(projectRoot);
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

  let schema: SchemaYaml;
  try {
    schema = parseSchema(content);
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

  // Resolve inheritance if extends is set
  if (schema.extends) {
    schema = mergeWithParent(schema, projectRoot, schemaPath);
  }

  return schema;
}

/**
 * Merges a child schema with its parent, applying single-level inheritance.
 *
 * Merge rules:
 * - Child artifacts override matching parent artifacts by ID (field-level merge,
 *   child fields take precedence).
 * - Child artifacts with IDs not in the parent are appended after inherited ones.
 * - The child's `apply` section (if present) replaces the parent's entirely.
 * - Only one level of inheritance is supported; the parent must not also extend.
 *
 * @param child - The parsed child schema (with extends set)
 * @param projectRoot - Project root for schema resolution
 * @param childPath - Path to child schema file (for error messages)
 */
function mergeWithParent(
  child: SchemaYaml,
  projectRoot: string | undefined,
  childPath: string
): SchemaYaml {
  const parentName = child.extends!;

  // Load the raw parent schema file to check for transitive extends BEFORE merging.
  // We can't use resolveSchema() here because it flattens extends away — reading
  // the raw file is the only way to catch grandparent chains.
  const parentDir = getSchemaDir(parentName, projectRoot);
  if (!parentDir) {
    const availableSchemas = listSchemas(projectRoot);
    throw new SchemaLoadError(
      `Schema '${child.name}' extends '${parentName}', but '${parentName}' was not found. ` +
        `Available schemas: ${availableSchemas.join(', ')}`,
      childPath
    );
  }

  const parentSchemaPath = path.join(parentDir, 'schema.yaml');
  let rawParentContent: string;
  try {
    rawParentContent = fs.readFileSync(parentSchemaPath, 'utf-8');
  } catch (err) {
    const ioError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Failed to read parent schema at '${parentSchemaPath}': ${ioError.message}`,
      childPath,
      ioError
    );
  }

  // Parse raw parent without inheritance resolution to detect transitive extends
  let rawParent: SchemaYaml;
  try {
    rawParent = parseSchema(rawParentContent);
  } catch (err) {
    const parseError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Parent schema '${parentName}' is invalid: ${parseError.message}`,
      parentSchemaPath,
      parseError
    );
  }

  if (rawParent.extends) {
    throw new SchemaLoadError(
      `Schema '${child.name}' extends '${parentName}', but '${parentName}' also uses extends. ` +
        `Only one level of inheritance is supported.`,
      childPath
    );
  }

  // Merge artifacts: parent as base, child overrides by ID.
  // Child-only artifact IDs are validated against the merged set after this point.
  const mergedArtifacts = rawParent.artifacts.map(parentArtifact => {
    const override = child.artifacts.find(a => a.id === parentArtifact.id);
    // Field-level merge: start with parent, apply only the fields the child explicitly set
    return override ? { ...parentArtifact, ...override } : parentArtifact;
  });

  // Append artifacts defined in child but not present in parent
  const newArtifacts = child.artifacts.filter(
    a => !rawParent.artifacts.find(p => p.id === a.id)
  );

  const merged: SchemaYaml = {
    // Parent fields as base
    ...rawParent,
    // Child top-level fields override (name, version, description)
    ...child,
    // extends is flattened out — the merged result has no extends
    extends: undefined,
    artifacts: [...mergedArtifacts, ...newArtifacts],
    // Child's apply section fully replaces parent's if present
    apply: child.apply ?? rawParent.apply,
  };

  // Re-validate requires references against the full merged artifact set.
  // This is necessary because child artifacts may reference parent-provided IDs.
  const allIds = new Set(merged.artifacts.map(a => a.id));
  for (const artifact of merged.artifacts) {
    for (const req of artifact.requires) {
      if (!allIds.has(req)) {
        throw new SchemaLoadError(
          `Schema '${child.name}': artifact '${artifact.id}' requires '${req}', ` +
            `which does not exist in the merged schema.`,
          childPath
        );
      }
    }
  }

  // Validate there are no cycles in the merged artifact set.
  // Child overrides may change requires, potentially introducing cycles.
  try {
    validateNoCycles(merged.artifacts);
  } catch (err) {
    const cycleError = err instanceof Error ? err : new Error(String(err));
    throw new SchemaLoadError(
      `Schema '${child.name}' (extends '${parentName}'): ${cycleError.message}`,
      childPath,
      cycleError
    );
  }

  return merged;
}

/**
 * Lists all available schema names.
 * Combines project-local, user override, and package built-in schemas.
 *
 * @param projectRoot - Optional project root directory for project-local schema resolution
 */
export function listSchemas(projectRoot?: string): string[] {
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

  // Add project-local schemas (if projectRoot provided)
  if (projectRoot) {
    const projectDir = getProjectSchemasDir(projectRoot);
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
  source: 'project' | 'user' | 'package';
}

/**
 * Lists all available schemas with their descriptions and artifact lists.
 * Useful for agent skills to present schema selection to users.
 *
 * @param projectRoot - Optional project root directory for project-local schema resolution
 */
export function listSchemasWithInfo(projectRoot?: string): SchemaInfo[] {
  const schemas: SchemaInfo[] = [];
  const seenNames = new Set<string>();

  // Add project-local schemas first (highest priority, if projectRoot provided)
  if (projectRoot) {
    const projectDir = getProjectSchemasDir(projectRoot);
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
  }

  // Add user override schemas (if not overridden by project)
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

  // Add package built-in schemas (if not overridden by project or user)
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
