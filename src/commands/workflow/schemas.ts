/**
 * Schemas Command
 *
 * Lists available workflow schemas with descriptions.
 */

import chalk from 'chalk';
import { listSchemasWithInfo } from '../../core/artifact-graph/index.js';
import { resolveSchemaConsumerRoot } from '../../core/remote-schema/consumer-root.js';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface SchemasOptions {
  json?: boolean;
}

// -----------------------------------------------------------------------------
// Command Implementation
// -----------------------------------------------------------------------------

export async function schemasCommand(options: SchemasOptions): Promise<void> {
  const projectRoot = resolveSchemaConsumerRoot(process.cwd()) ?? process.cwd();
  const schemas = listSchemasWithInfo(projectRoot);

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
    } else if (schema.source === 'remote') {
      sourceLabel = schema.available === false
        ? chalk.yellow(' (remote, unavailable)')
        : chalk.cyan(' (remote)');
    } else if (schema.source === 'user') {
      sourceLabel = chalk.dim(' (user override)');
    }
    console.log(`  ${chalk.bold(schema.name)}${sourceLabel}`);
    if (schema.available === false) {
      const diagnostic = schema.status?.[0];
      const message = diagnostic
        ? `${diagnostic.code}: ${diagnostic.message}`
        : schema.error ?? 'Remote schema is unavailable';
      console.log(`    ${chalk.yellow(message)}`);
      console.log();
      continue;
    }
    console.log(`    ${schema.description}`);
    console.log(`    Artifacts: ${schema.artifacts.join(' → ')}`);
    console.log();
  }
}
