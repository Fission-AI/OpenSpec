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
import { registerProposePrompt } from './propose-prompt.js';
import { registerApplyPrompt } from './apply-prompt.js';
import { registerArchivePrompt } from './archive-prompt.js';

/**
 * Register all OpenSpec prompts with the MCP server.
 */
export function registerAllPrompts(
  server: McpServer,
  pathConfig: PathConfig
): void {
  registerProposePrompt(server, pathConfig);
  registerApplyPrompt(server, pathConfig);
  registerArchivePrompt(server, pathConfig);
}
