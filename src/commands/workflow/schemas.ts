/**
 * Schemas 命令
 *
 * 列出可用的工作流 schema 及其描述。
 */

import chalk from 'chalk';
import { listSchemasWithInfo } from '../../core/artifact-graph/index.js';
import { resolveRootForCommand } from '../../core/root-selection.js';

// -----------------------------------------------------------------------------
// 类型
// -----------------------------------------------------------------------------

export interface SchemasOptions {
  json?: boolean;
  store?: string;
  storePath?: string;
}

// -----------------------------------------------------------------------------
// 命令实现
// -----------------------------------------------------------------------------

export async function schemasCommand(options: SchemasOptions): Promise<void> {
  const root = await resolveRootForCommand(options, {
    json: options.json,
    failurePayload: { schemas: [], root: null },
  });
  if (!root) {
    return;
  }

  const schemas = listSchemasWithInfo(root.path);

  if (options.json) {
    console.log(JSON.stringify(schemas, null, 2));
    return;
  }

  console.log('可用的 schema：');
  console.log();

  for (const schema of schemas) {
    let sourceLabel = '';
    if (schema.source === 'project') {
      sourceLabel = chalk.cyan(' (项目)');
    } else if (schema.source === 'user') {
      sourceLabel = chalk.dim(' (用户覆盖)');
    }
    console.log(`  ${chalk.bold(schema.name)}${sourceLabel}`);
    console.log(`    ${schema.description}`);
    console.log(`    制品：${schema.artifacts.join(' → ')}`);
    console.log();
  }
}