/**
 * MCP prompt: openspec-archive
 *
 * Guided workflow for archiving a completed change.
 * Equivalent to /openspec:archive slash command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { getMcpArchiveContent } from './mcp-prompt-templates.js';

const InputSchema = z.object({
  changeId: z.string().optional().describe('The change identifier to archive'),
});

/**
 * Register the openspec-archive prompt with the MCP server.
 */
export function registerArchivePrompt(
  server: McpServer,
  _pathConfig: PathConfig
): void {
  server.registerPrompt(
    'openspec-archive',
    {
      title: 'openspec-archive',
      description:
        'Guided workflow for archiving a completed change. Equivalent to /openspec:archive slash command.',
      argsSchema: InputSchema.shape,
    },
    (args) => {
      const parsed = InputSchema.parse(args);
      const content = getMcpArchiveContent(parsed.changeId);

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
