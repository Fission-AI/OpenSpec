/**
 * MCP tool: validate
 *
 * Validate changes and specs.
 * Maps to `openspec validate` CLI command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { ValidateCommand } from '../../commands/validate.js';

const InputSchema = z.object({
  itemName: z.string().optional().describe('Name of the change or spec to validate. If not provided, validates all items based on flags'),
  type: z.enum(['change', 'spec']).optional().describe('Type of item (change or spec). Auto-detected if not provided'),
  all: z.boolean().optional().describe('Validate all changes and specs'),
  changes: z.boolean().optional().describe('Validate all changes'),
  specs: z.boolean().optional().describe('Validate all specs'),
  strict: z.boolean().default(false).describe('Enable strict validation mode'),
});

export function registerValidateTool(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerTool(
    'validate',
    {
      description: 'Validate changes and specifications. Returns JSON validation report with issues and status. Use this MCP tool instead of running `openspec validate` CLI command.',
      inputSchema: InputSchema,
    },
    async (input) => {
      const parsed = InputSchema.parse(input);

      try {
        // Capture JSON output
        const originalLog = console.log;
        const originalError = console.error;
        let jsonOutput = '';
        let errorOutput = '';

        console.log = (...args: any[]) => {
          jsonOutput += args.map(String).join(' ') + '\n';
          originalLog(...args);
        };
        console.error = (...args: any[]) => {
          errorOutput += args.map(String).join(' ') + '\n';
          originalError(...args);
        };

        const validateCommand = new ValidateCommand();
        await validateCommand.execute(parsed.itemName, {
          type: parsed.type,
          all: parsed.all,
          changes: parsed.changes,
          specs: parsed.specs,
          strict: parsed.strict,
          json: true,
          noInteractive: true,
          targetPath: pathConfig.specsRoot,
        });

        console.log = originalLog;
        console.error = originalError;

        // Parse the JSON output
        let result;
        try {
          result = JSON.parse(jsonOutput.trim() || errorOutput.trim());
        } catch {
          result = {
            output: jsonOutput.trim() || errorOutput.trim(),
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                result,
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
