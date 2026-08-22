import * as fs from 'node:fs';
import { parse as parseYaml } from 'yaml';
import {
  SchemaOverrideYamlSchema,
  SchemaYamlSchema,
  type Artifact,
  type SchemaOverrideYaml,
  type SchemaYaml,
  type StringCollectionOverride,
  type TextOverrideOperation,
} from './types.js';

export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaValidationError';
  }
}

export class SchemaOverrideValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SchemaOverrideValidationError';
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

  return validateSchemaValue(parsed);
}

/** Validates an already-parsed schema value and its dependency graph. */
export function validateSchemaValue(value: unknown): SchemaYaml {
  const result = SchemaYamlSchema.safeParse(value);

  if (!result.success) {
    const errors = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
    throw new SchemaValidationError(`Invalid schema: ${errors}`);
  }

  const schema = result.data;

  // Check for duplicate artifact IDs
  validateNoDuplicateIds(schema.artifacts);

  // Check that all requires references are valid
  validateRequiresReferences(schema.artifacts, schema.apply?.requires);

  // Check for cycles
  validateNoCycles(schema.artifacts);

  return schema;
}

/** Parses and validates a layered user schema override. */
export function parseSchemaOverride(yamlContent: string): SchemaOverrideYaml {
  const parsed = parseYaml(yamlContent);
  const result = SchemaOverrideYamlSchema.safeParse(parsed);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ');
    throw new SchemaOverrideValidationError(`Invalid schema override: ${errors}`);
  }
  return result.data;
}

/** Removes blank boundary lines while preserving the content and indentation inside a segment. */
function normalizeTextSegment(segment: string | undefined): string | undefined {
  if (segment === undefined) return undefined;

  const lines = segment.split(/\r?\n/u);
  while (lines.length > 0 && lines[0].trim().length === 0) lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim().length === 0) lines.pop();

  const normalized = lines.join('\n');
  return normalized.trim().length > 0 ? normalized : undefined;
}

/** Applies one explicit instruction-text operation to an optional base value. */
function applyTextOverride(
  base: string | undefined,
  operation: TextOverrideOperation
): string | undefined {
  if (operation.replace !== undefined) {
    return operation.replace;
  }

  const segments = [operation.prepend, base, operation.append]
    .map(normalizeTextSegment)
    .filter((segment): segment is string => segment !== undefined);
  return segments.length > 0 ? segments.join('\n\n') : undefined;
}

/** Applies a deterministic replace or remove-then-add operation to a string collection. */
function applyCollectionOverride(
  base: string[],
  operation: StringCollectionOverride,
  fieldPath: string
): string[] {
  if (operation.replace) {
    return [...operation.replace];
  }

  const result = [...base];
  for (const value of operation.remove ?? []) {
    const index = result.indexOf(value);
    if (index === -1) {
      throw new SchemaOverrideValidationError(
        `${fieldPath}.remove cannot remove '${value}' because it is not present in the base value`
      );
    }
    result.splice(index, 1);
  }
  for (const value of operation.add ?? []) {
    if (result.includes(value)) {
      throw new SchemaOverrideValidationError(
        `${fieldPath}.add cannot add duplicate value '${value}'`
      );
    }
    result.push(value);
  }
  return result;
}

/** Applies a validated user override and validates the complete effective schema. */
export function applySchemaOverride(
  base: SchemaYaml,
  override: SchemaOverrideYaml
): SchemaYaml {
  const artifacts = base.artifacts.map((artifact) => ({
    ...artifact,
    requires: [...artifact.requires],
  }));
  const artifactsById = new Map(artifacts.map((artifact) => [artifact.id, artifact]));

  for (const [artifactId, patch] of Object.entries(override.artifacts ?? {})) {
    const artifact = artifactsById.get(artifactId);
    if (!artifact) {
      throw new SchemaOverrideValidationError(
        `artifacts.${artifactId}: unknown artifact ID in packaged schema '${base.name}'`
      );
    }

    if (patch.generates !== undefined) artifact.generates = patch.generates;
    if (patch.description !== undefined) artifact.description = patch.description;
    if (patch.template !== undefined) artifact.template = patch.template;
    if (patch.instruction !== undefined) {
      artifact.instruction = applyTextOverride(artifact.instruction, patch.instruction);
    }
    if (patch.requires !== undefined) {
      artifact.requires = applyCollectionOverride(
        artifact.requires,
        patch.requires,
        `artifacts.${artifactId}.requires`
      );
    }
  }

  let apply = base.apply
    ? { ...base.apply, requires: [...base.apply.requires] }
    : undefined;
  if (override.apply) {
    apply ??= { requires: [] };
    if (override.apply.requires !== undefined) {
      apply.requires = applyCollectionOverride(
        apply.requires,
        override.apply.requires,
        'apply.requires'
      );
    }
    if (override.apply.tracks !== undefined) {
      apply.tracks = override.apply.tracks;
    }
    if (override.apply.instruction !== undefined) {
      apply.instruction = applyTextOverride(
        apply.instruction,
        override.apply.instruction
      );
    }
  }

  const effective = {
    ...base,
    description: override.description ?? base.description,
    artifacts,
    ...(apply ? { apply } : {}),
  };

  try {
    return validateSchemaValue(effective);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new SchemaOverrideValidationError(
      `Effective schema is invalid after applying override: ${detail}`
    );
  }
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
function validateRequiresReferences(
  artifacts: Artifact[],
  applyRequires: string[] = []
): void {
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

  for (const req of applyRequires) {
    if (!validIds.has(req)) {
      throw new SchemaValidationError(
        `Invalid dependency reference in apply: '${req}' does not exist`
      );
    }
  }
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
