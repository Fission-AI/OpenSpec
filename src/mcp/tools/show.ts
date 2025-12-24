/**
 * MCP tool: show
 *
 * Show a change or spec.
 * Maps to `openspec show` CLI command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { ChangeCommand } from '../../commands/change.js';
import { SpecCommand } from '../../commands/spec.js';

const InputSchema = z.object({
  itemName: z.string().describe('Name of the change or spec to show'),
  type: z.enum(['change', 'spec']).optional().describe('Type of item (change or spec). Auto-detected if not provided'),
  json: z.boolean().default(true).describe('Return JSON output (default: true)'),
});

export function registerShowTool(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerTool(
    'show',
    {
      description: 'Show details of a change or specification. Returns JSON with item content and metadata. Use this MCP tool instead of running `openspec show` CLI command.',
      inputSchema: InputSchema,
    },
    async (input) => {
      const parsed = InputSchema.parse(input);

      try {
        // Capture JSON output
        const originalLog = console.log;
        let jsonOutput = '';

        // Determine type and show item
        let itemType = parsed.type;
        if (!itemType) {
          // Auto-detect type by trying both
          const changeCmd = new ChangeCommand();
          const specCmd = new SpecCommand();
          
          // Try change first
          try {
            console.log = (...args: any[]) => {
              jsonOutput += args.map(String).join(' ') + '\n';
              // Don't call originalLog - would corrupt MCP stdio stream
            };
            await changeCmd.show(parsed.itemName, { json: true, targetPath: pathConfig.specsRoot, noInteractive: true });
            itemType = 'change';
          } catch {
            // Not a change, try spec
            jsonOutput = ''; // Reset for spec attempt
            try {
              await specCmd.show(parsed.itemName, { json: true, targetPath: pathConfig.specsRoot });
              itemType = 'spec';
            } catch {
              console.log = originalLog;
              throw new Error(`Item '${parsed.itemName}' not found as change or spec`);
            }
          }
          console.log = originalLog;
        } else {
          // Type specified, use appropriate command
          console.log = (...args: any[]) => {
            jsonOutput += args.map(String).join(' ') + '\n';
            // Don't call originalLog - would corrupt MCP stdio stream
          };
          try {
            if (itemType === 'change') {
              const changeCmd = new ChangeCommand();
              await changeCmd.show(parsed.itemName, { json: parsed.json, targetPath: pathConfig.specsRoot, noInteractive: true });
            } else {
              const specCmd = new SpecCommand();
              await specCmd.show(parsed.itemName, { json: parsed.json, targetPath: pathConfig.specsRoot });
            }
          } finally {
            console.log = originalLog;
          }
        }

        // Parse the JSON output
        let result;
        try {
          result = JSON.parse(jsonOutput.trim());
        } catch {
          result = { raw: jsonOutput.trim() };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                itemName: parsed.itemName,
                type: itemType,
                data: result,
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
