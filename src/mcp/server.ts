/**
 * MCP Server initialization and transport handling.
 *
 * This module creates and configures the MCP server instance,
 * registers all resources/tools/prompts, and manages the stdio transport.
 */

import { createRequire } from 'module';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { resolveOpenSpecPaths } from './utils/path-resolver.js';
import { registerAllResources } from './resources/index.js';
import { registerAllTools } from './tools/index.js';
import { registerAllPrompts } from './prompts/index.js';

const require = createRequire(import.meta.url);
const { version } = require('../../package.json');

export interface McpServerOptions {
  /** Enable debug logging to stderr */
  debug: boolean;
}

/**
 * Start the OpenSpec MCP server on stdio transport.
 *
 * The server exposes OpenSpec resources (specs, changes, project context),
 * tools (init, list, show, validate, archive, update_project_context),
 * and prompts (propose, apply, archive workflows).
 */
export async function startMcpServer(options: McpServerOptions): Promise<void> {
  const pathConfig = resolveOpenSpecPaths();

  if (options.debug) {
    console.error('[openspec-mcp] Path configuration:', JSON.stringify(pathConfig, null, 2));
  }

  const server = new McpServer({
    name: 'openspec',
    version,
  });

  registerAllResources(server, pathConfig);
  registerAllTools(server, pathConfig);
  registerAllPrompts(server, pathConfig);

  const transport = new StdioServerTransport();

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });

  try {
    if (options.debug) {
      console.error('[openspec-mcp] Starting server on stdio...');
    }
    await server.connect(transport);
    if (options.debug) {
      console.error('[openspec-mcp] Server started');
    }
  } catch (error) {
    console.error('[openspec-mcp] Failed to start:', error);
    process.exit(1);
  }
}
