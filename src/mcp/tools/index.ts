/**
 * MCP Tools registration.
 *
 * Tools provide actions that map to OpenSpec CLI commands:
 * - init: Initialize OpenSpec in project
 * - list: List changes or specs
 * - show: Show a change or spec
 * - validate: Validate changes and specs
 * - archive: Archive completed change
 * - update_project_context: Update project.md
 * - edit: Create/update change proposal resources
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { registerInitTool } from './init.js';
import { registerListTool } from './list.js';
import { registerShowTool } from './show.js';
import { registerValidateTool } from './validate.js';
import { registerArchiveTool } from './archive.js';
import { registerProjectContextTool } from './project-context.js';
import { registerEditTool } from './edit.js';

/**
 * Register all OpenSpec tools with the MCP server.
 */
export function registerAllTools(
  server: McpServer,
  pathConfig: PathConfig
): void {
  registerInitTool(server, pathConfig);
  registerListTool(server, pathConfig);
  registerShowTool(server, pathConfig);
  registerValidateTool(server, pathConfig);
  registerArchiveTool(server, pathConfig);
  registerProjectContextTool(server, pathConfig);
  registerEditTool(server, pathConfig);
}
