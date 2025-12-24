/**
 * Project resource registration.
 *
 * Exposes openspec://project resource that returns project.md content.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { PathConfig } from '../utils/path-resolver.js';
import { loadProjectMarkdown } from '../utils/context-loader.js';

/**
 * Register the project resource (openspec://project).
 *
 * Returns project.md content with fallback to default template if file doesn't exist.
 */
export function registerProjectResource(
  server: McpServer,
  pathConfig: PathConfig
): void {
  server.registerResource(
    'project',
    'openspec://project',
    {
      title: 'Project Context',
      description:
        'Project context including tech stack, conventions, and architectural patterns. Use update_project_context tool to modify.',
      mimeType: 'text/markdown',
    },
    async (uri) => {
      const content = await loadProjectMarkdown(pathConfig);
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
