import { Command } from 'commander';
import { startMcpServer } from '../mcp/index.js';

export function createMcpCommand(): Command {
  return new Command('mcp')
    .description('Start stdio-based MCP server for AI agent integration')
    .option('--debug', 'Enable debug logging to stderr')
    .action(async (options) => {
      await startMcpServer({
        debug: options.debug ?? false,
      });
    });
}
