/**
 * Instructions resource registration.
 *
 * Exposes openspec://instructions resource that returns AGENTS.md content.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { loadAgentsMarkdown } from '../utils/context-loader.js';

/**
 * Register the instructions resource (openspec://instructions).
 *
 * Returns AGENTS.md content with fallback to default template if file doesn't exist.
 */
export function registerInstructionsResource(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerResource(
    'instructions',
    'openspec://instructions',
    {
      title: 'OpenSpec Instructions',
      description:
        'OpenSpec workflow instructions from AGENTS.md. AI assistants should read this first to understand how to use OpenSpec tools and prompts.',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const content = await loadAgentsMarkdown(pathConfig);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: content,
          },
        ],
      };
    }
  );
}
