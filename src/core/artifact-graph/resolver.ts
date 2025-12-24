import * as fs from 'node:fs';
import * as path from 'node:path';
import { parse as parseYaml } from 'yaml';
import { getGlobalDataDir } from '../global-config.js';
import { BUILTIN_SCHEMAS } from './builtin-schemas.js';
import type { SchemaYaml } from './types.js';

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

  // 1. Check global user override (returns path if found)
  const globalPath = getGlobalSchemaPath(normalizedName);
  if (globalPath) {
    // User override found - load and parse it
    // Note: This is a raw load, not fully validated. Caller should validate if needed.
    const content = fs.readFileSync(globalPath, 'utf-8');
    return parseYaml(content) as SchemaYaml;
  }

  // 2. Check built-in schemas
  const builtin = BUILTIN_SCHEMAS[normalizedName];
  if (builtin) {
    return builtin;
  }

  throw new Error(
    `Schema '${normalizedName}' not found. Available built-in schemas: ${Object.keys(BUILTIN_SCHEMAS).join(', ')}`
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
