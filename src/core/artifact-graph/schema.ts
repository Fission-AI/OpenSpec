import * as fs from 'node:fs';
import { parse as parseYaml } from 'yaml';
import { SchemaYamlSchema, type SchemaYaml, type Artifact } from './types.js';

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
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
  const parsed = parseYaml(yamlContent);

  // Validate with Zod
  const result = SchemaYamlSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new SchemaValidationError(`Invalid schema: ${errors}`);
  }

  const schema = result.data;

  // Check for duplicate artifact IDs
  validateNoDuplicateIds(schema.artifacts);

  // Check that all requires references are valid
  validateRequiresReferences(schema.artifacts);

  // Check that the apply phase names artifacts this schema declares
  validateApplyReferences(schema);

  // Check for cycles
  validateNoCycles(schema.artifacts);

  return schema;
}

/**
 * Validates that there are no duplicate artifact IDs.
 */
function validateNoDuplicateIds(artifacts: Artifact[]): void {
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (seen.has(artifact.id)) {
      throw new SchemaValidationError(`Duplicate artifact ID: ${artifact.id}`);
    }
    seen.add(artifact.id);
  }
}

/**
 * Validates that all `requires` references point to valid artifact IDs.
 */
function validateRequiresReferences(artifacts: Artifact[]): void {
  const validIds = new Set(artifacts.map(a => a.id));

  for (const artifact of artifacts) {
    for (const req of artifact.requires) {
      if (!validIds.has(req)) {
        throw new SchemaValidationError(
          `Invalid dependency reference in artifact '${artifact.id}': '${req}' does not exist`
        );
      }
    }
  }
}

/**
 * Validates that every `apply.requires` id is an artifact the schema declares.
 *
 * Apply skips an id that no artifact declares, so a typo silently dropped that
 * artifact from the apply gate. An unknown artifact `requires` is already a
 * load error, and this is the same kind of reference.
 *
 * `apply.tracks` is deliberately not checked here. It is a path, not an id:
 * apply reads it as written, so a schema whose `tracks` value does not exactly
 * match any `generates` value (a hand-written `TODO.md`, or `tasks/main.md`
 * under a glob `generates: tasks/*.md` that really does produce it) works
 * today, and failing the load would break every command on it.
 * `openspec schema validate` reports that case as a warning instead
 * (see `findApplyTracksWarning`).
 */
function validateApplyReferences(schema: SchemaYaml): void {
  const apply = schema.apply;
  if (!apply) return;

  const validIds = schema.artifacts.map(a => a.id);
  for (const req of apply.requires) {
    if (!validIds.includes(req)) {
      throw new SchemaValidationError(
        `Invalid apply.requires reference: '${req}' does not exist (artifacts: ${validIds.join(', ')})`
      );
    }
  }
}

/**
 * Describes an `apply.tracks` value that is not exactly equal to any artifact's
 * `generates` value, or returns undefined when there is nothing to report.
 *
 * The tracked-tasks lookups select the artifact whose `generates` string equals
 * `tracks`, so this is a progress-discovery problem, not a claim that nothing
 * produces the file: a glob `generates: tasks/*.md` really does generate
 * `tracks: tasks/main.md`, yet the strings differ, so the lookup still misses.
 * Either way apply keeps working (it reads the path directly), but `openspec
 * list` and `openspec status` fall back to counting the top-level `tasks.md`,
 * and apply's remedy cannot name an artifact to build. A typo such as
 * `task.md` is the other usual cause.
 */
export function findApplyTracksWarning(schema: SchemaYaml): string | undefined {
  const tracks = schema.apply?.tracks;
  if (tracks == null || schema.artifacts.some(a => a.generates === tracks)) return undefined;
  return (
    `apply.tracks '${tracks}' does not exactly match any artifact's generates value ` +
    `(generates: ${schema.artifacts.map(a => a.generates).join(', ')}), ` +
    `so OpenSpec cannot tell which artifact's progress it tracks. ` +
    `Apply still reads that file as written, but list and status count tasks.md instead. ` +
    `Make apply.tracks exactly equal one of those generates values, ` +
    `or confirm that file is maintained outside the artifact graph.`
  );
}

/**
 * Validates that there are no cyclic dependencies.
 * Uses DFS to detect cycles and reports the full cycle path.
 */
function validateNoCycles(artifacts: Artifact[]): void {
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
        throw new SchemaValidationError(`Cyclic dependency detected: ${cycle}`);
      }
    }
  }
}
