/**
 * Templates Command
 *
 * Shows resolved template paths for all artifacts in a schema.
 */

import ora from 'ora';
import {
  resolveSchema,
  resolveSchemaSources,
  resolveSchemaTemplate,
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
  const spinner = options.json ? undefined : ora('Loading templates...').start();

  try {
    const projectRoot = process.cwd();
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA, projectRoot);
    const schema = resolveSchema(schemaName, projectRoot);
    const graph = ArtifactGraph.fromSchema(schema);
    const sources = resolveSchemaSources(schemaName, projectRoot)!;
    const source = sources.base.source;
    const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => {
      try {
        const resolution = resolveSchemaTemplate(
          schemaName,
          artifact.template,
          projectRoot
        );
        return {
          artifactId: artifact.id,
          templatePath: resolution.path,
          source: resolution.source,
        };
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(
          `Template '${artifact.template}' for artifact '${artifact.id}' could not be resolved: ${detail}`
        );
      }
    });

    spinner?.stop();

    if (options.json) {
      const output: Record<string, { path: string; source: string }> = {};
      for (const t of templates) {
        output[t.artifactId] = { path: t.templatePath, source: t.source };
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(`Schema: ${schemaName}`);
    console.log(`Source: ${sources.overlay ? 'package + user overlay' : source}`);
    console.log();

    for (const t of templates) {
      console.log(`${t.artifactId}:`);
      console.log(`  Path: ${t.templatePath}`);
      console.log(`  Source: ${t.source}`);
    }
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}
