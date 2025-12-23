/**
 * MCP tool: archive
 *
 * Archive a completed change.
 * Maps to `openspec archive` CLI command.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { ArchiveCommand } from '../../core/archive.js';

const InputSchema = z.object({
  changeName: z.string().describe('Name of the change to archive'),
  skipSpecs: z.boolean().default(false).describe('Skip updating specs during archive'),
  noValidate: z.boolean().default(false).describe('Skip validation before archiving'),
});

export function registerArchiveTool(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerTool(
    'archive',
    {
      description: 'Archive a completed change. Moves the change to archive directory and optionally updates specs. Use this MCP tool instead of running `openspec archive` CLI command.',
      inputSchema: InputSchema,
    },
    async (input) => {
      const parsed = InputSchema.parse(input);
      const archiveCommand = new ArchiveCommand();

      try {
        // Capture output
        const originalLog = console.log;
        const originalError = console.error;
        let output = '';

        console.log = (...args: any[]) => {
          output += args.map(String).join(' ') + '\n';
          originalLog(...args);
        };
        console.error = (...args: any[]) => {
          output += args.map(String).join(' ') + '\n';
          originalError(...args);
        };

        try {
          await archiveCommand.execute(parsed.changeName, {
            yes: true,
            skipSpecs: parsed.skipSpecs,
            noValidate: parsed.noValidate,
            targetPath: pathConfig.specsRoot,
          });
        } finally {
          console.log = originalLog;
          console.error = originalError;
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: true,
                changeName: parsed.changeName,
                message: `Change '${parsed.changeName}' archived successfully`,
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
