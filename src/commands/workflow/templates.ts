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
  listSchemasWithInfo,
  ArtifactGraph,
} from '../../core/artifact-graph/index.js';
import { resolveSchemaConsumerRoot } from '../../core/remote-schema/consumer-root.js';
import { FileSystemUtils } from '../../utils/file-system.js';
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
  source: 'project' | 'remote' | 'user' | 'package';
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function templatesCommand(options: TemplatesOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Loading templates...').start();

  try {
    const projectRoot = resolveSchemaConsumerRoot(process.cwd()) ?? process.cwd();
    const schemaName = validateSchemaExists(options.schema ?? DEFAULT_SCHEMA, projectRoot);
    const schema = resolveSchema(schemaName, projectRoot);
    const graph = ArtifactGraph.fromSchema(schema);
    const schemaDir = getSchemaDir(schemaName, projectRoot)!;

    const source =
      listSchemasWithInfo(projectRoot).find(
        (schemaInfo) => schemaInfo.name === schemaName
      )?.source ?? 'package';

    const templatesDir = path.join(schemaDir, 'templates');
    const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => {
      const templatePath = path.join(templatesDir, artifact.template);
      try {
        FileSystemUtils.assertPathWithin(templatesDir, templatePath);
        return {
          artifactId: artifact.id,
          templatePath: FileSystemUtils.canonicalizeExistingPath(templatePath),
          source,
        };
      } catch {
        throw new Error(
          `Template '${artifact.template}' for artifact '${artifact.id}' points outside the schema templates directory`
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
    console.log(`Source: ${source}`);
    console.log();

    for (const t of templates) {
      console.log(`${t.artifactId}:`);
      console.log(`  ${t.templatePath}`);
    }
  } catch (error) {
    spinner?.stop();
    throw error;
  }
}
