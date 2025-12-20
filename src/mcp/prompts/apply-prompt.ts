/**
 * MCP prompt: openspec-apply
 *
 * Guided workflow for implementing an approved OpenSpec change.
 * Equivalent to /openspec:apply slash command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { getMcpApplyContent } from './mcp-prompt-templates.js';

const InputSchema = z.object({
  changeId: z.string().describe('The change identifier to implement'),
});

/**
 * Register the openspec-apply prompt with the MCP server.
 */
export function registerApplyPrompt(
  server: McpServer,
  _pathConfig: PathConfig
): void {
  server.registerPrompt(
    'openspec-apply',
    {
      title: 'openspec-apply',
      description:
        'Guided workflow for implementing an approved OpenSpec change. Equivalent to /openspec:apply slash command.',
      argsSchema: InputSchema.shape,
    },
    (args) => {
      const parsed = InputSchema.parse(args);
      const content = getMcpApplyContent(parsed.changeId);

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
