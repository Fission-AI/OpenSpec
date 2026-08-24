import * as fs from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { SchemaYamlSchema, type SchemaYaml, type Artifact } from './types.js';

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export interface SchemaIssue {
  path: string;
  message: string;
}

export interface SchemaInspection {
  schema?: SchemaYaml;
  issues: SchemaIssue[];
  parseError?: Error;
}

/**
 * Loads and validates an artifact schema from a YAML file.
 */
export function loadSchema(filePath: string): SchemaYaml {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parseSchema(content);
}

/**
 * Parses and validates an artifact schema from YAML content.
 */
export function parseSchema(yamlContent: string): SchemaYaml {
  const inspection = inspectSchema(yamlContent);
  if (inspection.parseError) {
    throw inspection.parseError;
  }
  if (!inspection.schema || inspection.issues.length > 0) {
    throw new SchemaValidationError(
      inspection.issues.map((issue) => issue.message).join(', ')
    );
  }
  return inspection.schema;
}

/**
 * Parse a schema and collect independent validation failures for diagnostic
 * commands. Callers that need fail-fast behavior should use parseSchema().
 */
export function inspectSchema(yamlContent: string): SchemaInspection {
  let parsed: unknown;
  try {
    parsed = parseYaml(yamlContent);
  } catch (error) {
    const parseError = error instanceof Error ? error : new Error(String(error));
    return {
      issues: [{
        path: 'schema.yaml',
        message: `Invalid schema YAML: ${parseError.message}`,
      }],
      parseError,
    };
  }

  const result = SchemaYamlSchema.safeParse(parsed);
  if (!result.success) {
    return {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.length > 0 ? `schema.yaml:${issue.path.join('.')}` : 'schema.yaml',
        message: `Invalid schema: ${issue.path.join('.')}: ${issue.message}`,
      })),
    };
  }

  const schema = result.data;
  const issues: SchemaIssue[] = [];

  const duplicateIds = findDuplicateIds(schema.artifacts);
  for (const id of duplicateIds) {
    issues.push({
      path: 'schema.yaml',
      message: `Duplicate artifact ID: ${id}`,
    });
  }

  const invalidReferences = findInvalidRequiresReferences(schema.artifacts);
  for (const { artifactId, requiredId } of invalidReferences) {
    issues.push({
      path: 'schema.yaml',
      message: `Invalid dependency reference in artifact '${artifactId}': '${requiredId}' does not exist`,
    });
  }

  if (duplicateIds.length === 0 && invalidReferences.length === 0) {
    const cycle = findCycle(schema.artifacts);
    if (cycle) {
      issues.push({
        path: 'schema.yaml',
        message: `Cyclic dependency detected: ${cycle}`,
      });
    }
  }

  return { schema, issues };
}

/**
 * Validates that there are no duplicate artifact IDs.
 */
function findDuplicateIds(artifacts: Artifact[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const artifact of artifacts) {
    if (seen.has(artifact.id)) {
      duplicates.add(artifact.id);
    }
    seen.add(artifact.id);
  }
  return [...duplicates];
}

/**
 * Validates that all `requires` references point to valid artifact IDs.
 */
function findInvalidRequiresReferences(
  artifacts: Artifact[]
): Array<{ artifactId: string; requiredId: string }> {
  const validIds = new Set(artifacts.map(a => a.id));
  const invalid: Array<{ artifactId: string; requiredId: string }> = [];

  for (const artifact of artifacts) {
    for (const req of artifact.requires) {
      if (!validIds.has(req)) {
        invalid.push({ artifactId: artifact.id, requiredId: req });
      }
    }
  }
  return invalid;
}

/**
 * Validates that there are no cyclic dependencies.
 * Uses DFS to detect cycles and reports the full cycle path.
 */
function findCycle(artifacts: Artifact[]): string | null {
  const artifactMap = new Map(artifacts.map(a => [a.id, a]));
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const parent = new Map<string, string>();

  function dfs(id: string): string | null {
    visited.add(id);
    inStack.add(id);

    const artifact = artifactMap.get(id);
    if (!artifact) return null;

    for (const dep of artifact.requires) {
      if (!visited.has(dep)) {
        parent.set(dep, id);
        const cycle = dfs(dep);
        if (cycle) return cycle;
      } else if (inStack.has(dep)) {
        // Found a cycle - reconstruct the path
        const cyclePath = [dep];
        let current = id;
        while (current !== dep) {
          cyclePath.unshift(current);
          current = parent.get(current)!;
        }
        cyclePath.unshift(dep);
        return cyclePath.join(' → ');
      }
    }

    inStack.delete(id);
    return null;
  }

  for (const artifact of artifacts) {
    if (!visited.has(artifact.id)) {
      const cycle = dfs(artifact.id);
      if (cycle) {
        return cycle;
      }
    }
  }
  return null;
}
