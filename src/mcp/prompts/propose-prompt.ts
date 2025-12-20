/**
 * MCP prompt: openspec-propose
 *
 * Guided workflow for creating a new OpenSpec change proposal.
 * Equivalent to /openspec:proposal slash command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { getMcpProposeContent } from './mcp-prompt-templates.js';

const InputSchema = z.object({
  description: z.string().optional().describe('What you want to build or change'),
});

/**
 * Register the openspec-propose prompt with the MCP server.
 */
export function registerProposePrompt(
  server: McpServer,
  _pathConfig: PathConfig
): void {
  server.registerPrompt(
    'openspec-propose',
    {
      title: 'openspec-propose',
      description:
        'Guided workflow for creating a new OpenSpec change proposal. Equivalent to /openspec:proposal slash command.',
      argsSchema: InputSchema.shape,
    },
    (args) => {
      const parsed = InputSchema.parse(args);
      const content = getMcpProposeContent(parsed.description);

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: content,
            },
          },
        ],
      };
    }
  );
}
