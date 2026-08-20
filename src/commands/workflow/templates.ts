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
import { FileSystemUtils } from '../../utils/file-system.js';
import { validateSchemaExists, DEFAULT_SCHEMA } from './shared.js';
import { resolveRootForCommand } from '../../core/root-selection.js';

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
  source: 'project' | 'store' | 'user' | 'package';
  storeId?: string;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function templatesCommand(options: TemplatesOptions): Promise<void> {
  const spinner = options.json ? undefined : ora('Loading templates...').start();

  try {
    const root = await resolveRootForCommand({}, { json: options.json });
    if (!root) {
      spinner?.stop();
      return;
    }
    const schemaName = validateSchemaExists(
      options.schema ?? DEFAULT_SCHEMA,
      root.schemaContext
    );
    const schema = resolveSchema(schemaName, root.schemaContext);
    const graph = ArtifactGraph.fromSchema(schema);
    const schemaDir = getSchemaDir(schemaName, root.schemaContext)!;

    // Determine the source (project, user, or package)
    const {
      getUserSchemasDir,
      getProjectSchemasDir,
    } = await import('../../core/artifact-graph/resolver.js');
    const projectSchemasDir = getProjectSchemasDir(root.schemaContext.root);
    const userSchemasDir = getUserSchemasDir();

    // Determine source by checking if schemaDir is inside each base directory
    // Using path.relative is more robust than startsWith for path comparisons
    const isInsideDir = (child: string, parent: string): boolean => {
      const relative = path.relative(parent, child);
      return !relative.startsWith('..') && !path.isAbsolute(relative);
    };

    let source: 'project' | 'store' | 'user' | 'package';
    if (isInsideDir(schemaDir, projectSchemasDir)) {
      source = root.schemaContext.source;
    } else if (isInsideDir(schemaDir, userSchemasDir)) {
      source = 'user';
    } else {
      source = 'package';
    }

    const templatesDir = path.join(schemaDir, 'templates');
    const templates: TemplateInfo[] = graph.getAllArtifacts().map((artifact) => {
      const templatePath = path.join(templatesDir, artifact.template);
      try {
        FileSystemUtils.assertPathWithin(templatesDir, templatePath);
        return {
          artifactId: artifact.id,
          templatePath: FileSystemUtils.canonicalizeExistingPath(templatePath),
          source,
          ...(source === 'store' && root.schemaContext.storeId
            ? { storeId: root.schemaContext.storeId }
            : {}),
        };
      } catch {
        throw new Error(
          `Template '${artifact.template}' for artifact '${artifact.id}' points outside the schema templates directory`
        );
      }
    });

    spinner?.stop();

    if (options.json) {
      const output: Record<
        string,
        { path: string; source: string; storeId?: string }
      > = {};
      for (const t of templates) {
        output[t.artifactId] = {
          path: t.templatePath,
          source: t.source,
          ...(t.storeId ? { storeId: t.storeId } : {}),
        };
      }
      console.log(JSON.stringify(output, null, 2));
      return;
    }

    console.log(`Schema: ${schemaName}`);
    console.log(
      `Source: ${source === 'store' ? `Store (${root.schemaContext.storeId})` : source}`
    );
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
