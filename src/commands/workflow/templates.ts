/**
 * Templates Command
 *
 * Shows resolved template paths for all artifacts in a schema.
 */

import ora from 'ora';
import path from 'path';
import {
  resolveSchema,
  getSchemaDir,
  ArtifactGraph,
} from '../../core/artifact-graph/index.js';
import { validateSchemaExists, DEFAULT_SCHEMA } from './shared.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface TemplatesOptions {
  schema?: string;
  json?: boolean;
}

export interface TemplateInfo {
  artifactId: string;
  templatePath: string;
  source: 'project' | 'user' | 'package';
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function templatesCommand(options: TemplatesOptions): Promise<void> {
  const spinner = ora('Loading templates...').start();

  try {
    const projectRoot = process.cwd();
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA, projectRoot);
    const schema = resolveSchema(schemaName, projectRoot);
    const graph = ArtifactGraph.fromSchema(schema);
    const schemaDir = getSchemaDir(schemaName, projectRoot)!;

    // Determine the source (project, user, or package)
    const {
      getUserSchemasDir,
      getProjectSchemasDir,
    } = await import('../../core/artifact-graph/resolver.js');
    const projectSchemasDir = getProjectSchemasDir(projectRoot);
    const userSchemasDir = getUserSchemasDir();

    // Determine source by checking if schemaDir is inside each base directory
    // Using path.relative is more robust than startsWith for path comparisons
    const isInsideDir = (child: string, parent: string): boolean => {
      const relative = path.relative(parent, child);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    };

    let source: 'project' | 'user' | 'package';
    if (isInsideDir(schemaDir, projectSchemasDir)) {
      source = 'project';
    } else if (isInsideDir(schemaDir, userSchemasDir)) {
      source = 'user';
    } else {
      source = 'package';
    }

    const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => ({
      artifactId: artifact.id,
      templatePath: path.join(schemaDir, 'templates', artifact.template),
      source,
    }));

    spinner.stop();

    if (options.json) {
      const output: Record<string, { path: string; source: string }> = {};
      for (const t of templates) {
        output[t.artifactId] = { path: t.templatePath, source: t.source };
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(`Schema: ${schemaName}`);
    console.log(`Source: ${source}`);
    console.log();

    for (const t of templates) {
      console.log(`${t.artifactId}:`);
      console.log(`  ${t.templatePath}`);
    }
  } catch (error) {
    spinner.stop();
    throw error;
  }
}
