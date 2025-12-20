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
import { registerInstructionsResource } from './instructions.js';
import { registerProjectResource } from './project.js';
import { registerSpecsResources } from './specs.js';
import { registerChangesResources } from './changes.js';
import { registerArchiveResource } from './archive.js';

/**
 * Register all OpenSpec resources with the MCP server.
 */
export function registerAllResources(
  server: McpServer,
  pathConfig: PathConfig
): void {
  registerInstructionsResource(server, pathConfig);
  registerProjectResource(server, pathConfig);
  registerSpecsResources(server, pathConfig);
  registerChangesResources(server, pathConfig);
  registerArchiveResource(server, pathConfig);
}
