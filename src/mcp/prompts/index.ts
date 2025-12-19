/**
 * MCP Prompts registration.
 *
 * Prompts provide guided workflows for AI assistants:
 * - openspec-propose: Create change proposal workflow
 * - openspec-apply: Implement change workflow
 * - openspec-archive: Archive completed change workflow
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';

/**
 * Register all OpenSpec prompts with the MCP server.
 */
export function registerAllPrompts(
  _server: McpServer,
  _pathConfig: PathConfig
): void {
  // TODO (Task 5): Implement prompt registrations
  // registerProposePrompt(server, pathConfig);
  // registerApplyPrompt(server, pathConfig);
  // registerArchivePrompt(server, pathConfig);
}
