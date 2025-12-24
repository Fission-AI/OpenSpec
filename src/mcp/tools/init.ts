/**
 * MCP tool: init
 *
 * Initialize OpenSpec in a project directory.
 * Maps to `openspec init` CLI command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { InitCommand } from '../../core/init.js';

const InputSchema = z.object({});

export function registerInitTool(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerTool(
    'init',
    {
      description: 'Initialize OpenSpec in a project directory. Creates openspec/ directory structure. Note: AI tool integrations are not configured via this MCP tool. Use this MCP tool instead of running `openspec init` CLI command.',
      inputSchema: InputSchema,
    },
    async (input) => {
      InputSchema.parse(input);
      const initCommand = new InitCommand({ tools: 'none' });

      try {
        await initCommand.execute(pathConfig.specsRoot);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                message: 'OpenSpec initialized successfully',
                path: pathConfig.specsRoot,
                suggestedNextActions: [
                  'Read the `openspec://project` resource',
                  'Help fill out the project context resource with details about project, tech stack, and conventions',
                  'Run the `openspec` `update_project_context` tool to apply project context updates',
                ],
              }),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
              }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
