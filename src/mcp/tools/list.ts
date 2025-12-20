/**
 * MCP tool: list
 *
 * List changes or specs.
 * Maps to `openspec list` CLI command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { ListCommand } from '../../core/list.js';

const InputSchema = z.object({
  mode: z.enum(['changes', 'specs']).default('changes').describe('List changes (default) or specs'),
});

export function registerListTool(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerTool(
    'list',
    {
      description: 'List active changes or specifications. Returns JSON array of items with their status. Use this MCP tool instead of running `openspec list` CLI command.',
      inputSchema: InputSchema.shape,
    },
    async (input) => {
      const parsed = InputSchema.parse(input);
      const listCommand = new ListCommand();

      try {
        // Capture output by redirecting console.log
        const originalLog = console.log;
        let output = '';
        console.log = (...args: any[]) => {
          output += args.map(String).join(' ') + '\n';
          originalLog(...args);
        };

        await listCommand.execute(pathConfig.specsRoot, parsed.mode);

        console.log = originalLog;

        // Parse the output to extract structured data
        // For now, return the raw output as JSON
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                mode: parsed.mode,
                output: output.trim(),
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
