/**
 * MCP Resources registration.
 *
 * Resources provide read-only access to OpenSpec data:
 * - openspec://instructions (AGENTS.md)
 * - openspec://project (project.md)
 * - openspec://specs, openspec://specs/{capability}
 * - openspec://changes, openspec://changes/{changeId}
 * - openspec://archive
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';

/**
 * Register all OpenSpec resources with the MCP server.
 */
export function registerAllResources(
  _server: McpServer,
  _pathConfig: PathConfig
): void {
  // TODO (Task 3): Implement resource registrations
  // registerInstructionsResource(server, pathConfig);
  // registerProjectResource(server, pathConfig);
  // registerSpecsResources(server, pathConfig);
  // registerChangesResources(server, pathConfig);
  // registerArchiveResource(server, pathConfig);
}
