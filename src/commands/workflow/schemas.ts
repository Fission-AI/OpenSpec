/**
 * Schemas Command
 *
 * Lists available workflow schemas with descriptions.
 */

import chalk from 'chalk';
import { listSchemasWithInfo } from '../../core/artifact-graph/index.js';
import { WORKFLOW_MESSAGES } from '../../messages/index.js';

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
  const projectRoot = process.cwd();
  const schemas = listSchemasWithInfo(projectRoot);

  if (options.json) {
    console.log(JSON.stringify(schemas, null, 2));
    return;
  }

  console.log(WORKFLOW_MESSAGES.availableSchemas);
  console.log();

  for (const schema of schemas) {
    let sourceLabel = '';
    if (schema.source === 'project') {
      sourceLabel = chalk.cyan(WORKFLOW_MESSAGES.projectLabel);
    } else if (schema.source === 'user') {
      sourceLabel = chalk.dim(WORKFLOW_MESSAGES.userOverrideLabel);
    }
    console.log(`  ${chalk.bold(schema.name)}${sourceLabel}`);
    console.log(`    ${schema.description}`);
    console.log(`    ${WORKFLOW_MESSAGES.artifactsLabel(schema.artifacts.join(' → '))}`);
    console.log();
  }
}
