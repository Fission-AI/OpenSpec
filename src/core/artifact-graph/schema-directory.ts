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

export function validateSchemaDirectory(
  schemaDir: string,
  options: SchemaDirectoryOptions = {}
): ValidatedSchemaDirectory {
  const inspection = inspectSchemaDirectory(schemaDir, options);
  if (!inspection.schema || inspection.issues.length > 0) {
    throw new Error(inspection.issues[0]?.message ?? 'Schema validation failed');
  }
  return {
    schema: inspection.schema,
    templatePaths: inspection.templatePaths,
  };
}

export function inspectSchemaDirectory(
  schemaDir: string,
  options: SchemaDirectoryOptions = {}
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

  const schemaInspection = inspectSchema(fs.readFileSync(schemaPath, 'utf8'));
  issues.push(...schemaInspection.issues);
  const schema = schemaInspection.schema;
  if (!schema) {
    return { templatePaths, issues };
  }
  if (options.expectedName !== undefined && schema.name !== options.expectedName) {
    issues.push({
      path: 'schema.yaml',
      message: `Remote schema bundle was declared as '${options.expectedName}' but schema.yaml name is '${schema.name}'`,
    });
  }

  const templatesDir = path.join(schemaDir, 'templates');
  if (options.requireTemplatesDirectory) {
    if (!fs.existsSync(templatesDir)) {
      issues.push({
        path: 'templates',
        message: `templates directory not found in '${schemaDir}'`,
      });
      return { schema, templatePaths, issues };
    }
    const templatesStat = fs.lstatSync(templatesDir);
    if (templatesStat.isSymbolicLink() || !templatesStat.isDirectory()) {
      issues.push({
        path: 'templates',
        message: `templates must be a real directory in '${schemaDir}'`,
      });
      return { schema, templatePaths, issues };
    }
  }

  for (const artifact of schema.artifacts) {
    let normalizedTemplate: string;
    try {
      normalizedTemplate = normalizeBundlePath(artifact.template);
    } catch {
      issues.push({
        path: `schema.yaml:artifacts.${artifact.id}.template`,
        message: `Artifact '${artifact.id}' has unsafe template path '${artifact.template}'`,
      });
      continue;
    }

    const templateSegments = normalizedTemplate.split('/');
    const candidates = options.requireTemplatesDirectory
      ? [path.join(templatesDir, ...templateSegments)]
      : [
          path.join(templatesDir, ...templateSegments),
          path.join(schemaDir, ...templateSegments),
        ];
    const templatePath = candidates.find((candidate) => {
      if (!fs.existsSync(candidate)) return false;
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
