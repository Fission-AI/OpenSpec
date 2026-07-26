import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizeBundlePath } from '../remote-schema/bundle.js';
import { parseSchema } from './schema.js';
import type { SchemaYaml } from './types.js';

export interface SchemaDirectoryOptions {
  expectedName?: string;
  requireTemplatesDirectory?: boolean;
}

export interface ValidatedSchemaDirectory {
  schema: SchemaYaml;
  templatePaths: Record<string, string>;
}

export function validateSchemaDirectory(
  schemaDir: string,
  options: SchemaDirectoryOptions = {}
): ValidatedSchemaDirectory {
  const schemaPath = path.join(schemaDir, 'schema.yaml');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`schema.yaml not found in '${schemaDir}'`);
  }
  const schemaStat = fs.lstatSync(schemaPath);
  if (schemaStat.isSymbolicLink() || !schemaStat.isFile()) {
    throw new Error(`schema.yaml must be a regular file in '${schemaDir}'`);
  }

  const schema = parseSchema(fs.readFileSync(schemaPath, 'utf8'));
  if (options.expectedName !== undefined && schema.name !== options.expectedName) {
    throw new Error(
      `Remote schema bundle was declared as '${options.expectedName}' but schema.yaml name is '${schema.name}'`
    );
  }

  const templatesDir = path.join(schemaDir, 'templates');
  if (options.requireTemplatesDirectory) {
    if (!fs.existsSync(templatesDir)) {
      throw new Error(`templates directory not found in '${schemaDir}'`);
    }
    const templatesStat = fs.lstatSync(templatesDir);
    if (templatesStat.isSymbolicLink() || !templatesStat.isDirectory()) {
      throw new Error(`templates must be a real directory in '${schemaDir}'`);
    }
  }

  const templatePaths: Record<string, string> = {};
  for (const artifact of schema.artifacts) {
    let normalizedTemplate: string;
    try {
      normalizedTemplate = normalizeBundlePath(artifact.template);
    } catch {
      throw new Error(
        `Artifact '${artifact.id}' has unsafe template path '${artifact.template}'`
      );
    }

    const candidates = options.requireTemplatesDirectory
      ? [path.join(templatesDir, ...normalizedTemplate.split('/'))]
      : [
          path.join(templatesDir, ...normalizedTemplate.split('/')),
          path.join(schemaDir, ...normalizedTemplate.split('/')),
        ];
    const templatePath = candidates.find((candidate) => {
      if (!fs.existsSync(candidate)) return false;
      const stat = fs.lstatSync(candidate);
      return stat.isFile() && !stat.isSymbolicLink();
    });
    if (!templatePath) {
      throw new Error(
        `Template file '${artifact.template}' not found for artifact '${artifact.id}'`
      );
    }
    templatePaths[artifact.id] = templatePath;
  }

  return { schema, templatePaths };
}
