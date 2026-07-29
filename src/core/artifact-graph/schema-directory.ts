import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeBundlePath } from '../remote-schema/bundle.js';
import { inspectSchema } from './schema.js';
import type { SchemaYaml } from './types.js';

export interface SchemaDirectoryOptions {
  expectedName?: string;
  requireTemplatesDirectory?: boolean;
}

export interface ValidatedSchemaDirectory {
  schema: SchemaYaml;
  templatePaths: Record<string, string>;
}

export interface SchemaDirectoryIssue {
  path: string;
  message: string;
}

export interface InspectedSchemaDirectory {
  schema?: SchemaYaml;
  templatePaths: Record<string, string>;
  issues: SchemaDirectoryIssue[];
}

export class SchemaDirectoryValidationError extends Error {
  constructor(public readonly issues: SchemaDirectoryIssue[]) {
    super(
      issues.map((issue) => issue.message).join('; ') || 'Schema validation failed'
    );
    this.name = 'SchemaDirectoryValidationError';
  }
}

export function validateSchemaDirectory(
  schemaDir: string,
  options: SchemaDirectoryOptions = {}
): ValidatedSchemaDirectory {
  return options.expectedName !== undefined || options.requireTemplatesDirectory
    ? validateRemoteSchemaDirectory(
        schemaDir,
        options.expectedName
      )
    : validateLocalSchemaDirectory(schemaDir);
}

function validatedResult(
  inspection: InspectedSchemaDirectory
): ValidatedSchemaDirectory {
  if (!inspection.schema || inspection.issues.length > 0) {
    throw new SchemaDirectoryValidationError(inspection.issues);
  }
  return {
    schema: inspection.schema,
    templatePaths: inspection.templatePaths,
  };
}

export function validateLocalSchemaDirectory(
  schemaDir: string
): ValidatedSchemaDirectory {
  return validatedResult(inspectLocalSchemaDirectory(schemaDir));
}

export function validateRemoteSchemaDirectory(
  schemaDir: string,
  expectedName?: string
): ValidatedSchemaDirectory {
  return validatedResult(inspectRemoteSchemaDirectory(schemaDir, expectedName));
}

export function inspectSchemaDirectory(
  schemaDir: string,
  options: SchemaDirectoryOptions = {}
): InspectedSchemaDirectory {
  return options.expectedName !== undefined || options.requireTemplatesDirectory
    ? inspectRemoteSchemaDirectory(schemaDir, options.expectedName)
    : inspectLocalSchemaDirectory(schemaDir);
}

export function inspectLocalSchemaDirectory(
  schemaDir: string
): InspectedSchemaDirectory {
  return inspectSchemaDirectoryWithMode(schemaDir, 'legacy-local');
}

export function inspectRemoteSchemaDirectory(
  schemaDir: string,
  expectedName?: string
): InspectedSchemaDirectory {
  return inspectSchemaDirectoryWithMode(schemaDir, 'remote-bundle', expectedName);
}

function inspectSchemaDirectoryWithMode(
  schemaDir: string,
  mode: 'legacy-local' | 'remote-bundle',
  expectedName?: string
): InspectedSchemaDirectory {
  const issues: SchemaDirectoryIssue[] = [];
  const templatePaths: Record<string, string> = {};
  const schemaPath = path.join(schemaDir, 'schema.yaml');
  if (!fs.existsSync(schemaPath)) {
    return {
      templatePaths,
      issues: [{ path: 'schema.yaml', message: `schema.yaml not found in '${schemaDir}'` }],
    };
  }
  if (mode === 'remote-bundle') {
    const schemaStat = fs.lstatSync(schemaPath);
    if (schemaStat.isSymbolicLink() || !schemaStat.isFile()) {
      return {
        templatePaths,
        issues: [{
          path: 'schema.yaml',
          message: `schema.yaml must be a regular file in '${schemaDir}'`,
        }],
      };
    }
  }

  const schemaInspection = inspectSchema(fs.readFileSync(schemaPath, 'utf8'));
  issues.push(...schemaInspection.issues);
  const schema = schemaInspection.schema;
  if (!schema) {
    return { templatePaths, issues };
  }
  if (expectedName !== undefined && schema.name !== expectedName) {
    issues.push({
      path: 'schema.yaml',
      message: `Remote schema bundle was declared as '${expectedName}' but schema.yaml name is '${schema.name}'`,
    });
  }

  const templatesDir = path.join(schemaDir, 'templates');
  if (mode === 'remote-bundle') {
    if (!fs.existsSync(templatesDir)) {
      issues.push({
        path: 'templates',
        message: `templates directory not found in '${schemaDir}'`,
      });
    } else {
      const templatesStat = fs.lstatSync(templatesDir);
      if (templatesStat.isSymbolicLink() || !templatesStat.isDirectory()) {
        issues.push({
          path: 'templates',
          message: `templates must be a real directory in '${schemaDir}'`,
        });
      }
    }
  }

  for (const artifact of schema.artifacts) {
    let normalizedTemplate = artifact.template;
    if (mode === 'remote-bundle') {
      try {
        normalizedTemplate = normalizeBundlePath(artifact.template);
      } catch {
        issues.push({
          path: `schema.yaml:artifacts.${artifact.id}.template`,
          message: `Artifact '${artifact.id}' has unsafe template path '${artifact.template}'`,
        });
        continue;
      }
    }

    const templateSegments =
      mode === 'remote-bundle'
        ? normalizedTemplate.split('/')
        : [artifact.template];
    const candidates = mode === 'remote-bundle'
      ? [path.join(templatesDir, ...templateSegments)]
      : [
          path.join(templatesDir, artifact.template),
          path.join(schemaDir, artifact.template),
        ];
    const templatePath = candidates.find((candidate) => {
      if (!fs.existsSync(candidate)) return false;
      if (mode === 'legacy-local') return true;
      const stat = fs.lstatSync(candidate);
      return stat.isFile() && !stat.isSymbolicLink();
    });
    if (!templatePath) {
      issues.push({
        path: `templates/${normalizedTemplate}`,
        message: `Template file '${artifact.template}' not found for artifact '${artifact.id}'`,
      });
      continue;
    }
    templatePaths[artifact.id] = templatePath;
  }

  return { schema, templatePaths, issues };
}
