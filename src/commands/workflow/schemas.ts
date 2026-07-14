/**
 * Schemas Command
 *
 * Lists available workflow schemas with descriptions.
 */

import chalk from 'chalk';
import { listSchemasWithInfo } from '../../core/artifact-graph/index.js';
import { resolveRootForCommand } from '../../core/root-selection.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SchemasOptions {
  json?: boolean;
  store?: string;
  storePath?: string;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function schemasCommand(options: SchemasOptions): Promise<void> {
  // Resolve the OpenSpec root the same way normal commands do, so
  // `--store <id>` lists a store's schemas and a repo's own schemas are
  // still found when no store is selected. The JSON shape stays a bare
  // array (per the agent contract); only which root is read changes.
  const root = await resolveRootForCommand(options, {
    json: options.json,
    failurePayload: {},
  });
  if (!root) {
    return;
  }
  const schemas = listSchemasWithInfo(root.path);

  if (options.json) {
    console.log(JSON.stringify(schemas, null, 2));
    return;
  }

  console.log('Available schemas:');
  console.log();

  for (const schema of schemas) {
    let sourceLabel = '';
    if (schema.source === 'project') {
      sourceLabel = chalk.cyan(' (project)');
    } else if (schema.source === 'store') {
      sourceLabel = chalk.cyan(` (from store '${schema.store}')`);
    } else if (schema.source === 'user') {
      sourceLabel = chalk.dim(' (user override)');
    }
    console.log(`  ${chalk.bold(schema.name)}${sourceLabel}`);
    console.log(`    ${schema.description}`);
    console.log(`    Artifacts: ${schema.artifacts.join(' → ')}`);
    console.log();
  }
}
