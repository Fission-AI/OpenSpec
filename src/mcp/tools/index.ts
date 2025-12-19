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
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';

/**
 * Register all OpenSpec tools with the MCP server.
 */
export function registerAllTools(
  _server: McpServer,
  _pathConfig: PathConfig
): void {
  // TODO (Task 4): Implement tool registrations
  // registerInitTool(server, pathConfig);
  // registerListTool(server, pathConfig);
  // registerShowTool(server, pathConfig);
  // registerValidateTool(server, pathConfig);
  // registerArchiveTool(server, pathConfig);
  // registerProjectTool(server, pathConfig);
}
